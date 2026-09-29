import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { useAuthStore } from '@/store/auth.store';
import { useTeamMembers, useUpdateTeamMemberAccess } from './hooks/use-team';
import { InviteTeamMemberDialog } from './components/invite-team-member-dialog';
import { ROLE_LABELS, WORKSPACE_SCOPE_LABELS, type Role, type WorkspaceScope } from '@/types';

const ROLES: Role[] = ['ADMIN', 'ANALYST', 'VIEWER'];
const SCOPES: WorkspaceScope[] = ['FULL', 'FRACTIONAL_ONLY'];

/**
 * Équipe — réservée aux ADMIN (le serveur l'impose de toute façon via
 * RolesGuard ; ce garde-fou côté client évite juste d'afficher un écran qui
 * échouerait à chaque appel). Un ADMIN ne peut pas changer son propre accès
 * ici — la ligne correspondante affiche son rôle/périmètre en lecture seule
 * plutôt qu'un Select désactivé silencieux (voir le service backend pour la
 * raison : éviter un auto-verrouillage accidentel de la gestion d'équipe).
 */
export function TeamPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [], isLoading } = useTeamMembers();
  const updateAccess = useUpdateTeamMemberAccess();

  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Équipe" />
        <p className="text-sm text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Équipe"
        description="Créer des profils pour vos collègues et choisir ce à quoi chacun a accès."
        actions={<InviteTeamMemberDialog />}
      />

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profil</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Accès</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                          {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(role: Role) => updateAccess.mutate({ userId: member.id, role, workspaceScope: member.workspaceScope })}
                          >
                            <SelectTrigger className="w-44">
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
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge variant="outline">{WORKSPACE_SCOPE_LABELS[member.workspaceScope]}</Badge>
                        ) : (
                          <Select
                            value={member.workspaceScope}
                            onValueChange={(workspaceScope: WorkspaceScope) => updateAccess.mutate({ userId: member.id, role: member.role, workspaceScope })}
                          >
                            <SelectTrigger className="w-56">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
