import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Globe, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCompetitorProjects,
  useCreateCompetitorProject,
  useUpdateCompetitorProject,
  useDeleteCompetitorProject,
  useCompetitorProjectEvents,
} from '../hooks/use-competitor-projects';
import { COMPETITOR_PROJECT_EVENT_LABELS, COMPETITOR_PROJECT_STATUS_LABELS, type CompetitorProject, type CompetitorProjectStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<CompetitorProjectStatus, 'default' | 'warning' | 'secondary'> = {
  EN_COLLECTE: 'default',
  A_VENIR: 'warning',
  CLOTURE: 'secondary',
};

const STATUS_ORDER: CompetitorProjectStatus[] = ['EN_COLLECTE', 'A_VENIR', 'CLOTURE'];

interface FormState {
  name: string;
  status: CompetitorProjectStatus;
  targetAmount: string;
  expectedDate: string;
  url: string;
  note: string;
}

const EMPTY_FORM: FormState = { name: '', status: 'EN_COLLECTE', targetAmount: '', expectedDate: '', url: '', note: '' };

export function CompetitorProjectsPanel({ entityId }: { entityId: string }) {
  const { data: projects = [], isLoading } = useCompetitorProjects(entityId);
  const { data: events = [] } = useCompetitorProjectEvents(entityId);
  const createProject = useCreateCompetitorProject(entityId);
  const updateProject = useUpdateCompetitorProject(entityId);
  const deleteProject = useDeleteCompetitorProject(entityId);
  const [showHistory, setShowHistory] = useState(false);

  const [quickName, setQuickName] = useState('');
  const [quickStatus, setQuickStatus] = useState<CompetitorProjectStatus>('EN_COLLECTE');
  const [editing, setEditing] = useState<CompetitorProject | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const handleQuickAdd = () => {
    const name = quickName.trim();
    if (!name) return;
    createProject.mutate({ name, status: quickStatus }, { onSuccess: () => setQuickName('') });
  };

  const startEdit = (project: CompetitorProject) => {
    setEditing(project);
    setForm({
      name: project.name,
      status: project.status,
      targetAmount: project.targetAmount ?? '',
      expectedDate: project.expectedDate ? project.expectedDate.slice(0, 10) : '',
      url: project.url ?? '',
      note: project.note ?? '',
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateProject.mutate(
      {
        id: editing.id,
        name: form.name.trim(),
        status: form.status,
        targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
        expectedDate: form.expectedDate || undefined,
        url: form.url || undefined,
        note: form.note || undefined,
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-input p-1.5">
        <Input
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Nom du projet…"
          className="h-8 w-full min-w-0 border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-1.5">
          <Select value={quickStatus} onValueChange={(v) => setQuickStatus(v as CompetitorProjectStatus)}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {COMPETITOR_PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            disabled={!quickName.trim() || createProject.isPending}
            onClick={handleQuickAdd}
            aria-label="Ajouter le projet"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading && <p className="py-3 text-center text-xs text-muted-foreground">Chargement…</p>}
      {!isLoading && projects.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground">Aucun projet suivi pour ce concurrent</p>
      )}

      {projects.map((project) =>
        editing?.id === project.id ? (
          <div key={project.id} className="flex flex-col gap-2 rounded-md border border-primary/40 p-2.5">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CompetitorProjectStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {COMPETITOR_PROJECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={form.expectedDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))}
              />
              <Input
                type="number"
                min={0}
                placeholder="Montant cible (€)"
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              />
              <Input
                placeholder="Lien du projet"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <Input placeholder="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={!form.name.trim() || updateProject.isPending}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div key={project.id} className="flex items-start gap-2.5 rounded-md border border-border px-2.5 py-2 hover:bg-accent/50">
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <Badge variant={STATUS_VARIANT[project.status]}>{COMPETITOR_PROJECT_STATUS_LABELS[project.status]}</Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                {project.targetAmount && <span>{formatCurrency(project.targetAmount)}</span>}
                {project.expectedDate && <span>{formatDate(project.expectedDate)}</span>}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" /> Lien
                  </a>
                )}
                {project.note && <span className="italic">{project.note}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => startEdit(project)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Modifier"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteProject.mutate(project.id)}
                className={cn('flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-destructive')}
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ),
      )}

      {events.length > 0 && (
        <div className="mt-1 border-t border-border pt-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <History className="h-3 w-3" /> {showHistory ? 'Masquer' : 'Voir'} l'historique ({events.length})
          </button>
          {showHistory && (
            <div className="mt-1.5 flex flex-col gap-1">
              {events.map((event) => (
                <p key={event.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{COMPETITOR_PROJECT_EVENT_LABELS[event.eventType]}</span> — {event.projectName} ·{' '}
                  {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true, locale: fr })}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
