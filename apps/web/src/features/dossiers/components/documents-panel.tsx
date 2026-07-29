import { useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, File, Loader2, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocuments, useUploadDocument, useDeleteDocument, useDownloadDocument } from '../hooks/use-documents';
import { ApiError } from '@/lib/api';
import type { DocumentFile } from '@/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function DocumentRow({ dealId, doc }: { dealId: string; doc: DocumentFile }) {
  const download = useDownloadDocument(dealId);
  const remove = useDeleteDocument(dealId);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(doc.size)}
          {doc.uploadedBy ? ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ''} ·{' '}
          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => download.mutate(doc)} disabled={download.isPending}>
        {download.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </Button>
      {confirming ? (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
          <Button size="sm" variant="destructive" onClick={() => remove.mutate(doc.id)} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmer'}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function DocumentsPanel({ dealId }: { dealId: string }) {
  const { data: documents, isLoading } = useDocuments(dealId);
  const upload = useUploadDocument(dealId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    upload.mutate(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Documents ({documents?.length ?? 0})</CardTitle>
          <CardDescription>Pièces déposées sur le dossier — pris en compte dans le Score ATLAS.</CardDescription>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Déposer un document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {upload.isError && (
          <p className="text-xs text-destructive">
            {upload.error instanceof ApiError ? upload.error.message : "Échec de l'envoi du document."}
          </p>
        )}
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && documents?.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucun document déposé pour ce dossier.</p>
        )}
        {documents?.map((doc) => (
          <DocumentRow key={doc.id} dealId={dealId} doc={doc} />
        ))}
      </CardContent>
    </Card>
  );
}
