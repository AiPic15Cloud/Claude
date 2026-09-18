import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PREQUALIFICATION_STATUS_LABELS } from '@/types';
import { usePrequalificationCase } from './hooks/use-prequalification';
import { DecisionTab } from './components/decision-tab';
import { PeopleTab } from './components/people-tab';
import { CompaniesTab } from './components/companies-tab';
import { ProjectTab } from './components/project-tab';
import { FinancialTab } from './components/financial-tab';
import { LotsTab } from './components/lots-tab';
import { DocumentsTab } from './components/documents-tab';
import { FindingsTab } from './components/findings-tab';
import { QuestionsTab } from './components/questions-tab';
import { ExposureTab } from './components/exposure-tab';
import { HistoryTab } from './components/history-tab';
import { MarketTab } from './components/market-tab';
import { StressTestsTab } from './components/stress-tests-tab';
import { PrequalMemoPrintSheet } from './components/prequal-memo-print-sheet';

/**
 * Dossier de préqualification (spec §15) — les 16 sections de la spec sont
 * regroupées en onglets.
 */
export function PrequalificationCasePage() {
  const { id } = useParams<{ id: string }>();
  const { data: prequalCase, isLoading } = usePrequalificationCase(id ?? null);

  if (isLoading || !prequalCase) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/prequalification">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{prequalCase.name}</h1>
              <Badge variant="outline">{PREQUALIFICATION_STATUS_LABELS[prequalCase.status]}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">Version {prequalCase.version}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Export pré-comité
        </Button>
      </div>
      <PrequalMemoPrintSheet prequalCase={prequalCase} />

      <Tabs defaultValue="decision">
        <TabsList className="flex-wrap">
          <TabsTrigger value="decision">Décision</TabsTrigger>
          <TabsTrigger value="people">Porteurs ({prequalCase.people.length})</TabsTrigger>
          <TabsTrigger value="companies">Sociétés ({prequalCase.companies.length})</TabsTrigger>
          <TabsTrigger value="project">Projet</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
          <TabsTrigger value="lots">Lots ({prequalCase.lots.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({prequalCase.documents.length})</TabsTrigger>
          <TabsTrigger value="findings">Findings ({prequalCase.findings.length})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({prequalCase.questions.length})</TabsTrigger>
          <TabsTrigger value="exposition">Exposition</TabsTrigger>
          <TabsTrigger value="marche">Marché</TabsTrigger>
          <TabsTrigger value="stress">Stress tests</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="decision">
          <DecisionTab
            caseId={prequalCase.id}
            version={prequalCase.version}
            currentOrientation={prequalCase.orientation}
            findings={prequalCase.findings}
            promotedDealId={prequalCase.promotedDealId}
            promotedVersionNumber={prequalCase.promotedVersionNumber}
            analystImpressionNote={prequalCase.analystImpressionNote}
          />
        </TabsContent>

        <TabsContent value="people">
          <PeopleTab caseId={prequalCase.id} people={prequalCase.people} />
        </TabsContent>

        <TabsContent value="companies">
          <CompaniesTab caseId={prequalCase.id} companies={prequalCase.companies} />
        </TabsContent>

        <TabsContent value="project">
          <ProjectTab caseId={prequalCase.id} project={prequalCase.project} projectType={prequalCase.projectType} planning={prequalCase.planning} />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialTab caseId={prequalCase.id} financial={prequalCase.financial} />
        </TabsContent>

        <TabsContent value="lots">
          <LotsTab caseId={prequalCase.id} lots={prequalCase.lots} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab caseId={prequalCase.id} documents={prequalCase.documents} requests={prequalCase.requests} />
        </TabsContent>

        <TabsContent value="findings">
          <FindingsTab caseId={prequalCase.id} findings={prequalCase.findings} />
        </TabsContent>

        <TabsContent value="questions">
          <QuestionsTab caseId={prequalCase.id} questions={prequalCase.questions} />
        </TabsContent>

        <TabsContent value="exposition">
          <ExposureTab caseId={prequalCase.id} />
        </TabsContent>

        <TabsContent value="marche">
          <MarketTab caseId={prequalCase.id} />
        </TabsContent>

        <TabsContent value="stress">
          <StressTestsTab caseId={prequalCase.id} />
        </TabsContent>

        <TabsContent value="historique">
          <HistoryTab caseId={prequalCase.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
