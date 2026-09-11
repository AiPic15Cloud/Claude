import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import {
  useCreateStakeholder,
  useDeleteStakeholder,
  useCreateFeeDefinition,
  useDeleteFeeDefinition,
  useCreateWaterfallTier,
  useDeleteWaterfallTier,
  useFractionalDealEconomicsStressTests,
} from '../hooks/use-fractional';
import {
  STAKEHOLDER_ROLE_LABELS,
  FEE_TYPE_LABELS,
  FEE_CALCULATION_BASE_LABELS,
  WATERFALL_TIER_TYPE_LABELS,
  STRESS_SCENARIO_LABELS,
  type FractionalStakeholder,
  type FractionalWaterfallTier,
  type FractionalDealEconomics,
  type StakeholderRole,
  type FeeType,
  type FeeCalculationBase,
  type WaterfallTierType,
} from '@/types';

const ROLES: StakeholderRole[] = ['INVESTOR', 'PLATFORM', 'SPONSOR', 'ARRANGER', 'ASSET_MANAGER', 'PROPERTY_MANAGER', 'LENDER', 'ADVISOR', 'OTHER'];
const FEE_TYPES: FeeType[] = ['ENTRY', 'RUNNING', 'TRANSACTION', 'FINANCING', 'EXIT', 'CARRY', 'REVENUE_SHARE', 'CAPITAL_GAIN_SHARE'];
const FEE_BASES: FeeCalculationBase[] = ['PRIX_NET_VENDEUR', 'COUT_TOTAL', 'GAV', 'NAV', 'LOYERS_BRUTS', 'LOYERS_NETS', 'NOI', 'CAPITAL_COLLECTE', 'PLUS_VALUE', 'AUTRE'];
const TIER_TYPES: WaterfallTierType[] = ['PREFERRED_RETURN', 'RETURN_OF_CAPITAL', 'CATCH_UP', 'CARRIED_INTEREST', 'RESIDUAL_SPLIT'];

function pct(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)} %`;
}

/**
 * Onglet Deal Economics (spec V3.1 §29, "P0 CRITIQUE") — parties prenantes,
 * frais versionnés et waterfall à tiers. Chemin opt-in : tant qu'aucun
 * stakeholder/tier n'est configuré, le split simple investisseur/plateforme
 * du profil plateforme (onglet Structure) reste utilisé pour la Synthèse.
 */
export function DealEconomicsTab({
  projectId,
  stakeholders,
  waterfallTiers,
  economics,
  isLoading,
}: {
  projectId: string;
  stakeholders: FractionalStakeholder[];
  waterfallTiers: FractionalWaterfallTier[];
  economics?: FractionalDealEconomics | null;
  isLoading: boolean;
}) {
  const { data: stressScenarios, isLoading: stressScenariosLoading } = useFractionalDealEconomicsStressTests(projectId);
  const createStakeholder = useCreateStakeholder(projectId);
  const deleteStakeholder = useDeleteStakeholder(projectId);
  const createFee = useCreateFeeDefinition(projectId);
  const deleteFee = useDeleteFeeDefinition(projectId);
  const createTier = useCreateWaterfallTier(projectId);
  const deleteTier = useDeleteWaterfallTier(projectId);

  const [stakeholderForm, setStakeholderForm] = useState<{ role: StakeholderRole; name: string; capitalEngaged: string }>({ role: 'INVESTOR', name: '', capitalEngaged: '' });
  const [feeForm, setFeeForm] = useState<{ stakeholderId: string; feeType: FeeType; ratePct: string; calculationBase: FeeCalculationBase }>({
    stakeholderId: '',
    feeType: 'RUNNING',
    ratePct: '',
    calculationBase: 'NOI',
  });
  const [tierForm, setTierForm] = useState<{ order: string; type: WaterfallTierType; beneficiaryStakeholderId: string; hurdleRatePct: string; catchUpPct: string; sharePct: string }>({
    order: '1',
    type: 'PREFERRED_RETURN',
    beneficiaryStakeholderId: '',
    hurdleRatePct: '',
    catchUpPct: '',
    sharePct: '',
  });

  const allFees = stakeholders.flatMap((s) => (s.feeDefinitions ?? []).map((f) => ({ ...f, stakeholderName: s.name })));

  const handleAddStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    createStakeholder.mutate(
      { role: stakeholderForm.role, name: stakeholderForm.name, capitalEngaged: stakeholderForm.capitalEngaged ? Number(stakeholderForm.capitalEngaged) : undefined },
      { onSuccess: () => setStakeholderForm({ role: 'INVESTOR', name: '', capitalEngaged: '' }) },
    );
  };

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.stakeholderId) return;
    createFee.mutate(
      { stakeholderId: feeForm.stakeholderId, feeType: feeForm.feeType, ratePct: feeForm.ratePct ? Number(feeForm.ratePct) : undefined, calculationBase: feeForm.calculationBase },
      { onSuccess: () => setFeeForm({ ...feeForm, ratePct: '' }) },
    );
  };

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    createTier.mutate(
      {
        order: Number(tierForm.order),
        type: tierForm.type,
        beneficiaryStakeholderId: tierForm.beneficiaryStakeholderId || undefined,
        hurdleRatePct: tierForm.hurdleRatePct ? Number(tierForm.hurdleRatePct) : undefined,
        catchUpPct: tierForm.catchUpPct ? Number(tierForm.catchUpPct) : undefined,
        sharePct: tierForm.sharePct ? Number(tierForm.sharePct) : undefined,
      },
      { onSuccess: () => setTierForm({ ...tierForm, order: String(Number(tierForm.order) + 1), sharePct: '', hurdleRatePct: '', catchUpPct: '' }) },
    );
  };

  const stakeholderName = (id?: string | null) => stakeholders.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      {stakeholders.length === 0 && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Aucune partie prenante configurée — le dossier utilise le split simple investisseur/plateforme du profil plateforme (onglet Structure). Ajouter des parties
            prenantes ci-dessous active le moteur de waterfall multi-tiers (preferred return, catch-up, carried interest...).
          </CardContent>
        </Card>
      )}

      {economics && (
        <>
          <Card className={economics.result.reconciled ? '' : 'border-destructive'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Répartition économique</CardTitle>
                <Badge variant={economics.result.reconciled ? 'success' : 'destructive'}>
                  {economics.result.reconciled ? 'Réconcilié à 100%' : `Écart non alloué : ${formatCurrency(economics.result.unallocatedAmount)}`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partie prenante</TableHead>
                    <TableHead>Capital engagé</TableHead>
                    <TableHead>Frais perçus</TableHead>
                    <TableHead>Waterfall perçu</TableHead>
                    <TableHead>Profit net</TableHead>
                    <TableHead>TRI</TableHead>
                    <TableHead>Multiple</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {economics.result.stakeholders.map((s) => (
                    <TableRow key={s.stakeholderId}>
                      <TableCell>
                        {s.name} <span className="text-xs text-muted-foreground">({STAKEHOLDER_ROLE_LABELS[s.role]})</span>
                      </TableCell>
                      <TableCell>{s.capitalEngaged !== null ? formatCurrency(s.capitalEngaged) : '—'}</TableCell>
                      <TableCell>{formatCurrency(s.totalFeeIncome)}</TableCell>
                      <TableCell>{formatCurrency(s.totalWaterfallIncome)}</TableCell>
                      <TableCell>{s.netProfit !== null ? formatCurrency(s.netProfit) : '—'}</TableCell>
                      <TableCell>{pct(s.irrPct)}</TableCell>
                      <TableCell>{s.multiple !== null ? `${s.multiple.toFixed(2)}x` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Total Fee Load</span>
                  <p className="text-lg font-semibold tabular-nums">{pct(economics.result.totalFeeLoadPct)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Sponsor equity ratio</span>
                  <p className="text-lg font-semibold tabular-nums">{pct(economics.result.alignment.sponsorEquityRatioPct)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Carry subordonné au hurdle</span>
                  <p className="text-lg font-semibold">{economics.result.alignment.carrySubordinatedToHurdle === null ? '—' : economics.result.alignment.carrySubordinatedToHurdle ? 'Oui' : 'Non'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {economics.reverseSolver && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reverse Solver — Deal Economics</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Charge de frais totale maximum (facteur d'échelle × frais actuels)</span>
                  <p className="text-lg font-semibold tabular-nums">
                    {economics.reverseSolver.maxTotalFeeLoad.value !== null ? formatCurrency(economics.reverseSolver.maxTotalFeeLoad.value) : 'Hors de portée'}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Carried interest maximum</span>
                  <p className="text-lg font-semibold tabular-nums">{economics.reverseSolver.maxCarry.value !== null ? pct(economics.reverseSolver.maxCarry.value) : 'Hors de portée'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stress Testing × Deal Economics — TRI par partie prenante</CardTitle>
            </CardHeader>
            <CardContent>
              {stressScenariosLoading && <Skeleton className="h-48" />}
              {stressScenarios && stressScenarios.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scénario</TableHead>
                        {stressScenarios[0].result.stakeholders.map((s) => (
                          <TableHead key={s.stakeholderId}>
                            {s.name} <span className="text-xs text-muted-foreground">({STAKEHOLDER_ROLE_LABELS[s.role]})</span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stressScenarios.map(({ scenario, result }) => (
                        <TableRow key={scenario} className={scenario === 'BASE' ? 'font-medium' : undefined}>
                          <TableCell>{STRESS_SCENARIO_LABELS[scenario]}</TableCell>
                          {result.stakeholders.map((s) => (
                            <TableCell key={s.stakeholderId}>
                              {pct(s.irrPct)} <span className="text-xs text-muted-foreground">({s.multiple !== null ? `${s.multiple.toFixed(2)}x` : '—'})</span>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!economics && !isLoading && stakeholders.length > 0 && waterfallTiers.length > 0 && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">Saisissez d'abord les Sources & Uses (onglet Acquisition) pour calculer les Deal Economics.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parties prenantes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {stakeholders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Capital engagé</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{STAKEHOLDER_ROLE_LABELS[s.role]}</TableCell>
                    <TableCell>{s.capitalEngaged ? formatCurrency(s.capitalEngaged) : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteStakeholder.mutate(s.id)} disabled={deleteStakeholder.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form onSubmit={handleAddStakeholder} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Select value={stakeholderForm.role} onValueChange={(v) => setStakeholderForm((p) => ({ ...p, role: v as StakeholderRole }))}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {STAKEHOLDER_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stakeholderName">Nom</Label>
              <Input id="stakeholderName" required value={stakeholderForm.name} onChange={(e) => setStakeholderForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stakeholderCapital">Capital engagé</Label>
              <Input id="stakeholderCapital" type="number" min={0} className="w-40" value={stakeholderForm.capitalEngaged} onChange={(e) => setStakeholderForm((p) => ({ ...p, capitalEngaged: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createStakeholder.isPending}>
              {createStakeholder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      {stakeholders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Frais versionnés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {allFees.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Assiette</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.stakeholderName}</TableCell>
                      <TableCell>{FEE_TYPE_LABELS[f.feeType]}</TableCell>
                      <TableCell>{f.ratePct ? `${f.ratePct}%` : f.fixedAmount ? formatCurrency(f.fixedAmount) : '—'}</TableCell>
                      <TableCell>{FEE_CALCULATION_BASE_LABELS[f.calculationBase]}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteFee.mutate(f.id)} disabled={deleteFee.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <form onSubmit={handleAddFee} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Bénéficiaire</Label>
                <Select value={feeForm.stakeholderId || undefined} onValueChange={(v) => setFeeForm((p) => ({ ...p, stakeholderId: v }))}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stakeholders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={feeForm.feeType} onValueChange={(v) => setFeeForm((p) => ({ ...p, feeType: v as FeeType }))}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FEE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feeRate">Taux (%)</Label>
                <Input id="feeRate" type="number" step="0.01" className="w-28" value={feeForm.ratePct} onChange={(e) => setFeeForm((p) => ({ ...p, ratePct: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Assiette</Label>
                <Select value={feeForm.calculationBase} onValueChange={(v) => setFeeForm((p) => ({ ...p, calculationBase: v as FeeCalculationBase }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_BASES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {FEE_CALCULATION_BASE_LABELS[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={createFee.isPending || !feeForm.stakeholderId}>
                {createFee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {stakeholders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waterfall — tiers ordonnés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {waterfallTiers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Hurdle / Catch-up / Part</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...waterfallTiers]
                    .sort((a, b) => a.order - b.order)
                    .map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.order}</TableCell>
                        <TableCell>{WATERFALL_TIER_TYPE_LABELS[t.type]}</TableCell>
                        <TableCell>{stakeholderName(t.beneficiaryStakeholderId)}</TableCell>
                        <TableCell>{t.hurdleRatePct ? `${t.hurdleRatePct}%` : t.catchUpPct ? `${t.catchUpPct}%` : t.sharePct ? `${t.sharePct}%` : '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteTier.mutate(t.id)} disabled={deleteTier.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
            <form onSubmit={handleAddTier} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tierOrder">Ordre</Label>
                <Input id="tierOrder" type="number" className="w-20" value={tierForm.order} onChange={(e) => setTierForm((p) => ({ ...p, order: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={tierForm.type} onValueChange={(v) => setTierForm((p) => ({ ...p, type: v as WaterfallTierType }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {WATERFALL_TIER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Bénéficiaire</Label>
                <Select value={tierForm.beneficiaryStakeholderId || undefined} onValueChange={(v) => setTierForm((p) => ({ ...p, beneficiaryStakeholderId: v }))}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stakeholders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tierForm.type === 'PREFERRED_RETURN' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tierHurdle">Hurdle (%)</Label>
                  <Input id="tierHurdle" type="number" step="0.1" className="w-24" value={tierForm.hurdleRatePct} onChange={(e) => setTierForm((p) => ({ ...p, hurdleRatePct: e.target.value }))} />
                </div>
              )}
              {tierForm.type === 'CATCH_UP' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tierCatchUp">Catch-up (%)</Label>
                  <Input id="tierCatchUp" type="number" step="1" className="w-24" value={tierForm.catchUpPct} onChange={(e) => setTierForm((p) => ({ ...p, catchUpPct: e.target.value }))} />
                </div>
              )}
              {(tierForm.type === 'CARRIED_INTEREST' || tierForm.type === 'RESIDUAL_SPLIT') && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tierShare">Part (%)</Label>
                  <Input id="tierShare" type="number" step="1" className="w-24" value={tierForm.sharePct} onChange={(e) => setTierForm((p) => ({ ...p, sharePct: e.target.value }))} />
                </div>
              )}
              <Button type="submit" size="sm" disabled={createTier.isPending}>
                {createTier.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
