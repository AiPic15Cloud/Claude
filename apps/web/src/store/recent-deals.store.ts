import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentDeal {
  id: string;
  name: string;
}

const MAX_RECENT = 4;

interface RecentDealsState {
  deals: RecentDeal[];
  addRecentDeal: (deal: RecentDeal) => void;
}

// Purement local à l'appareil (jamais synchronisé) — sert uniquement le raccourci
// "Récents" du Portefeuille mobile pour rouvrir un dossier déjà consulté sans
// retaper son nom, pas une source de vérité applicative.
export const useRecentDealsStore = create<RecentDealsState>()(
  persist(
    (set) => ({
      deals: [],
      addRecentDeal: (deal) =>
        set((state) => ({
          deals: [deal, ...state.deals.filter((d) => d.id !== deal.id)].slice(0, MAX_RECENT),
        })),
    }),
    { name: 'atlas-recent-deals' },
  ),
);
