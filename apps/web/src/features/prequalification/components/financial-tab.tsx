import { useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useUpsertFinancialModel } from '../hooks/use-prequalification';
import type { PrequalFinancialModel } from '@/types';

function pct(value: number | null | undefined): string {
  return value != null ? `${value.toFixed(1)} %` : '—';
}

/**
 * Bilan financier normalisé (spec §9.3) : les champs "déclarés" par
 * l'opérateur sont saisis ici, les valeurs recalculées (coût de revient,
 * marge, ratios LTA/LTC/LTV, point mort) sont produites côté serveur par
 * `prequal-financial.util.ts` à chaque enregistrement — jamais saisies
 * directement.
 */
export function FinancialTab({ caseId, financial }: { caseId: string; financial: PrequalFinancialModel | null }) {
  const upsert = useUpsertFinancialModel(caseId);
  const [form, setForm] = useState({
    amountRequested: financial?.amountRequested != null ? String(financial.amountRequested) : '',
    declaredEquity: financial?.declaredEquity != null ? String(financial.declaredEquity) : '',
    provenEquity: financial?.provenEquity != null ? String(financial.provenEquity) : '',
    declaredMarginPct: financial?.declaredMarginPct != null ? String(financial.declaredMarginPct) : '',
    declaredCoutDeRevient: financial?.declaredCoutDeRevient != null ? String(financial.declaredCoutDeRevient) : '',
    declaredChiffreAffaires: financial?.declaredChiffreAffaires != null ? String(financial.declaredChiffreAffaires) : '',
    landPrice: financial?.landPrice != null ? String(financial.landPrice) : '',
    bankDebt: financial?.bankDebt != null ? String(financial.bankDebt) : '',
    otherRevenueRetained: financial?.otherRevenueRetained != null ? String(financial.otherRevenueRetained) : '',
    ratiosIncludeBankDebt: financial?.ratiosIncludeBankDebt ?? false,
  });

  const [items, setItems] = useState(financial?.costLineItems.map((i) => ({ category: i.category, label: i.label, amount: String(i.amount) })) ?? []);
  const [newItem, setNewItem] = useState({ category: '', label: '', amount: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      amountRequested: form.amountRequested ? Number(form.amountRequested) : undefined,
      declaredEquity: form.declaredEquity ? Number(form.declaredEquity) : undefined,
      provenEquity: form.provenEquity ? Number(form.provenEquity) : undefined,
      declaredMarginPct: form.declaredMarginPct ? Number(form.declaredMarginPct) : undefined,
      declaredCoutDeRevient: form.declaredCoutDeRevient ? Number(form.declaredCoutDeRevient) : undefined,
      declaredChiffreAffaires: form.declaredChiffreAffaires ? Number(form.declaredChiffreAffaires) : undefined,
      landPrice: form.landPrice ? Number(form.landPrice) : undefined,
      bankDebt: form.bankDebt ? Number(form.bankDebt) : undefined,
      otherRevenueRetained: form.otherRevenueRetained ? Number(form.otherRevenueRetained) : undefined,
      ratiosIncludeBankDebt: form.ratiosIncludeBankDebt,
      costLineItems: items.filter((i) => i.category && i.label && i.amount).map((i) => ({ category: i.category, label: i.label, amount: Number(i.amount) })),
    });
  };

  const addItem = () => {
    if (!newItem.category || !newItem.label || !newItem.amount) return;
    setItems((prev) => [...prev, newItem]);
    setNewItem({ category: '', label: '', amount: '' });
  };
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-4">
      {financial && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bilan recalculé (ATLAS)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Coût de revient" value={financial.coutDeRevient != null ? formatCurrency(financial.coutDeRevient) : '—'} />
            <Metric label="Chiffre d'affaires" value={financial.chiffreAffaires != null ? formatCurrency(financial.chiffreAffaires) : '—'} />
            <Metric label="Marge" value={financial.margeRecalculee != null ? formatCurrency(financial.margeRecalculee) : '—'} warn={(financial.margeRecalculee ?? 0) < 0} />
            <Metric label="Marge %" value={pct(financial.margeRecalculeePct)} />
            <Metric label="Besoin max. financement" value={financial.besoinMaxFinancement != null ? formatCurrency(financial.besoinMaxFinancement) : '—'} />
            <Metric label="Prix de sortie pondéré /m²" value={financial.prixSortiePondere != null ? formatCurrency(financial.prixSortiePondere) : '—'} />
            <Metric label="Point mort /m²" value={financial.pointMortAuM2 != null ? formatCurrency(financial.pointMortAuM2) : '—'} />
            <Metric label="LTA" value={pct(financial.ltaPct)} />
            <Metric label="LTC" value={pct(financial.ltcPct)} />
            <Metric label="LTV" value={pct(financial.ltvPct)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Données déclarées</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Montant recherché" value={form.amountRequested} onChange={(v) => setForm((p) => ({ ...p, amountRequested: v }))} />
              <Field label="Apport annoncé" value={form.declaredEquity} onChange={(v) => setForm((p) => ({ ...p, declaredEquity: v }))} />
              <Field label="Apport prouvé" value={form.provenEquity} onChange={(v) => setForm((p) => ({ ...p, provenEquity: v }))} />
              <Field label="Marge annoncée (%)" value={form.declaredMarginPct} onChange={(v) => setForm((p) => ({ ...p, declaredMarginPct: v }))} />
              <Field label="Coût de revient (opérateur)" value={form.declaredCoutDeRevient} onChange={(v) => setForm((p) => ({ ...p, declaredCoutDeRevient: v }))} />
              <Field label="CA (opérateur)" value={form.declaredChiffreAffaires} onChange={(v) => setForm((p) => ({ ...p, declaredChiffreAffaires: v }))} />
              <Field label="Prix du foncier" value={form.landPrice} onChange={(v) => setForm((p) => ({ ...p, landPrice: v }))} />
              <Field label="Dette bancaire" value={form.bankDebt} onChange={(v) => setForm((p) => ({ ...p, bankDebt: v }))} />
              <Field label="Autres produits retenus (portage)" value={form.otherRevenueRetained} onChange={(v) => setForm((p) => ({ ...p, otherRevenueRetained: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ratiosIncludeBankDebt} onCheckedChange={(v) => setForm((p) => ({ ...p, ratiosIncludeBankDebt: v }))} />
              <Label>Inclure la dette bancaire dans les ratios LTA/LTC/LTV</Label>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Postes de coût</Label>
              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>{formatCurrency(Number(item.amount) || 0)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Catégorie</Label>
                  <Input placeholder="ex: Foncier, Travaux" className="w-40" value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Libellé</Label>
                  <Input className="w-52" value={newItem.label} onChange={(e) => setNewItem((p) => ({ ...p, label: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Montant</Label>
                  <Input type="number" min={0} className="w-36" value={newItem.amount} onChange={(e) => setNewItem((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                  Ajouter le poste
                </Button>
              </div>
            </div>

            <div>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer et recalculer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${warn ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}
