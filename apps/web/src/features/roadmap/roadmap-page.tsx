import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function RoadmapPage() {
  const location = useLocation();
  const moduleName = (location.state as { module?: string } | null)?.module;

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Construction className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold">
            {moduleName ? `Module « ${moduleName} »` : 'Module'} en développement
          </h2>
          <p className="text-sm text-muted-foreground">
            Ce module fait partie de la feuille de route ATLAS et sera livré dans une prochaine phase.
            Le socle technique (authentification, données, design system) est déjà en place pour l'accueillir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
