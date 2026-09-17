import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import {
  useUploadPrequalDocument,
  useDeletePrequalDocument,
  useDownloadPrequalDocument,
  useExtractPrequalDocument,
} from '../hooks/use-prequalification';
import { DataRoomPanel } from './data-room-panel';
import type { PrequalDocument, PrequalDocumentRequest, PrequalExtractionResult } from '@/types';

/**
 * Documents (spec §7) — l'extraction assistée par IA reste une suggestion
 * en lecture seule : le résultat est affiché brut, l'analyste applique
 * chaque champ manuellement dans les autres onglets. `sourcePage` est
 * indiqué par le modèle, jamais une citation API vérifiée.
 */
export function DocumentsTab({ caseId, documents, requests }: { caseId: string; documents: PrequalDocument[]; requests: PrequalDocumentRequest[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPrequalDocument(caseId);
  const remove = useDeletePrequalDocument(caseId);
  const download = useDownloadPrequalDocument(caseId);
  const extract = useExtractPrequalDocument(caseId);
  const [extractionResult, setExtractionResult] = useState<PrequalExtractionResult | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleExtract = (documentId: string) => {
    setExtractingId(documentId);
    setExtractionResult(null);
    extract.mutate(documentId, {
      onSuccess: (result) => setExtractionResult(result),
      onSettled: () => setExtractingId(null),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          <div>
            <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Déposer un document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun document déposé.</p>}
          {documents.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Déposé le</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.name}
                    </TableCell>
                    <TableCell>{doc.classification ?? '—'}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Extraction assistée par IA" onClick={() => handleExtract(doc.id)} disabled={extractingId === doc.id}>
                          {extractingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => download.mutate(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove.mutate(doc.id)} disabled={remove.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {extract.isError && (
            <p className="mt-3 text-xs text-destructive">{extract.error instanceof ApiError ? extract.error.message : "L'extraction a échoué."}</p>
          )}
        </CardContent>
      </Card>

      <DataRoomPanel caseId={caseId} requests={requests} />

      {extractionResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suggestion d'extraction — {extractionResult.sourceDocumentName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Numéros de page indiqués par l'IA à titre indicatif — à vérifier, jamais une citation garantie. Rien n'est appliqué automatiquement : reportez chaque valeur retenue dans les onglets
              correspondants.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {extractionResult.project && (
              <ExtractionBlock title="Projet">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.project, null, 2)}</pre>
              </ExtractionBlock>
            )}
            {extractionResult.financial && (
              <ExtractionBlock title="Financier">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.financial, null, 2)}</pre>
              </ExtractionBlock>
            )}
            {extractionResult.costLineItems.length > 0 && (
              <ExtractionBlock title="Postes de coût">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.costLineItems, null, 2)}</pre>
              </ExtractionBlock>
            )}
            {extractionResult.lots.length > 0 && (
              <ExtractionBlock title="Lots">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.lots, null, 2)}</pre>
              </ExtractionBlock>
            )}
            {extractionResult.people.length > 0 && (
              <ExtractionBlock title="Porteurs">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.people, null, 2)}</pre>
              </ExtractionBlock>
            )}
            {extractionResult.companies.length > 0 && (
              <ExtractionBlock title="Sociétés">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(extractionResult.companies, null, 2)}</pre>
              </ExtractionBlock>
            )}
            <ExtractionBlock title="Notes du modèle">
              <p className="text-xs text-muted-foreground">{extractionResult.notes}</p>
            </ExtractionBlock>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExtractionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}
