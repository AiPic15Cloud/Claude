import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAddNote } from '@/features/portfolio/hooks/use-deals';
import type { Note } from '@/types';

export function NotesPanel({ dealId, notes }: { dealId: string; notes: Note[] }) {
  const addNote = useAddNote();
  const [content, setContent] = useState('');

  const submit = () => {
    if (!content.trim()) return;
    addNote.mutate({ dealId, content: content.trim() }, { onSuccess: () => setContent('') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes ({notes.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Ajouter une note sur cette opération…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <Button size="sm" className="self-end" onClick={submit} disabled={!content.trim() || addNote.isPending}>
            {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publier
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {notes.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucune note pour l'instant</p>}
          {notes.map((note) => (
            <div key={note.id} className="flex gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {note.author ? `${note.author.firstName[0]}${note.author.lastName[0]}` : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-md bg-secondary/50 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    {note.author ? `${note.author.firstName} ${note.author.lastName}` : 'Utilisateur'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <p className="mt-1 text-sm">{note.content}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
