import { ModuleStub } from "@/components/ui/ModuleStub";

export default function MarketIntelligencePage() {
  return (
    <ModuleStub
      eyebrow="Module 12"
      title="Market Intelligence"
      subtitle="Cartes, heatmaps, comparables, transactions, tension locative, construction, démographie, permis, vacance, prix."
      capabilities={[
        "Cartographie et heatmaps par région et par typologie",
        "Comparables de transactions et évolution des prix",
        "Tension locative, permis de construire, vacance, démographie",
      ]}
    />
  );
}
