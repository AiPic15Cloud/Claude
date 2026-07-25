import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { DEAL_STAGES, DEAL_STAGE_LABELS, type Deal, type DealStage } from '@/types';
import { DealCard } from '../components/deal-card';
import { useChangeDealStage } from '../hooks/use-deals';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface KanbanViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
}

function KanbanColumn({ stage, deals, onSelectDeal }: { stage: DealStage; deals: Deal[]; onSelectDeal: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, d) => sum + Number(d.amountTarget), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/30 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">{DEAL_STAGE_LABELS[stage]}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{deals.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={() => onSelectDeal(deal.id)} />
        ))}
        {deals.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Aucune opération</p>}
      </div>
    </div>
  );
}

export function KanbanView({ deals, onSelectDeal }: KanbanViewProps) {
  const changeStage = useChangeDealStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const targetStage = over.id as DealStage;
    const deal = deals.find((d) => d.id === active.id);
    if (deal && deal.stage !== targetStage) {
      changeStage.mutate({ id: deal.id, stage: targetStage });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-15rem)] gap-3 overflow-x-auto pb-2">
        {DEAL_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={deals.filter((d) => d.stage === stage)}
            onSelectDeal={onSelectDeal}
          />
        ))}
      </div>
    </DndContext>
  );
}
