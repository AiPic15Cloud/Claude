import { useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePlatformProfiles, useUpsertVehicleStructure, useCreateCapexItem, useCreateValuation } from '../hooks/use-fractional';
import { FRACTIONAL_VALUATION_METHOD_LABELS, type FractionalProjectDetail, type FractionalValuationMethod } from '@/types';
import { CreatePlatformProfileDialog } from './create-platform-profile-dialog';

/** Onglet Structure & Sortie (spec V3 §16/§24) — véhicule, profil plateforme, CAPEX et valorisations. */
export function StructureTab({ project }: { project: FractionalProjectDetail }) {
  const { data: profiles } = usePlatformProfiles();
  const upsertVehicle = useUpsertVehicleStructure(project.id);
  const createCapex = useCreateCapexItem(project.id);
  const createValuation = useCreateValuation(project.id);

  const [platformProfileId, setPlatformProfileId] = useState(project.vehicleStructure?.platformProfileId ?? '');
  const [spvName, setSpvName] = useState(project.vehicleStructure?.spvName ?? '');

  const [capexForm, setCapexForm] = useState({ annee: String(new Date().getFullYear() + 1), montant: '', nature: '' });
  const [valuationForm, setValuationForm] = useState<{ method: FractionalValuationMethod; value: string; asOfDate: string }>({
    method: 'CAPITALISATION',
    value: '',
    asOfDate: new Date().toISOString().slice(0, 10),
  });

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    upsertVehicle.mutate({ platformProfileId: platformProfileId || undefined, spvName: spvName || undefined });
  };

  const handleAddCapex = (e: React.FormEvent) => {
    e.preventDefault();
    createCapex.mutate({ annee: Number(capexForm.annee), montant: Number(capexForm.montant), nature: capexForm.nature }, { onSuccess: () => setCapexForm({ annee: capexForm.annee, montant: '', nature: '' }) });
  };

  const handleAddValuation = (e: React.FormEvent) => {
    e.preventDefault();
    createValuation.mutate(
      { method: valuationForm.method, value: Number(valuationForm.value), asOfDate: valuationForm.asOfDate },
      { onSuccess: () => setValuationForm({ ...valuationForm, value: '' }) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Véhicule & profil plateforme</CardTitle>
            <CreatePlatformProfileDialog />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveVehicle} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Profil plateforme</Label>
                <Select value={platformProfileId || undefined} onValueChange={setPlatformProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun profil assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.platformName} — hurdle {Number(p.minNetInvestorYieldPct).toFixed(1)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="spvName">SPV</Label>
                <Input id="spvName" value={spvName} onChange={(e) => setSpvName(e.target.value)} />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={upsertVehicle.isPending}>
                {upsertVehicle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CAPEX</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {project.capexItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Nature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.capexItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.annee}</TableCell>
                    <TableCell>{formatCurrency(item.montant)}</TableCell>
                    <TableCell>{item.nature}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form onSubmit={handleAddCapex} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capexAnnee">Année</Label>
              <Input id="capexAnnee" type="number" className="w-28" value={capexForm.annee} onChange={(e) => setCapexForm((p) => ({ ...p, annee: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capexMontant">Montant</Label>
              <Input id="capexMontant" type="number" min={0} className="w-36" required value={capexForm.montant} onChange={(e) => setCapexForm((p) => ({ ...p, montant: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capexNature">Nature</Label>
              <Input id="capexNature" required value={capexForm.nature} onChange={(e) => setCapexForm((p) => ({ ...p, nature: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createCapex.isPending}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Valorisations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {project.valuations.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.valuations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{FRACTIONAL_VALUATION_METHOD_LABELS[v.method]}</TableCell>
                    <TableCell>{formatCurrency(v.value)}</TableCell>
                    <TableCell>{formatDate(v.asOfDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form onSubmit={handleAddValuation} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Méthode</Label>
              <Select value={valuationForm.method} onValueChange={(v) => setValuationForm((p) => ({ ...p, method: v as FractionalValuationMethod }))}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FRACTIONAL_VALUATION_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valuationValue">Valeur</Label>
              <Input id="valuationValue" type="number" min={0} className="w-40" required value={valuationForm.value} onChange={(e) => setValuationForm((p) => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valuationDate">Date</Label>
              <Input id="valuationDate" type="date" value={valuationForm.asOfDate} onChange={(e) => setValuationForm((p) => ({ ...p, asOfDate: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createValuation.isPending}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
