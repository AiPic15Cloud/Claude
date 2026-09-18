import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpsertProjectProfile, useUpdatePrequalificationCase, useUpsertTimeline } from '../hooks/use-prequalification';
import {
  PREQUAL_ACQUISITION_STATUS_LABELS,
  PREQUALIFICATION_PROJECT_TYPE_LABELS,
  type PrequalAcquisitionStatus,
  type PrequalificationProjectType,
  type PrequalProjectProfile,
  type PrequalTimelineAssessment,
} from '@/types';

const ACQUISITION_STATUSES = Object.keys(PREQUAL_ACQUISITION_STATUS_LABELS) as PrequalAcquisitionStatus[];
const PROJECT_TYPES = Object.keys(PREQUALIFICATION_PROJECT_TYPE_LABELS) as PrequalificationProjectType[];

/** Type d'opération (Trame Prequal — Présentation du projet) : seul champ porté par le dossier lui-même, pas le profil projet. */
function OperationTypeCard({ caseId, projectType }: { caseId: string; projectType: PrequalificationProjectType | null | undefined }) {
  const update = useUpdatePrequalificationCase(caseId);
  const [value, setValue] = useState(projectType ?? '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Type d'opération</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ projectType: (value as PrequalificationProjectType) || undefined });
          }}
          className="flex flex-col gap-3 sm:max-w-xs"
        >
          <Select value={value || undefined} onValueChange={(v) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Non renseigné" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PREQUALIFICATION_PROJECT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Button type="submit" size="sm" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Temporalité du dossier — spec §15, Trame Prequal §7 ("pour quand"). Distinct du calendrier cible du projet lui-même. */
function TimelineCard({ caseId, planning }: { caseId: string; planning: PrequalTimelineAssessment | null }) {
  const upsert = useUpsertTimeline(caseId);
  const [form, setForm] = useState({
    businessUrgencyNote: planning?.businessUrgencyNote ?? '',
    realisticTimeline: planning?.realisticTimeline ?? '',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Temporalité du dossier (pour quand)</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsert.mutate({ businessUrgencyNote: form.businessUrgencyNote || undefined, realisticTimeline: form.realisticTimeline || undefined });
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Urgence métier</Label>
              <Textarea rows={2} value={form.businessUrgencyNote} onChange={(e) => setForm((p) => ({ ...p, businessUrgencyNote: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Calendrier réaliste</Label>
              <Textarea rows={2} value={form.realisticTimeline} onChange={(e) => setForm((p) => ({ ...p, realisticTimeline: e.target.value }))} />
            </div>
          </div>
          <div>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Profil projet (Trame Prequal — Présentation du projet : Type d'opération /
 * Situation du projet / Urbanisme / Commercialisation) + Temporalité du
 * dossier. Le type d'opération vit sur le dossier lui-même (`projectType`),
 * la temporalité sur PrequalTimelineAssessment — deux upserts distincts,
 * chacun avec son propre bouton, pour ne jamais mélanger trois endpoints
 * dans un seul submit.
 */
export function ProjectTab({
  caseId,
  project,
  projectType,
  planning,
}: {
  caseId: string;
  project: PrequalProjectProfile | null;
  projectType: PrequalificationProjectType | null | undefined;
  planning: PrequalTimelineAssessment | null;
}) {
  const upsert = useUpsertProjectProfile(caseId);
  const [form, setForm] = useState({
    address: project?.address ?? '',
    city: project?.city ?? '',
    postcode: project?.postcode ?? '',
    cadastralRef: project?.cadastralRef ?? '',
    description: project?.description ?? '',
    existingSurfaceSqm: project?.existingSurfaceSqm != null ? String(project.existingSurfaceSqm) : '',
    createdSurfaceSqm: project?.createdSurfaceSqm != null ? String(project.createdSurfaceSqm) : '',
    lotCount: project?.lotCount != null ? String(project.lotCount) : '',
    acquisitionStatus: project?.acquisitionStatus ?? '',
    acquisitionPrice: project?.acquisitionPrice != null ? String(project.acquisitionPrice) : '',
    worksDescription: project?.worksDescription ?? '',
    exitStrategy: project?.exitStrategy ?? '',
    targetTimeline: project?.targetTimeline ?? '',
    urbanismeNote: project?.urbanismeNote ?? '',
    commercialisationNote: project?.commercialisationNote ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      address: form.address || undefined,
      city: form.city || undefined,
      postcode: form.postcode || undefined,
      cadastralRef: form.cadastralRef || undefined,
      description: form.description || undefined,
      existingSurfaceSqm: form.existingSurfaceSqm ? Number(form.existingSurfaceSqm) : undefined,
      createdSurfaceSqm: form.createdSurfaceSqm ? Number(form.createdSurfaceSqm) : undefined,
      lotCount: form.lotCount ? Number(form.lotCount) : undefined,
      acquisitionStatus: (form.acquisitionStatus as PrequalAcquisitionStatus) || undefined,
      acquisitionPrice: form.acquisitionPrice ? Number(form.acquisitionPrice) : undefined,
      worksDescription: form.worksDescription || undefined,
      exitStrategy: form.exitStrategy || undefined,
      targetTimeline: form.targetTimeline || undefined,
      urbanismeNote: form.urbanismeNote || undefined,
      commercialisationNote: form.commercialisationNote || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <OperationTypeCard caseId={caseId} projectType={projectType} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Situation du projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Référence cadastrale</Label>
                <Input value={form.cadastralRef} onChange={(e) => setForm((p) => ({ ...p, cadastralRef: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ville</Label>
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Code postal</Label>
                <Input value={form.postcode} onChange={(e) => setForm((p) => ({ ...p, postcode: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Surface existante (m²)</Label>
                <Input type="number" min={0} value={form.existingSurfaceSqm} onChange={(e) => setForm((p) => ({ ...p, existingSurfaceSqm: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Surface créée (m²)</Label>
                <Input type="number" min={0} value={form.createdSurfaceSqm} onChange={(e) => setForm((p) => ({ ...p, createdSurfaceSqm: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Nombre de lots</Label>
                <Input type="number" min={0} value={form.lotCount} onChange={(e) => setForm((p) => ({ ...p, lotCount: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Prix d'acquisition</Label>
                <Input type="number" min={0} value={form.acquisitionPrice} onChange={(e) => setForm((p) => ({ ...p, acquisitionPrice: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label>Statut d'acquisition</Label>
              <Select value={form.acquisitionStatus || undefined} onValueChange={(v) => setForm((p) => ({ ...p, acquisitionStatus: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  {ACQUISITION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PREQUAL_ACQUISITION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description des travaux</Label>
              <Textarea rows={2} value={form.worksDescription} onChange={(e) => setForm((p) => ({ ...p, worksDescription: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Stratégie de sortie</Label>
                <Textarea rows={2} value={form.exitStrategy} onChange={(e) => setForm((p) => ({ ...p, exitStrategy: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Calendrier cible</Label>
                <Textarea rows={2} value={form.targetTimeline} onChange={(e) => setForm((p) => ({ ...p, targetTimeline: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Urbanisme</Label>
              <Textarea rows={3} value={form.urbanismeNote} onChange={(e) => setForm((p) => ({ ...p, urbanismeNote: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Commercialisation</Label>
              <Textarea rows={3} value={form.commercialisationNote} onChange={(e) => setForm((p) => ({ ...p, commercialisationNote: e.target.value }))} />
            </div>

            <div>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <TimelineCard caseId={caseId} planning={planning} />
    </div>
  );
}
