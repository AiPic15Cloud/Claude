import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDealKpis } from '@/features/portfolio/hooks/use-deals';
import { DEAL_TYPE_LABELS, type DealType } from '@/types';

const TYPE_ORDER: DealType[] = ['MARCHAND_DE_BIENS', 'PROMOTION', 'CROWDFUNDING', 'FRACTIONNE', 'AUTRE'];
const TYPE_COLOR: Record<DealType, string> = {
  MARCHAND_DE_BIENS: 'hsl(var(--chart-accent))',
  PROMOTION: 'hsl(var(--chart-2))',
  CROWDFUNDING: 'hsl(var(--chart-3))',
  FRACTIONNE: 'hsl(var(--chart-4))',
  AUTRE: 'hsl(var(--chart-5))',
};

export function DealTypeDonutCard() {
  const { data, isLoading } = useDealKpis();

  const rows = TYPE_ORDER.map((type) => ({ type, count: data?.byType?.[type] ?? 0 })).filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Répartition par type</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : total === 0 ? (
          <p className="w-full py-8 text-center text-xs text-muted-foreground">Aucun dossier actif.</p>
        ) : (
          <>
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="count" nameKey="type" innerRadius="65%" outerRadius="100%" paddingAngle={2} stroke="none">
                    {rows.map((r) => (
                      <Cell key={r.type} fill={TYPE_COLOR[r.type]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, _name, entry) => [`${value} dossier${value > 1 ? 's' : ''}`, DEAL_TYPE_LABELS[entry.payload.type as DealType]]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {rows.map((r) => (
                <div key={r.type} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLOR[r.type] }} />
                  <span className="flex-1 truncate">{DEAL_TYPE_LABELS[r.type]}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{Math.round((r.count / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
