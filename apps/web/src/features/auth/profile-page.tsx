import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateProfile, useChangePassword } from './use-auth';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onProfileSubmit = (values: ProfileValues) => {
    updateProfile.mutate(values);
  };

  const onPasswordSubmit = (values: PasswordValues) => {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => resetPassword() },
    );
  };

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-muted-foreground">Gérer vos informations personnelles et votre mot de passe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" {...registerProfile('firstName')} />
                {profileErrors.firstName && <p className="text-xs text-destructive">{profileErrors.firstName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" {...registerProfile('lastName')} />
                {profileErrors.lastName && <p className="text-xs text-destructive">{profileErrors.lastName.message}</p>}
              </div>
            </div>
            {updateProfile.isError && (
              <p className="text-xs text-destructive">
                {updateProfile.error instanceof ApiError ? updateProfile.error.message : 'Une erreur est survenue'}
              </p>
            )}
            {updateProfile.isSuccess && <p className="text-xs text-success">Profil mis à jour.</p>}
            <div>
              <Button type="submit" size="sm" disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>Choisissez un mot de passe d'au moins 8 caractères.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirmer</Label>
                <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            {changePassword.isError && (
              <p className="text-xs text-destructive">
                {changePassword.error instanceof ApiError ? changePassword.error.message : 'Une erreur est survenue'}
              </p>
            )}
            {changePassword.isSuccess && <p className="text-xs text-success">Mot de passe modifié.</p>}
            <div>
              <Button type="submit" size="sm" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Modifier le mot de passe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
