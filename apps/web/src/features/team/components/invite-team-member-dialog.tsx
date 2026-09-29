import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTeamMember } from '../hooks/use-team';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS, WORKSPACE_SCOPE_LABELS, type Role, type WorkspaceScope } from '@/types';

const schema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']),
  workspaceScope: z.enum(['FULL', 'FRACTIONAL_ONLY']),
});
type FormValues = z.infer<typeof schema>;

const ROLES: Role[] = ['ADMIN', 'ANALYST', 'VIEWER'];
const SCOPES: WorkspaceScope[] = ['FULL', 'FRACTIONAL_ONLY'];

/**
 * Aucune infrastructure d'email n'existe dans ATLAS (pas de mot de passe
 * oublié non plus) — l'admin choisit donc directement le mot de passe
 * initial du profil et le communique lui-même ; le nouveau collègue le
 * change ensuite depuis son propre "Profil" (`/users/me/password`), déjà
 * en place.
 */
export function InviteTeamMemberDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateTeamMember();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ANALYST', workspaceScope: 'FULL' },
  });

  const onSubmit = (values: FormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset({ role: 'ANALYST', workspaceScope: 'FULL', firstName: '', lastName: '', email: '', password: '' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          Nouveau profil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau profil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="off" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe initial</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            <p className="text-xs text-muted-foreground">À communiquer vous-même — la personne pourra le changer depuis son profil.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Accès</Label>
              <Controller
                control={control}
                name="workspaceScope"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOPES.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {WORKSPACE_SCOPE_LABELS[scope]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {create.isError && (
            <p className="text-xs text-destructive">{create.error instanceof ApiError ? create.error.message : 'Une erreur est survenue'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le profil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
