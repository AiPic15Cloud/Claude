import { useIsMobile } from '@/lib/use-is-mobile';
import { MobileCockpitPage } from './mobile-cockpit-page';
import { DesktopCockpitPage } from './desktop-cockpit-page';

// Même doctrine que Portfolio : deux écrans distincts plutôt qu'un seul
// composant à coups de `hidden md:*` — voir mobile-cockpit-page.tsx pour la
// raison (le desktop garde ~15 blocs d'analyse, le mobile n'affiche que ce
// qui a besoin d'action aujourd'hui).
export function CockpitPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCockpitPage /> : <DesktopCockpitPage />;
}
