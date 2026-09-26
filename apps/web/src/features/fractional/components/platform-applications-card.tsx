import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import {
  usePlatformProfiles,
  useFractionalPlatformApplications,
  useCreatePlatformApplication,
  useUpdatePlatformApplication,
} from '../hooks/use-fractional';
import { FRACTIONAL_PLATFORM_APPLICATION_STATUS_LABELS, type FractionalPlatformApplicationStatus } from '@/types';

const STATUSES: FractionalPlatformApplicationStatus[] = ['PROSPECT', 'CONTACTE', 'CRITERES_PARTAGES', 'OFFRE_RECUE', 'ACCEPTEE', 'REFUSEE', 'ABANDONNEE'];
const STATUS_VARIANT: Record<FractionalPlatformApplicationStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
  PROSPECT: 'outline',
  CONTACTE: 'outline',
  CRITERES_PARTAGES: 'warning',
  OFFRE_RECUE: 'warning',
  ACCEPTEE: 'success',
  REFUSEE: 'destructive',
  ABANDONNEE: 'outline',
};

/**
 * Candidatures plateformes multiples (spec Cockpit/Fractionné P1 §5.3) — un
 * même dossier peut être présenté à plusieurs plateformes, chacune avec son
 * propre statut/échanges/offre, sans jamais dupliquer l'actif ni les baux.
 */
export function PlatformApplicationsCard({ projectId }: { projectId: string }) {
  const { data: profiles } = usePlatformProfiles();
  const { data: applications } = useFractionalPlatformApplications(projectId);
  const createApplication = useCreatePlatformApplication(projectId);
  const updateApplication = useUpdatePlatformApplication(projectId);

  const [newPlatformId, setNewPlatformId] = useState('');
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!newPlatformId) return;
    createApplication.mutate({ platformProfileId: newPlatformId }, { onSuccess: () => setNewPlatformId('') });
  };

  const handleStatusChange = (id: string, status: FractionalPlatformApplicationStatus) => {
    if (status === 'REFUSEE') return; // attend un motif avant d'envoyer (cf. bouton dédié ci-dessous)
    updateApplication.mutate({ id, status });
  };

  const handleReject = (id: string) => {
    const rejectionReason = rejectionDrafts[id]?.trim();
    if (!rejectionReason) return;
    updateApplication.mutate({ id, status: 'REFUSEE', rejectionReason }, { onSuccess: () => setRejectionDrafts((d) => ({ ...d, [id]: '' })) });
  };

  const usedPlatformIds = new Set((applications ?? []).map((a) => a.platformProfileId));
  const availableProfiles = (profiles ?? []).filter((p) => !usedPlatformIds.has(p.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Plateformes candidates</CardTitle>
        <p className="text-xs text-muted-foreground">Un dossier peut être présenté à plusieurs plateformes en parallèle, sans dupliquer l'actif.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {applications && applications.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plateforme</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Premier échange</TableHead>
                <TableHead>Prochaine relance</TableHead>
                <TableHead>Motif de refus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.platformProfile.platformName}</TableCell>
                  <TableCell>
                    {a.status === 'REFUSEE' ? (
                      <Badge variant={STATUS_VARIANT[a.status]}>{FRACTIONAL_PLATFORM_APPLICATION_STATUS_LABELS[a.status]}</Badge>
                    ) : (
                      <Select value={a.status} onValueChange={(v) => handleStatusChange(a.id, v as FractionalPlatformApplicationStatus)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s !== 'REFUSEE').map((s) => (
                            <SelectItem key={s} value={s}>
                              {FRACTIONAL_PLATFORM_APPLICATION_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.firstContactDate ? formatDate(a.firstContactDate) : '—'}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="w-40"
                      value={a.nextFollowUpDate ? a.nextFollowUpDate.slice(0, 10) : ''}
                      onChange={(e) => updateApplication.mutate({ id: a.id, nextFollowUpDate: e.target.value || undefined })}
                    />
                  </TableCell>
                  <TableCell className="min-w-64">
                    {a.status === 'REFUSEE' ? (
                      <span className="text-sm">{a.rejectionReason}</span>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Motif si refusée par cette plateforme…"
                          value={rejectionDrafts[a.id] ?? ''}
                          onChange={(e) => setRejectionDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" disabled={!rejectionDrafts[a.id]?.trim()} onClick={() => handleReject(a.id)}>
                          Refuser
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Ajouter une plateforme candidate</Label>
            <Select value={newPlatformId} onValueChange={setNewPlatformId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choisir une plateforme…" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.platformName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!newPlatformId || createApplication.isPending}>
            {createApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
