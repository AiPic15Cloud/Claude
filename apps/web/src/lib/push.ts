import { api } from './api';

// Web Push's applicationServerKey wants a raw Uint8Array, not the
// base64url string the VAPID public key is normally handed around as.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// iOS silently drops a PWA's push subscription after the app hasn't been
// opened in a while (or across some service worker updates) — the OS-level
// notification permission stays "granted", only the subscription object
// itself is gone. This flag records that the user wants push on, so we can
// re-subscribe automatically on the next app open instead of making them
// rediscover the toggle in Réglages every time. See ensurePushSubscription().
const PUSH_PREFERENCE_KEY = 'atlas.push.enabled';

function setPushPreference(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(PUSH_PREFERENCE_KEY, '1');
    else localStorage.removeItem(PUSH_PREFERENCE_KEY);
  } catch {
    // Private browsing / storage disabled — preference just won't persist across sessions.
  }
}

function getPushPreference(): boolean {
  try {
    return localStorage.getItem(PUSH_PREFERENCE_KEY) === '1';
  } catch {
    return false;
  }
}

async function registerSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    userAgent: navigator.userAgent,
  });
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<void> {
  const { publicKey } = await api.get<{ publicKey: string | null }>('/push/vapid-public-key');
  if (!publicKey) throw new Error('Notifications push non configurées côté serveur.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission refusée.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  await registerSubscription(subscription);
  setPushPreference(true);
}

export async function unsubscribeFromPush(): Promise<void> {
  setPushPreference(false);
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.delete('/push/subscribe', { body: { endpoint } });
}

/**
 * Self-heal for the iOS subscription-drop above: called once on every app
 * boot. If the user previously opted in and the OS permission is still
 * granted, silently re-subscribes without re-prompting (a background call to
 * Notification.requestPermission() wouldn't show a prompt without a user
 * gesture anyway, and would just no-op). Errors are swallowed — this is a
 * best-effort background repair, not a user-initiated action; a real
 * failure still surfaces normally next time they open the settings toggle.
 */
export async function ensurePushSubscription(): Promise<void> {
  if (!getPushPreference() || !isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const existing = await getCurrentSubscription();
    if (existing) return;

    const { publicKey } = await api.get<{ publicKey: string | null }>('/push/vapid-public-key');
    if (!publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    await registerSubscription(subscription);
  } catch {
    // Best-effort — leave the preference flag set so the next app open tries again.
  }
}
