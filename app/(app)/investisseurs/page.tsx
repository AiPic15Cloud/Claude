import { ModuleStub } from "@/components/ui/ModuleStub";

export default function InvestorRelationsPage() {
  return (
    <ModuleStub
      eyebrow="Module 7"
      title="Investor Relations"
      subtitle="Génération automatique des rapports de performance, même sans investisseurs externes actifs aujourd'hui."
      capabilities={[
        "Rapport mensuel, trimestriel et annuel généré automatiquement",
        "Performance, cashflow, TRI, TVPI, DPI, Multiple par véhicule et par dossier",
        "Export prêt à diffuser aux investisseurs et partenaires bancaires",
      ]}
    />
  );
}
