import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Building2, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useLogin, useVerifyTwoFactor } from './use-auth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormValues = z.infer<typeof schema>;

const codeSchema = z.object({
  code: z.string().min(6, 'Code à 6 chiffres (ou code de secours)'),
});
type CodeValues = z.infer<typeof codeSchema>;

export function LoginPage() {
  const login = useLogin();
  const verifyTwoFactor = useVerifyTwoFactor();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });

  const onSubmit = (values: FormValues) =>
    login.mutate(values, {
      onSuccess: (data) => {
        if ('requiresTwoFactor' in data) setChallengeToken(data.challengeToken);
      },
    });

  const onCodeSubmit = (values: CodeValues) => {
    if (!challengeToken) return;
    verifyTwoFactor.mutate({ challengeToken, code: values.code });
  };

  if (challengeToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Double authentification</h1>
            <p className="text-center text-xs text-muted-foreground">
              Entrez le code à 6 chiffres généré par votre application d'authentification.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleCodeSubmit(onCodeSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456"
                    {...registerCode('code')}
                  />
                  {codeErrors.code && <p className="text-xs text-destructive">{codeErrors.code.message}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    Sans accès à l'application, utilisez l'un de vos codes de secours.
                  </p>
                </div>

                {verifyTwoFactor.isError && (
                  <p className="text-xs text-destructive">
                    {verifyTwoFactor.error instanceof ApiError ? verifyTwoFactor.error.message : 'Une erreur est survenue'}
                  </p>
                )}

                <Button type="submit" className="mt-1" disabled={verifyTwoFactor.isPending}>
                  {verifyTwoFactor.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Vérifier
                </Button>
                <button
                  type="button"
                  onClick={() => setChallengeToken(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Retour à la connexion
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Atlas Capital</h1>
          <p className="text-xs text-muted-foreground">Real Estate Intelligence Operating System</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            Application privée — accès réservé aux utilisateurs autorisés
          </div>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Connexion</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="nom@societe.fr" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {login.isError && (
                <p className="text-xs text-destructive">
                  {login.error instanceof ApiError ? login.error.message : "Une erreur est survenue"}
                </p>
              )}

              <Button type="submit" className="mt-1" disabled={login.isPending}>
                {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Créer une organisation
          </Link>
        </p>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          Les données contenues dans cette application sont strictement confidentielles et destinées à un usage
          interne uniquement.
        </p>
      </div>
    </div>
  );
}
