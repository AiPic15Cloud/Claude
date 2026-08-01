import { ModuleStub } from "@/components/ui/ModuleStub";

export default function KnowledgePage() {
  return (
    <ModuleStub
      eyebrow="Module 9"
      title="Knowledge"
      subtitle="Mémoire permanente d'Estrella Capital — analyses, décisions, mails, notes, newsletters, jurisprudences, recherches."
      capabilities={[
        "Recherche intelligente sur l'ensemble de la mémoire de la société de gestion",
        "Journal des décisions : comparaison des risques identifiés vs. risques réellement observés",
        "Calcul de la qualité des décisions d'investissement dans le temps",
      ]}
    />
  );
}
