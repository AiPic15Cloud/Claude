import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { usePrequalDataRoomSuggestions, useCreateDocumentRequest, useUpdateDocumentRequest } from '../hooks/use-prequalification';
import { DATA_ROOM_BLOCK_LABELS, PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS, type PrequalDocumentRequest, type PrequalDocumentRequestStatus } from '@/types';

const STATUSES = Object.keys(PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS) as PrequalDocumentRequestStatus[];

/**
 * Data room dynamique (spec §14) — les blocs suggérés viennent uniquement de
 * données déjà saisies au dossier (jamais une liste générique des 8 blocs) ;
 * une fois qu'une demande existe pour un bloc, la suggestion correspondante
 * disparaît (le serveur la retire côté `DataRoomService`). L'analyste choisit
 * lui-même quelles pièces demander dans chaque bloc suggéré, jamais une
 * création automatique.
 */
export function DataRoomPanel({ caseId, requests }: { caseId: string; requests: PrequalDocumentRequest[] }) {
  const { data: suggestions, isLoading } = usePrequalDataRoomSuggestions(caseId);
  const create = useCreateDocumentRequest(caseId);
  const update = useUpdateDocumentRequest(caseId);

  return (
    <div className="flex flex-col gap-4">
      {!isLoading && suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Blocs suggérés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {suggestions.map((s) => (
              <div key={s.block} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{DATA_ROOM_BLOCK_LABELS[s.block]}</Badge>
                  <span className="text-xs text-muted-foreground">{s.reason}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.documents.map((label) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => create.mutate({ label, block: s.block })}
                      disabled={create.isPending}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demandes de pièces</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune pièce demandée pour l'instant.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pièce</TableHead>
                  <TableHead>Bloc</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DATA_ROOM_BLOCK_LABELS[r.block as keyof typeof DATA_ROOM_BLOCK_LABELS] ?? r.block}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => update.mutate({ requestId: r.id, status: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
