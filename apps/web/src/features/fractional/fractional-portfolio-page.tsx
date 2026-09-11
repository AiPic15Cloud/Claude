import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFractionalProjects } from './hooks/use-fractional';
import { CreateFractionalProjectDialog } from './components/create-fractional-project-dialog';
import { FRACTIONAL_PROJECT_STATUS_LABELS } from '@/types';

/**
 * Portefeuille Fractionné (spec V3 §1) — onglet Atlas de premier niveau,
 * distinct du Pipeline/Portefeuille LPB. Visibilité au niveau organisation
 * côté API (comme les Deals) : cette liste montre tous les dossiers de
 * l'organisation, pas seulement ceux créés par l'utilisateur courant.
 */
export function FractionalPortfolioPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useFractionalProjects();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fractionné"
        description="Underwriting institutionnel des opérations en participation/exploitation — distinct des dossiers de dette LPB."
        actions={<CreateFractionalProjectDialog />}
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {!isLoading && projects?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p>Aucun dossier Fractionné pour l'instant.</p>
            <CreateFractionalProjectDialog />
          </CardContent>
        </Card>
      )}

      {!isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/fractional/${project.id}`)}
            >
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">{project.name}</span>
                    <span className="text-xs text-muted-foreground">{project.reference}</span>
                  </div>
                  <Badge variant="outline">{FRACTIONAL_PROJECT_STATUS_LABELS[project.status]}</Badge>
                </div>
                {project.perimeterLabel && <span className="text-xs text-muted-foreground">Périmètre : {project.perimeterLabel}</span>}
                {project.city && <span className="text-xs text-muted-foreground">{project.city}</span>}
                {project.createdBy && (
                  <span className="text-xs text-muted-foreground">
                    Créé par {project.createdBy.firstName} {project.createdBy.lastName}
                  </span>
                )}
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{project._count?.leases ?? 0} bail(x)</span>
                  <span>{project._count?.capexItems ?? 0} CAPEX</span>
                  <span>{project._count?.valuations ?? 0} valorisation(s)</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
