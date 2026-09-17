import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateDecisiveQuestion, useAnswerDecisiveQuestion } from '../hooks/use-prequalification';
import type { PrequalDecisiveQuestion } from '@/types';

const PRIORITIES = ['blocking', 'decisive', 'instruction', 'comfort'] as const;
const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  blocking: 'Bloquante',
  decisive: 'Décisive',
  instruction: 'Instruction',
  comfort: 'Confort',
};

/** Questions décisives (spec §14) : ce qui reste à trancher avant la décision, avec l'impact potentiel sur l'orientation. */
export function QuestionsTab({ caseId, questions }: { caseId: string; questions: PrequalDecisiveQuestion[] }) {
  const create = useCreateDecisiveQuestion(caseId);
  const answer = useAnswerDecisiveQuestion(caseId);
  const [form, setForm] = useState({ question: '', reason: '', answerCouldChangeOrientation: true, priority: 'decisive' as (typeof PRIORITIES)[number] });
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question || !form.reason) return;
    create.mutate(form, { onSuccess: () => setForm({ ...form, question: '', reason: '' }) });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Questions décisives</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {questions.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucune question décisive pour l'instant.</p>}
          {questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-1.5 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{PRIORITY_LABELS[q.priority]}</Badge>
                {q.answerCouldChangeOrientation && <Badge variant="secondary">Peut changer l'orientation</Badge>}
                {q.answer && <Badge className="ml-auto">Répondue</Badge>}
              </div>
              <p className="text-sm font-medium">{q.question}</p>
              <p className="text-xs text-muted-foreground">{q.reason}</p>
              {q.answer ? (
                <p className="mt-1 rounded bg-muted p-2 text-xs">{q.answer}</p>
              ) : (
                <div className="mt-1 flex gap-2">
                  <Input
                    placeholder="Réponse"
                    value={answerDrafts[q.id] ?? ''}
                    onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!answerDrafts[q.id] || answer.isPending}
                    onClick={() => answer.mutate({ questionId: q.id, answer: answerDrafts[q.id] })}
                  >
                    Répondre
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajouter une question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Question</Label>
              <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pourquoi c'est décisif</Label>
              <Textarea rows={2} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as (typeof PRIORITIES)[number] }))}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.answerCouldChangeOrientation} onCheckedChange={(v) => setForm((p) => ({ ...p, answerCouldChangeOrientation: v }))} />
                <Label>Peut changer l'orientation</Label>
              </div>
            </div>
            <div>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
