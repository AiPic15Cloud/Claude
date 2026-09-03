import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateDeal } from '@/features/portfolio/hooks/use-deals';
import { useDpe } from '../hooks/use-risk-data';
import { ESG_ASSESSMENT_LABELS, type Deal, type EsgAssessment } from '@/types';

const esgSchema = z.object({
  esgMateriauxBasCarbone: z.union([z.enum(['OUI', 'NON', 'INCONNU']), z.literal('')]),
  esgGestionEauxPluviales: z.string().optional(),
  esgEmploisChantierEstimes: z.union([z.number(), z.nan()]).optional(),
  esgAccessibilite: z.string().optional(),
  esgConformiteReglementaire: z.union([z.enum(['OUI', 'NON', 'INCONNU']), z.literal('')]),
  esgNotes: z.string().optional(),
});

type EsgFormValues = z.infer<typeof esgSchema>;

/**
 * Dimension ESG (spec complémentaire ATLAS, D.3) — volontairement simple :
 * familiarisation au vocabulaire ESG, pas un scoring normé. Champs
 * strictement additifs, sans lien avec le score de risque (A.2) ni aucun
 * calcul existant. Le DPE (ADEME) est affiché en lecture seule ici — donnée
 * déjà collectée par ailleurs (RiskDataService), jamais ressaisie.
 */
export function EsgPanel({ deal }: { deal: Deal }) {
  const dpe = useDpe(deal.id, Boolean(deal.postcode));
  const updateDeal = useUpdateDeal(deal.id);

  const { register, control, handleSubmit, reset } = useForm<EsgFormValues>({
    resolver: zodResolver(esgSchema),
    defaultValues: {
      esgMateriauxBasCarbone: deal.esgMateriauxBasCarbone ?? '',
      esgGestionEauxPluviales: deal.esgGestionEauxPluviales ?? '',
      esgEmploisChantierEstimes: deal.esgEmploisChantierEstimes ?? undefined,
      esgAccessibilite: deal.esgAccessibilite ?? '',
      esgConformiteReglementaire: deal.esgConformiteReglementaire ?? '',
      esgNotes: deal.esgNotes ?? '',
    },
  });

  useEffect(() => {
    reset({
      esgMateriauxBasCarbone: deal.esgMateriauxBasCarbone ?? '',
      esgGestionEauxPluviales: deal.esgGestionEauxPluviales ?? '',
      esgEmploisChantierEstimes: deal.esgEmploisChantierEstimes ?? undefined,
      esgAccessibilite: deal.esgAccessibilite ?? '',
      esgConformiteReglementaire: deal.esgConformiteReglementaire ?? '',
      esgNotes: deal.esgNotes ?? '',
    });
  }, [deal, reset]);

  const onSubmit = (values: EsgFormValues) => {
    updateDeal.mutate({
      esgMateriauxBasCarbone: values.esgMateriauxBasCarbone === '' ? null : (values.esgMateriauxBasCarbone as EsgAssessment),
      esgGestionEauxPluviales: values.esgGestionEauxPluviales || null,
      esgEmploisChantierEstimes: values.esgEmploisChantierEstimes !== undefined && !Number.isNaN(values.esgEmploisChantierEstimes) ? values.esgEmploisChantierEstimes : null,
      esgAccessibilite: values.esgAccessibilite || null,
      esgConformiteReglementaire: values.esgConformiteReglementaire === '' ? null : (values.esgConformiteReglementaire as EsgAssessment),
      esgNotes: values.esgNotes || null,
    });
  };

  const assessmentOptions: EsgAssessment[] = ['OUI', 'NON', 'INCONNU'];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Familiarisation au vocabulaire ESG (transition énergétique, mission "due diligence ESG interne") — ce n'est pas
        un scoring normé (taxonomie européenne/SFDR) et n'a aucun impact sur le score de risque ATLAS.
      </p>

      {deal.esgCompleteness && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
          <Badge variant={deal.esgCompleteness.pct >= 50 ? 'secondary' : 'warning'}>
            Complétude ESG : {deal.esgCompleteness.filled}/{deal.esgCompleteness.total}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Environnement {deal.esgCompleteness.environnement.filled}/{deal.esgCompleteness.environnement.total} · Social{' '}
            {deal.esgCompleteness.social.filled}/{deal.esgCompleteness.social.total} · Gouvernance{' '}
            {deal.esgCompleteness.gouvernance.filled}/{deal.esgCompleteness.gouvernance.total}
          </span>
          <span className="text-xs text-muted-foreground">
            — mesure l'effort de documentation, jamais la qualité de l'actif.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environnement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Performance énergétique (DPE)</Label>
            {dpe.isLoading ? (
              <p className="text-xs text-muted-foreground">Recherche en cours…</p>
            ) : dpe.data?.label ? (
              <p className="text-sm">
                Étiquette énergie <span className="font-semibold">{dpe.data.label}</span>
                {dpe.data.ghgLabel && <> · GES <span className="font-semibold">{dpe.data.ghgLabel}</span></>}
                {dpe.data.date && <span className="text-xs text-muted-foreground"> (diagnostic du {dpe.data.date})</span>}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun DPE trouvé via l'ADEME pour l'adresse de ce dossier.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Matériaux/techniques bas-carbone</Label>
            <Controller
              control={control}
              name="esgMateriauxBasCarbone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                  <SelectContent>
                    {assessmentOptions.map((v) => (
                      <SelectItem key={v} value={v}>{ESG_ASSESSMENT_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="esgGestionEauxPluviales" className="text-xs text-muted-foreground">
              Consommation d'eau / gestion des eaux pluviales (le cas échéant)
            </Label>
            <Textarea id="esgGestionEauxPluviales" rows={2} {...register('esgGestionEauxPluviales')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Social</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="esgEmploisChantierEstimes" className="text-xs text-muted-foreground">Emplois chantier estimés</Label>
            <Input id="esgEmploisChantierEstimes" type="number" min={0} {...register('esgEmploisChantierEstimes', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="esgAccessibilite" className="text-xs text-muted-foreground">Accessibilité (PMR, mixité sociale si logement)</Label>
            <Textarea id="esgAccessibilite" rows={2} {...register('esgAccessibilite')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gouvernance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Transparence du porteur (SIREN, surveillance) — voir l'onglet Intervenants
            </Label>
            <p className="text-sm">
              {deal.porteurSiren ? `SIREN ${deal.porteurSiren}` : 'SIREN non renseigné'}
              {deal.porteurMonitoringStatus && ` · statut ${deal.porteurMonitoringStatus}`}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Conformité réglementaire (permis, autorisations)</Label>
            <Controller
              control={control}
              name="esgConformiteReglementaire"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                  <SelectContent>
                    {assessmentOptions.map((v) => (
                      <SelectItem key={v} value={v}>{ESG_ASSESSMENT_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="esgNotes" className="text-xs text-muted-foreground">Notes ESG libres</Label>
        <Textarea id="esgNotes" rows={3} {...register('esgNotes')} />
      </div>

      <Button type="button" onClick={handleSubmit(onSubmit)} disabled={updateDeal.isPending} className="self-end">
        {updateDeal.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Enregistrer
      </Button>
    </div>
  );
}
