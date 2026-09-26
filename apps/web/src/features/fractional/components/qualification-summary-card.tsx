import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateFractionalQualification } from '../hooks/use-fractional';
import type { FractionalProject } from '@/types';

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Fiche de décision courte (spec Cockpit/Fractionné P1 §5.2) — produite à la
 * sortie de la qualification : thèse, trois atouts et trois risques maximum,
 * questions à résoudre, prochaine action et responsable. Distincte de
 * l'analyse approfondie des autres onglets, éditable à tout moment.
 */
export function QualificationSummaryCard({ project }: { project: FractionalProject }) {
  const currentUser = useAuthStore((s) => s.user);
  const update = useUpdateFractionalQualification();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    qualificationThesis: project.qualificationThesis ?? '',
    strengths: project.qualificationStrengths.join('\n'),
    risks: project.qualificationRisks.join('\n'),
    questions: project.qualificationOpenQuestions.join('\n'),
    nextActionLabel: project.nextActionLabel ?? '',
  });

  const hasContent =
    project.qualificationThesis || project.qualificationStrengths.length > 0 || project.qualificationRisks.length > 0 || project.nextActionLabel;

  const startEdit = () => {
    setForm({
      qualificationThesis: project.qualificationThesis ?? '',
      strengths: project.qualificationStrengths.join('\n'),
      risks: project.qualificationRisks.join('\n'),
      questions: project.qualificationOpenQuestions.join('\n'),
      nextActionLabel: project.nextActionLabel ?? '',
    });
    setEditing(true);
  };

  const toLines = (v: string, max?: number) => {
    const lines = v.split('\n').map((l) => l.trim()).filter(Boolean);
    return max ? lines.slice(0, max) : lines;
  };

  const handleSave = () => {
    update.mutate(
      {
        id: project.id,
        qualificationThesis: form.qualificationThesis || undefined,
        qualificationStrengths: toLines(form.strengths, 3),
        qualificationRisks: toLines(form.risks, 3),
        qualificationOpenQuestions: toLines(form.questions),
        nextActionLabel: form.nextActionLabel || undefined,
        nextActionOwnerId: form.nextActionLabel ? (project.nextActionOwnerId ?? currentUser?.id) : undefined,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (!editing && !hasContent) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm text-muted-foreground">Pas encore de fiche de décision courte pour ce dossier.</p>
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Qualifier
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fiche de décision courte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thesis">Thèse</Label>
            <Textarea id="thesis" rows={2} value={form.qualificationThesis} onChange={(e) => setForm((f) => ({ ...f, qualificationThesis: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="strengths">Atouts (3 max, un par ligne)</Label>
              <Textarea id="strengths" rows={3} value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="risks">Risques (3 max, un par ligne)</Label>
              <Textarea id="risks" rows={3} value={form.risks} onChange={(e) => setForm((f) => ({ ...f, risks: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="questions">Questions à résoudre (une par ligne)</Label>
            <Textarea id="questions" rows={2} value={form.questions} onChange={(e) => setForm((f) => ({ ...f, questions: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nextAction">Prochaine action</Label>
            <Input id="nextAction" value={form.nextActionLabel} onChange={(e) => setForm((f) => ({ ...f, nextActionLabel: e.target.value }))} placeholder="ex: Choisir une plateforme" />
            {form.nextActionLabel && <p className="text-xs text-muted-foreground">Responsable : {project.nextActionOwnerId ? 'déjà assigné' : `${currentUser?.firstName} ${currentUser?.lastName}`}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Fiche de décision courte</CardTitle>
        <Button size="sm" variant="ghost" onClick={startEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {project.qualificationThesis && <p className="text-sm">{project.qualificationThesis}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Atouts</p>
            <BulletList items={project.qualificationStrengths} emptyLabel="Aucun atout renseigné." />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Risques</p>
            <BulletList items={project.qualificationRisks} emptyLabel="Aucun risque renseigné." />
          </div>
        </div>
        {project.qualificationOpenQuestions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Questions à résoudre</p>
            <BulletList items={project.qualificationOpenQuestions} emptyLabel="" />
          </div>
        )}
        {project.nextActionLabel && (
          <p className="text-sm">
            <span className="font-medium">Prochaine action : </span>
            {project.nextActionLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
