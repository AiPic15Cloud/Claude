import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAddNote } from '@/features/portfolio/hooks/use-deals';
import { useAuthenticatedImage } from '@/lib/use-authenticated-image';
import type { Note, NoteImage } from '@/types';

const MAX_IMAGES = 6;

function NoteThumbnail({ image, onClick }: { image: NoteImage; onClick: () => void }) {
  const src = useAuthenticatedImage(image.url);
  return (
    <button type="button" onClick={onClick} disabled={!src}>
      <img
        src={src}
        alt=""
        className="h-20 w-20 rounded-md border border-border bg-secondary object-cover transition-opacity hover:opacity-80"
      />
    </button>
  );
}

function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  const src = useAuthenticatedImage(url);
  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">Image de la note</DialogTitle>
        {src && <img src={src} alt="" className="max-h-[80vh] w-full rounded-md object-contain" />}
      </DialogContent>
    </Dialog>
  );
}

export function NotesPanel({ dealId, notes }: { dealId: string; notes: Note[] }) {
  const addNote = useAddNote();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_IMAGES));
  };

  const previewUrls = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  const submit = () => {
    if (!content.trim()) return;
    addNote.mutate(
      { dealId, content: content.trim(), images },
      {
        onSuccess: () => {
          setContent('');
          setImages([]);
        },
      },
    );
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
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((file, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                  <img src={previewUrls[i]} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Photo{images.length > 0 ? ` (${images.length}/${MAX_IMAGES})` : ''}
            </Button>
            <Button size="sm" onClick={submit} disabled={!content.trim() || addNote.isPending}>
              {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publier
            </Button>
          </div>
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
                {note.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.images.map((image) => (
                      <NoteThumbnail key={image.id} image={image} onClick={() => setLightbox(image.url)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </Card>
  );
}
