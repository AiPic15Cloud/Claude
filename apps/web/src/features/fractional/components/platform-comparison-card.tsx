import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFractionalPlatformComparison } from '../hooks/use-fractional';

/**
 * Comparatif de plateformes formalisé (spec Cockpit/Fractionné P2 §5.3) —
 * une matrice critère × candidature plutôt qu'une comparaison informelle.
 * Un critère non communiqué par une plateforme reste "à confirmer", jamais
 * silencieusement absent (spec §5.3).
 */
export function PlatformComparisonCard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFractionalPlatformComparison(projectId);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!data || data.candidateLabels.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comparatif des plateformes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Critère</TableHead>
                {data.candidateLabels.map((label, i) => (
                  <TableHead key={data.candidateIds[i]}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {row.values.map((value, i) => (
                    <TableCell key={data.candidateIds[i]} className={value === null ? 'text-muted-foreground' : undefined}>
                      {value === null ? 'À confirmer' : value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
