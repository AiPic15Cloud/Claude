import { useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ExpandCardButtonProps {
  title: string;
  children: ReactNode;
}

// Cockpit widget cards sit in a 5-column row, narrow enough that long
// titles get truncated with an ellipsis. This opens the same list in a
// roomier dialog with the full, untruncated text — so reading one doesn't
// require navigating away to the deal page.
export function ExpandCardButton({ title, children }: ExpandCardButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`Agrandir ${title}`}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-3">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex flex-col gap-1 overflow-y-auto pr-1">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
