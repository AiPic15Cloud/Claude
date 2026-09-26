import { promises as dns } from 'dns';
import { isIPv4, isIPv6 } from 'net';
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit, type Response as UndiciResponse } from 'undici';

/**
 * Blocks server-side requests to internal/private/link-local network ranges
 * (including the cloud metadata endpoint 169.254.169.254) — required
 * whenever a URL supplied by a user is fetched by the server itself
 * (SSRF). Checks both the literal host and every IP it resolves to, so a
 * DNS record pointing at an internal address is caught too.
 */
export class SsrfBlockedUrlError extends Error {}

const BLOCKED_IPV4_RANGES: [base: string, prefix: number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

function isBlockedIp(ip: string): boolean {
  return isIPv4(ip) ? isBlockedIpv4(ip) : isBlockedIpv6(ip);
}

interface ValidatedUrl {
  url: URL;
  /** Adresses validées lors de CETTE résolution — à réutiliser telles quelles pour la connexion réelle, jamais une nouvelle résolution DNS indépendante (voir fetchPublicHttpUrl). */
  addresses: { address: string; family: 4 | 6 }[];
}

/**
 * Throws SsrfBlockedUrlError if `rawUrl` is not a plain http(s) URL pointing
 * at a public host. Call this immediately before any server-side fetch of a
 * user-supplied URL.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedUrlError(`URL invalide : "${rawUrl}"`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedUrlError(`Schéma non autorisé : "${url.protocol}"`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedUrlError('Les identifiants dans l\'URL ne sont pas autorisés');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new SsrfBlockedUrlError(`Hôte non autorisé : "${hostname}"`);
  }
  if (isIPv4(hostname) && isBlockedIpv4(hostname)) {
    throw new SsrfBlockedUrlError(`Adresse IP non autorisée : "${hostname}"`);
  }

  // Hôte déjà une IP littérale : pas de résolution DNS à faire, l'adresse
  // de connexion EST le hostname — on la pin directement, même logique
  // "une seule résolution, jamais deux" que le cas nom de domaine ci-dessous.
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return { url, addresses: [{ address: hostname, family: isIPv4(hostname) ? 4 : 6 }] };
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SsrfBlockedUrlError(`Résolution DNS impossible pour "${hostname}"`);
  }
  if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    throw new SsrfBlockedUrlError(`Hôte résolu vers une plage d'adresses non autorisée : "${hostname}"`);
  }

  return { url, addresses: addresses.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 })) };
}

const MAX_REDIRECTS = 5;

/**
 * fetch() with an SSRF check re-applied on every hop, and the *actual* TCP
 * connection pinned to the exact address validated for that hop.
 *
 * A plain `fetch(await assertPublicHttpUrl(url))` only validates the
 * *initial* request — `fetch`'s default `redirect: "follow"` would then
 * transparently follow a 3xx response to an unvalidated Location (e.g. a
 * public feed URL that 302s to http://169.254.169.254/...), defeating the
 * check entirely. Re-validating the Location before each hop closes that
 * gap, which this function already did.
 *
 * The remaining gap this closes: `assertPublicHttpUrl` resolves the
 * hostname once to validate it, but a plain `fetch(url)` afterwards
 * performs its *own*, independent DNS resolution when it actually
 * connects. A short-TTL DNS record that answers with a public IP at
 * validation time and a private one moments later at connect time (DNS
 * rebinding) sails straight through — the validated address and the
 * connected address are never guaranteed to be the same one. Passing a
 * `dispatcher` whose `connect.lookup` always returns the addresses we just
 * validated — instead of letting undici perform its own OS-level lookup —
 * guarantees the socket only ever connects to an address this function
 * actually checked, for this call, not to whatever a subsequent lookup
 * happens to answer.
 */
export async function fetchPublicHttpUrl(rawUrl: string, init: UndiciRequestInit = {}): Promise<UndiciResponse> {
  let { url: currentUrl, addresses } = await assertPublicHttpUrl(rawUrl);

  for (let redirects = 0; ; redirects++) {
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, _opts, callback) => {
          callback(null, addresses.map((a) => ({ address: a.address, family: a.family })));
        },
      },
    });

    let response: UndiciResponse;
    try {
      response = await undiciFetch(currentUrl, { ...init, redirect: 'manual', dispatcher });
    } finally {
      await dispatcher.close();
    }

    if (response.status < 300 || response.status >= 400 || !response.headers.has('location')) {
      return response;
    }
    if (redirects >= MAX_REDIRECTS) {
      throw new SsrfBlockedUrlError(`Trop de redirections depuis "${rawUrl}"`);
    }
    const location = response.headers.get('location')!;
    ({ url: currentUrl, addresses } = await assertPublicHttpUrl(new URL(location, currentUrl).toString()));
  }
}
