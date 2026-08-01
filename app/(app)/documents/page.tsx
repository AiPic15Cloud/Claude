import { ModuleStub } from "@/components/ui/ModuleStub";

export default function DocumentAiPage() {
  return (
    <ModuleStub
      eyebrow="Module 10"
      title="Document AI"
      subtitle="Dépose un Business Plan, un Excel, un PDF, un compromis, des plans ou des photos — Atlas lit, comprend, classe et compare."
      capabilities={[
        "Pré-analyse automatique dès le dépôt d'un document",
        "Détection des risques, incohérences et documents manquants",
        "Production automatique d'une note de comité à partir des pièces déposées",
      ]}
    />
  );
}
