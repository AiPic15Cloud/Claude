import { useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, File, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDocuments, useUploadDocument, useDeleteDocument, useDownloadDocument, useExtractFinancials } from '../hooks/use-documents';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { isDocumentReadableByAgent } from '@/lib/document-support';
import { cn } from '@/lib/utils';
import type { DocumentFile, FinancialExtraction } from '@/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Vert/jaune/rouge reprennent les tokens de statut de l'app ; "orange" est un 4e palier
// propre à cette grille de marge (l'app n'a que 3 couleurs de statut sémantiques).
const MARGIN_BAND_STYLES: Record<string, string> = {
  vert: 'bg-success/10 text-success',
  jaune: 'bg-warning/10 text-warning',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  rouge: 'bg-destructive/10 text-destructive',
};
const MARGIN_BAND_EMOJI: Record<string, string> = { vert: '🟢', jaune: '🟡', orange: '🟠', rouge: '🔴' };

function MarginBadge({ pct, band }: { pct: number | null; band: FinancialExtraction['marginBand'] }) {
  if (pct === null || !band) {
    return <span className="text-xs italic text-muted-foreground">Information absente</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', MARGIN_BAND_STYLES[band])}>
      {MARGIN_BAND_EMOJI[band]} {pct} %
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      {value === null ? (
        <span className="text-xs italic text-muted-foreground">Information absente</span>
      ) : (
        <span className="font-medium tabular-nums">{value}</span>
      )}
    </div>
  );
}

function ExtractionDialog({
  extraction,
  onClose,
  onApply,
}: {
  extraction: FinancialExtraction;
  onClose: () => void;
  onApply: (extraction: FinancialExtraction) => void;
}) {
  const euro = (v: number | null) => (v === null ? null : formatCurrency(v));
  const m2 = (v: number | null) => (v === null ? null : `${formatCurrency(v)}/m²`);
  const pct = (v: number | null) => (v === null ? null : `${v} %`);
  const months = (v: number | null) => (v === null ? null : `${v} mois`);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Fiche Produit — extraite du document</DialogTitle>
          <DialogDescription>
            « {extraction.sourceDocument} » — à vérifier avant toute utilisation, l'IA peut se tromper.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[28rem] overflow-y-auto pr-1">
          <div className="mb-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">Marge</span>
            <MarginBadge pct={extraction.margePct} band={extraction.marginBand} />
          </div>

          <Field label="Coût de revient total" value={euro(extraction.coutDeRevientTotal)} />
          <Field label="Chiffre d'affaires total" value={euro(extraction.chiffreAffairesTotal)} />
          <Field label="Marge (€)" value={euro(extraction.margeEuros)} />
          <Field label="Surface" value={extraction.surfaceM2 === null ? null : `${extraction.surfaceM2} m²`} />
          <Field label="Prix acquisition/m²" value={m2(extraction.prixAcquisitionM2)} />
          <Field label="Coût travaux/m²" value={m2(extraction.coutTravauxM2)} />
          <Field label="Montant travaux" value={euro(extraction.montantTravaux)} />
          <Field label="Aléas travaux" value={pct(extraction.aleasTravauxPct)} />
          <Field label="Prix de sortie/m²" value={m2(extraction.prixSortieM2)} />
          <Field label="Taux d'intérêt" value={pct(extraction.tauxInteretPct)} />
          <Field label="Durée min." value={months(extraction.dureeMinMois)} />
          <Field label="Durée cible" value={months(extraction.dureeCibleMois)} />
          <Field label="Durée max." value={months(extraction.dureeMaxMois)} />
          <Field label="Apport du porteur" value={euro(extraction.apportPdp)} />
          <Field label="Montant banque" value={euro(extraction.montantBanque)} />
          <Field label="Garanties" value={extraction.garanties} />

          {extraction.notes && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {extraction.notes}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => onApply(extraction)}>
            <Sparkles className="h-3.5 w-3.5" />
            Pré-remplir le modèle financier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentRow({
  dealId,
  doc,
  onApplyToFinancialModel,
}: {
  dealId: string;
  doc: DocumentFile;
  onApplyToFinancialModel?: (extraction: FinancialExtraction) => void;
}) {
  const download = useDownloadDocument(dealId);
  const remove = useDeleteDocument(dealId);
  const extract = useExtractFinancials(dealId);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<FinancialExtraction | null>(null);
  const extractable = isDocumentReadableByAgent(doc);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5">
      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(doc.size)}
          {doc.uploadedBy ? ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ''} ·{' '}
          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}
        </p>
        {extract.isError && (
          <p className="mt-1 text-xs text-destructive">
            {extract.error instanceof ApiError ? extract.error.message : "Échec de l'analyse du document."}
          </p>
        )}
      </div>
      <div className="ml-7 flex flex-wrap items-center gap-1 sm:ml-0">
        <Button
          size="sm"
          variant="ghost"
          title={extractable ? 'Analyser avec l\'IA (extraction financière)' : 'Analyse automatique disponible uniquement pour PDF et Excel'}
          disabled={!extractable || extract.isPending}
          onClick={() => extract.mutate(doc.id, { onSuccess: setResult })}
        >
          {extract.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </Button>
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

      {result && (
        <ExtractionDialog
          extraction={result}
          onClose={() => setResult(null)}
          onApply={(extraction) => {
            onApplyToFinancialModel?.(extraction);
            setResult(null);
          }}
        />
      )}
    </div>
  );
}

export function DocumentsPanel({
  dealId,
  onApplyToFinancialModel,
}: {
  dealId: string;
  onApplyToFinancialModel?: (extraction: FinancialExtraction) => void;
}) {
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
          <CardDescription>
            Pièces déposées sur le dossier — pris en compte dans le Score ATLAS. L'icône <Sparkles className="inline h-3 w-3" /> lance
            une extraction financière automatique (PDF, Excel).
          </CardDescription>
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
          <DocumentRow key={doc.id} dealId={dealId} doc={doc} onApplyToFinancialModel={onApplyToFinancialModel} />
        ))}
      </CardContent>
    </Card>
  );
}
