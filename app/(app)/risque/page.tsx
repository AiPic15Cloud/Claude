import { ModuleStub } from "@/components/ui/ModuleStub";

export default function RiskOfficePage() {
  return (
    <ModuleStub
      eyebrow="Module 5"
      title="Risk Office"
      subtitle="Calcul automatique de l'indice de risque global chaque matin, et suivi individuel de chaque opération."
      capabilities={[
        "Indice de risque global du portefeuille, recalculé chaque matin",
        "Pour chaque opération : score, évolution, causes, probabilité, impact",
        "Actions recommandées générées automatiquement pour chaque risque identifié",
        "Historique de l'évolution du risque par dossier et par opérateur",
      ]}
    />
  );
}
