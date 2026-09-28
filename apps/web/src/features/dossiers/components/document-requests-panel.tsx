import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useDocumentRequests, useCreateDocumentRequest, useUpdateDocumentRequest } from '../hooks/use-document-requests';
import { PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS, type PrequalDocumentRequestStatus } from '@/types';

const STATUSES = Object.keys(PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS) as PrequalDocumentRequestStatus[];

/**
 * Lot C (Actions et parcours) — "demandes documentaires" pour un dossier
 * déjà en Portefeuille, équivalent du panneau data room de la Préqual mais
 * sans moteur de suggestion : la spec ne définit pas de blocs de data room
 * fermés pour un dossier en vie, la création reste donc manuelle.
 */
export function DocumentRequestsPanel({ dealId }: { dealId: string }) {
  const { data: requests = [], isLoading } = useDocumentRequests(dealId);
  const create = useCreateDocumentRequest(dealId);
  const update = useUpdateDocumentRequest(dealId);
  const [label, setLabel] = useState('');
  const [block, setBlock] = useState('');

  const handleAdd = () => {
    if (!label.trim()) return;
    create.mutate(
      { label: label.trim(), block: block.trim() || undefined },
      { onSuccess: () => { setLabel(''); setBlock(''); } },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Demandes de pièces</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Pièce demandée</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Rapport d'agence T3" />
          </div>
          <div className="flex min-w-[8rem] flex-col gap-1">
            <span className="text-xs text-muted-foreground">Thème (facultatif)</span>
            <Input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Ex. Travaux" />
          </div>
          <Button type="button" onClick={handleAdd} disabled={!label.trim() || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Demander
          </Button>
        </div>

        {!isLoading && requests.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucune pièce demandée pour l'instant.</p>}

        {requests.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Thème</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>{r.block ? <Badge variant="outline">{r.block}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
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
  );
}
