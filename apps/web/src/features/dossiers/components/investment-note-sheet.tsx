import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useDealRisk, useRiskHistory } from '../hooks/use-risk';
import { useGuarantees } from '../hooks/use-guarantees';
import { useDealActivities } from '../hooks/use-activities';
import { useFinancialModel, useComputeScenarios } from '../hooks/use-financial-model';
import { useMarketPrice, type MarketPriceTypology } from '../hooks/use-market-price';
import { useComparables } from '../hooks/use-comparables';
import { InvestmentNotePrintSheet } from './investment-note-print-sheet';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  DEAL_TYPE_LABELS,
  DEAL_STAGE_LABELS,
  DEAL_SURVEILLANCE_STATUS_LABELS,
  GUARANTEE_TYPE_LABELS,
  isFinancedStage,
  type Deal,
} from '@/types';

const TYPOLOGY_LABELS: Record<MarketPriceTypology, string> = {
  MAISON: 'Maison',
  APPARTEMENT: 'Appartement',
  TERRAIN_A_BATIR: 'Terrain à bâtir',
};

function generateResumeExecutif(deal: Deal): string {
  const porteur = deal.porteurNom || deal.porteurSociete || 'un porteur non renseigné';
  const statut = isFinancedStage(deal.stage)
    ? `Dossier en suivi (${DEAL_STAGE_LABELS[deal.stage]}), score de risque ATLAS ${deal.riskScore ?? '—'}/100.`
    : `Dossier en cours d'instruction (${DEAL_STAGE_LABELS[deal.stage]}).`;
  return (
    `${deal.name} (${deal.reference}) — ${DEAL_TYPE_LABELS[deal.type]} porté par ${porteur}, ` +
    `pour un montant cible de ${formatCurrency(deal.amountTarget)}` +
    (deal.interestRate ? ` à ${deal.interestRate}%` : '') +
    (deal.durationMonths ? ` sur ${deal.durationMonths} mois` : '') +
    `. ${statut}\n\nRecommandation : [à compléter par l'analyste — ATLAS compile la donnée factuelle, la décision reste humaine].`
  );
}

function generatePresentation(deal: Deal): string {
  const localisation = [deal.address, deal.postcode, deal.city].filter(Boolean).join(', ') || 'localisation non renseignée';
  const porteurLine = [deal.porteurNom, deal.porteurSociete].filter(Boolean).join(' — ') || 'non renseigné';
  const siren = deal.porteurSiren ? ` (SIREN ${deal.porteurSiren})` : '';
  return (
    `Opération de type ${DEAL_TYPE_LABELS[deal.type]}, située ${localisation}.\n` +
    `Porteur de projet : ${porteurLine}${siren}.` +
    (deal.description ? `\n\n${deal.description}` : '')
  );
}

export function InvestmentNoteSheet({
  dealId,
  deal,
  onOpenChange,
}: {
  dealId: string;
  deal: Deal;
  /** Permet à DossierPage de masquer temporairement DealPrintSheet — les deux ne doivent jamais être print:block en même temps, sous peine d'imprimer les deux documents empilés. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const seeded = useRef(false);

  const risk = useDealRisk(dealId);
  const riskHistory = useRiskHistory(dealId, 90);
  const guarantees = useGuarantees(dealId);
  const activities = useDealActivities(dealId);
  const financialModel = useFinancialModel(dealId);
  const scenarios = useComputeScenarios(dealId);
  const comparables = useComparables(dealId);
  const marketPrice = useMarketPrice(dealId);
  const [typology, setTypology] = useState<MarketPriceTypology | ''>('');

  const [resumeText, setResumeText] = useState('');
  const [presentationText, setPresentationText] = useState('');
  const [marcheText, setMarcheText] = useState('');
  const [financierText, setFinancierText] = useState('');
  const [risqueText, setRisqueText] = useState('');
  const [suiviText, setSuiviText] = useState('');

  const handleOpen = () => {
    setOpen(true);
    if (!scenarios.data) scenarios.mutate({});
  };

  // Pré-remplit chaque section une seule fois à l'ouverture — jamais réécrit ensuite
  // pour ne pas effacer les modifications de l'analyste si les données sous-jacentes changent.
  useEffect(() => {
    if (!open || seeded.current) return;
    setResumeText(generateResumeExecutif(deal));
    setPresentationText(generatePresentation(deal));
    seeded.current = true;
  }, [open, deal]);

  useEffect(() => {
    if (!open || !risk.data || riskHistory.data === undefined || risqueText) return;
    const signaux = risk.data.triggered.length > 0
      ? risk.data.triggered.map((t) => `- ${t.label} (+${t.points} pts) : ${t.explanation}`).join('\n')
      : 'Aucun signal actif.';
    const completude = risk.data.completeness && risk.data.completeness.missingCount > 0
      ? `${risk.data.completeness.missingCount} élément(s) manquant(s) : ${risk.data.completeness.missingItems.map((m) => m.label).join(', ')}.`
      : 'Dossier complet.';
    const evolution =
      riskHistory.data.length >= 2
        ? `Évolution sur 90 jours : ${riskHistory.data[0].compositeScore ?? '—'} → ${riskHistory.data[riskHistory.data.length - 1].compositeScore ?? '—'} (${riskHistory.data.length} relevé(s)).`
        : "Historique insuffisant sur 90 jours pour établir une tendance.";
    setRisqueText(
      `Score de risque ATLAS : ${risk.data.composite.score ?? '—'}/100` +
        (risk.data.composite.trend ? ` (tendance ${risk.data.composite.trend.toLowerCase()})` : '') +
        `. Statut de surveillance : ${risk.data.surveillance.status ? DEAL_SURVEILLANCE_STATUS_LABELS[risk.data.surveillance.status] : '—'}.\n${evolution}\n\n` +
        `Signaux et causes actifs :\n${signaux}\n\nComplétude du dossier : ${completude}`,
    );
  }, [open, risk.data, riskHistory.data, risqueText]);

  useEffect(() => {
    if (!open || !financialModel.data?.synthesis || financierText) return;
    const s = financialModel.data.synthesis;
    setFinancierText(
      `Coût de revient : ${formatCurrency(s.coutDeRevient)} · Prix de vente : ${formatCurrency(s.prixDeVente)} · ` +
        `Marge avant impôts : ${formatCurrency(s.marge)} (${s.margePct}%).\n` +
        `Financement LPB : ${formatCurrency(s.lpb.collecte)} au taux de ${s.lpb.tauxPct}%.` +
        (guarantees.data && guarantees.data.length > 0
          ? `\n\nGaranties : ${guarantees.data.map((g) => `${GUARANTEE_TYPE_LABELS[g.type]} (rang ${g.rank}, ${formatCurrency(g.amount)}, ${g.validity === 'VALIDE' ? 'valide' : 'non valide'})`).join(' ; ')}.`
          : '\n\nAucune garantie enregistrée.')
    );
  }, [open, financialModel.data, guarantees.data, financierText]);

  useEffect(() => {
    if (!open || marcheText) return;
    if (comparables.data === undefined) return;
    const internes = comparables.data.length > 0
      ? `${comparables.data.length} dossier(s) comparable(s) dans le portefeuille (même ville ou typologie).`
      : 'Aucun dossier comparable trouvé dans le portefeuille.';
    setMarcheText(`Comparables internes : ${internes}\n\nComparables externes : à rechercher ci-dessous.`);
  }, [open, comparables.data, marcheText]);

  useEffect(() => {
    if (!open || !isFinancedStage(deal.stage) || suiviText) return;
    const decisions = activities.data && activities.data.length > 0
      ? activities.data.slice(0, 8).map((a) => `- ${formatDate(a.createdAt)} : ${a.message}`).join('\n')
      : 'Aucune activité enregistrée.';
    setSuiviText(
      `Capital restant dû : ${formatCurrency(deal.crdTotal ?? deal.crd ?? deal.amountRaised)}.\n\n` +
        `Historique des décisions récentes :\n${decisions}`,
    );
  }, [open, deal, activities.data, suiviText]);

  const handleSearchMarket = () => {
    if (!typology) return;
    marketPrice.mutate(typology);
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={handleOpen}>
        <FileText className="h-3.5 w-3.5" /> Note d'investissement
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        {/* print:hidden — le Sheet est portalé hors de l'arbre de DossierPage (donc hors de portée du print:hidden
            posé sur le reste de la page), il faut donc le masquer explicitement ici, sans quoi son contenu interactif
            (textareas, boutons) s'imprimerait par-dessus/à la place d'InvestmentNotePrintSheet. */}
        <SheetContent className="overflow-y-auto print:hidden sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Note d'investissement — {deal.name}</SheetTitle>
            <SheetDescription>
              Brouillon éditable compilé à partir des données du dossier. Ajustez chaque section avant export — ATLAS
              compile la donnée factuelle, l'analyste garde la main sur la rédaction finale et le jugement qualitatif.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">1. Résumé exécutif</Label>
              <Textarea rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
            </section>

            <section className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">2. Présentation de l'opération</Label>
              <Textarea rows={5} value={presentationText} onChange={(e) => setPresentationText(e.target.value)} />
            </section>

            <section className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">3. Analyse de marché</Label>
              {comparables.data && comparables.data.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dossier</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Taux</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparables.data.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.city ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(c.amountTarget)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{c.interestRate ? `${c.interestRate}%` : '—'}</TableCell>
                          <TableCell>{c.repaid ? 'Remboursé' : DEAL_STAGE_LABELS[c.stage]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Select value={typology} onValueChange={(v) => setTypology(v as MarketPriceTypology)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Typologie pour les comparables externes (C.8)…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPOLOGY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleSearchMarket} disabled={!typology || marketPrice.isPending}>
                  {marketPrice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Rechercher
                </Button>
              </div>
              {marketPrice.data?.average && (
                <p className="text-xs text-muted-foreground">
                  Prix moyen externe observé : {formatCurrency(marketPrice.data.average.priceMid)}/m² pour « {marketPrice.data.query} »
                  {marketPrice.data.exitPricePerSqm !== null && ` — prix de sortie du projet : ${formatCurrency(marketPrice.data.exitPricePerSqm)}/m²`}.
                </p>
              )}
              <Textarea rows={4} value={marcheText} onChange={(e) => setMarcheText(e.target.value)} />
            </section>

            <section className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">4. Analyse financière</Label>
              {scenarios.data?.hasData && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[scenarios.data.pessimiste, scenarios.data.central, scenarios.data.optimiste].map(
                    (s) =>
                      s && (
                        <div key={s.label} className="rounded-md border border-border p-2">
                          <p className="font-medium">{s.label}</p>
                          <p className="text-muted-foreground">TRI {s.triAnnuelPct ?? '—'}% · Multiple {s.multipleCapital ?? '—'}x</p>
                        </div>
                      ),
                  )}
                </div>
              )}
              <Textarea rows={6} value={financierText} onChange={(e) => setFinancierText(e.target.value)} />
            </section>

            <section className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">5. Analyse de risque</Label>
              <Textarea rows={8} value={risqueText} onChange={(e) => setRisqueText(e.target.value)} />
            </section>

            {isFinancedStage(deal.stage) && (
              <section className="flex flex-col gap-2">
                <Label className="text-sm font-semibold">6. Suivi</Label>
                <Textarea rows={6} value={suiviText} onChange={(e) => setSuiviText(e.target.value)} />
              </section>
            )}

            <Button type="button" onClick={() => window.print()} className="self-end">
              Exporter en PDF
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {open && (
        <InvestmentNotePrintSheet
          deal={deal}
          sections={{ resume: resumeText, presentation: presentationText, marche: marcheText, financier: financierText, risque: risqueText, suivi: suiviText }}
        />
      )}
    </>
  );
}
