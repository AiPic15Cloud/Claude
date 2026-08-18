import { useEffect, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isPushSupported, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/push';

export function PushNotificationsCard() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      setChecking(false);
      return;
    }
    getCurrentSubscription()
      .then((sub) => setSubscribed(sub !== null))
      .finally(() => setChecking(false));
  }, []);

  const handleToggle = async () => {
    setPending(true);
    setError(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4" /> Notifications push
        </CardTitle>
        <CardDescription>
          Recevez une notification sur cet appareil dès qu'une alerte critique tombe (défaut, échéance de vote urgente), même
          l'application fermée.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!supported ? (
          <p className="text-xs text-muted-foreground">
            Non disponible sur ce navigateur. Sur iPhone/iPad : ajoutez d'abord Atlas à l'écran d'accueil (Partager → Sur l'écran
            d'accueil), puis ouvrez-le depuis cette icône avant d'activer les notifications ici.
          </p>
        ) : (
          <>
            <div>
              <Button size="sm" variant={subscribed ? 'outline' : 'default'} onClick={handleToggle} disabled={checking || pending}>
                {(checking || pending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {subscribed ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground">
              Sur iPhone/iPad, ça ne fonctionne que si Atlas est ouvert depuis l'icône ajoutée à l'écran d'accueil (pas depuis
              Safari).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
