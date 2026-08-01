import { ModuleStub } from "@/components/ui/ModuleStub";

export default function ResearchPage() {
  return (
    <ModuleStub
      eyebrow="Module 8"
      title="Research"
      subtitle="Moteur de veille — Banque de France, INSEE, DVF, BCE, INPI, presse, urbanisme, finance, immobilier."
      capabilities={[
        "Résumé, classification et impact potentiel pour chaque article suivi",
        "Rapprochement automatique entre une actualité et les opérations concernées",
        "Alimente directement les priorités du matin (Module Home) et la note Atlas CIO",
      ]}
    />
  );
}
