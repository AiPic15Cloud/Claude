import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FRACTIONAL_PROJECT_STATUS_LABELS, type FractionalProjectStatus } from '@/types';
import { useFractionalProject, useFractionalSynthese, useUpdateFractionalProjectStatus } from './hooks/use-fractional';
import { SyntheseTab } from './components/synthese-tab';
import { AcquisitionTab } from './components/acquisition-tab';
import { LocatifTab } from './components/locatif-tab';
import { StructureTab } from './components/structure-tab';

const STATUSES: FractionalProjectStatus[] = ['ANALYSE', 'STRUCTURATION', 'VALIDATION_PLATEFORME', 'COLLECTE', 'ACQUISITION', 'EXPLOITATION', 'SORTIE', 'REFUSE', 'ABANDONNE'];

export function FractionalProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('synthese');
  const { data: project, isLoading } = useFractionalProject(id ?? null);
  const { data: synthese, isLoading: syntheseLoading } = useFractionalSynthese(id ?? null);
  const updateStatus = useUpdateFractionalProjectStatus();

  if (isLoading || !project) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/fractional">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {project.perimeterLabel && <Badge variant="outline">{project.perimeterLabel}</Badge>}
            </div>
            <span className="text-sm text-muted-foreground">{project.reference}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Select value={project.status} onValueChange={(status) => updateStatus.mutate({ id: project.id, status: status as FractionalProjectStatus })}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {FRACTIONAL_PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="locatif">Locatif ({project.leases.length})</TabsTrigger>
          <TabsTrigger value="structure">Structure & Sortie</TabsTrigger>
        </TabsList>

        <TabsContent value="synthese">
          {syntheseLoading && <Skeleton className="h-64" />}
          {!syntheseLoading && !synthese && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Saisissez d'abord les Sources & Uses (onglet Acquisition) pour calculer la synthèse.
              </CardContent>
            </Card>
          )}
          {synthese && <SyntheseTab synthese={synthese} />}
        </TabsContent>

        <TabsContent value="acquisition">
          <AcquisitionTab projectId={project.id} sourcesUses={project.sourcesUses} />
        </TabsContent>

        <TabsContent value="locatif">
          <LocatifTab projectId={project.id} leases={project.leases} leaseAssessments={synthese?.base.leaseSecurity.assessments} />
        </TabsContent>

        <TabsContent value="structure">
          <StructureTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
