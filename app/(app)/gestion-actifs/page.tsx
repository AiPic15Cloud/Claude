import { ModuleStub } from "@/components/ui/ModuleStub";

export default function AssetManagementPage() {
  return (
    <ModuleStub
      eyebrow="Module 6"
      title="Asset Management"
      subtitle="Suivi opérationnel de chaque actif financé — chaque retard déclenche automatiquement une alerte et une tâche."
      capabilities={[
        "Suivi des travaux et de la commercialisation, actif par actif",
        "Votes de copropriété, newsletters, contentieux, garanties, assurances",
        "Échéances et trésorerie prévisionnelle par opération",
        "Déclenchement automatique d'une alerte à chaque retard constaté",
      ]}
    />
  );
}
