import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSetupTwoFactor, useEnableTwoFactor, useDisableTwoFactor } from './use-auth';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/lib/api';

const codeSchema = z.object({ code: z.string().length(6, 'Code à 6 chiffres') });
type CodeValues = z.infer<typeof codeSchema>;

const passwordSchema = z.object({ password: z.string().min(1, 'Mot de passe requis') });
type PasswordValues = z.infer<typeof passwordSchema>;

export function TwoFactorCard() {
  const user = useAuthStore((s) => s.user);
  const enabled = user?.twoFactorEnabled ?? false;

  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const setup = useSetupTwoFactor();
  const enable = useEnableTwoFactor();
  const disable = useDisableTwoFactor();

  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    reset: resetCode,
    formState: { errors: codeErrors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const openSetup = () => {
    setSetupOpen(true);
    setup.mutate();
  };

  const closeSetup = () => {
    setSetupOpen(false);
    setRecoveryCodes(null);
    resetCode();
  };

  const onCodeSubmit = (values: CodeValues) => {
    enable.mutate(values.code, {
      onSuccess: (data) => setRecoveryCodes(data.recoveryCodes),
    });
  };

  const onPasswordSubmit = (values: PasswordValues) => {
    disable.mutate(values.password, {
      onSuccess: () => {
        setDisableOpen(false);
        resetPassword();
      },
    });
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Double authentification</CardTitle>
        <CardDescription>
          {enabled
            ? 'Activée — un code est demandé à chaque connexion en plus de votre mot de passe.'
            : "Ajoutez une étape de vérification (application d'authentification) à la connexion."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-success">
              <ShieldCheck className="h-4 w-4" />
              Activée
            </div>
            <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="h-4 w-4" />
              Désactiver
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={openSetup}>
            <ShieldCheck className="h-4 w-4" />
            Activer la double authentification
          </Button>
        )}
      </CardContent>

      {/* Setup dialog: QR code + confirm code, then recovery codes */}
      <Dialog open={setupOpen} onOpenChange={(open) => (open ? setSetupOpen(true) : closeSetup())}>
        <DialogContent>
          {recoveryCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Conservez vos codes de secours</DialogTitle>
                <DialogDescription>
                  Chaque code ne peut être utilisé qu'une fois, en cas de perte d'accès à votre application
                  d'authentification. Notez-les dans un endroit sûr — ils ne seront plus affichés.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-secondary/40 p-3 font-mono text-sm">
                {recoveryCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={copyRecoveryCodes}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié' : 'Copier'}
                </Button>
                <Button type="button" size="sm" onClick={closeSetup}>
                  J'ai noté mes codes
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Activer la double authentification</DialogTitle>
                <DialogDescription>
                  Scannez ce QR code avec Google Authenticator, 1Password ou une autre application compatible, puis
                  entrez le code généré.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {setup.isPending && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                {setup.data && (
                  <>
                    <img
                      src={setup.data.qrCodeDataUrl}
                      alt="QR code de double authentification"
                      className="h-44 w-44 rounded-md border border-border"
                    />
                    <p className="break-all text-center text-[11px] text-muted-foreground">
                      Ou entrez manuellement : <span className="font-mono">{setup.data.secret}</span>
                    </p>
                  </>
                )}
              </div>
              <form onSubmit={handleCodeSubmit(onCodeSubmit)} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-code">Code de vérification</Label>
                  <Input id="setup-code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" {...registerCode('code')} />
                  {codeErrors.code && <p className="text-xs text-destructive">{codeErrors.code.message}</p>}
                </div>
                {enable.isError && (
                  <p className="text-xs text-destructive">
                    {enable.error instanceof ApiError ? enable.error.message : 'Une erreur est survenue'}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit" size="sm" disabled={enable.isPending || !setup.data}>
                    {enable.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmer
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable confirmation */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver la double authentification</DialogTitle>
            <DialogDescription>Confirmez avec votre mot de passe.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disable-password">Mot de passe</Label>
              <Input id="disable-password" type="password" {...registerPassword('password')} />
              {passwordErrors.password && <p className="text-xs text-destructive">{passwordErrors.password.message}</p>}
            </div>
            {disable.isError && (
              <p className="text-xs text-destructive">
                {disable.error instanceof ApiError ? disable.error.message : 'Une erreur est survenue'}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" variant="destructive" size="sm" disabled={disable.isPending}>
                {disable.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Désactiver
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
