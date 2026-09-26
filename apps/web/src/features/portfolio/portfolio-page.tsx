import { useIsMobile } from '@/lib/use-is-mobile';
import { MobilePortfolioPage } from './mobile-portfolio-page';
import { DesktopPortfolioPage } from './desktop-portfolio-page';

// Deux écrans distincts (voir leur commentaire d'en-tête respectif) plutôt
// qu'un seul composant à coups de `hidden md:*` : la doctrine mobile diffère
// trop du desktop (données affichées, chemins de navigation) pour partager
// une même arborescence de hooks sans déclencher des appels API inutiles
// des deux côtés.
export function PortfolioPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobilePortfolioPage /> : <DesktopPortfolioPage />;
}
