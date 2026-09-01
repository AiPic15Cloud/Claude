import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DvfTransaction {
  date: string | null;
  address: string | null;
  type: string | null;
  surface: number | null;
  rooms: number | null;
  price: number | null;
  pricePerSqm: number | null;
}

export interface DvfSearchResult {
  query: string;
  commune: { name: string; codeInsee: string; postcode: string } | null;
  transactions: DvfTransaction[];
  averagePricePerSqm: number | null;
  medianPricePerSqm: number | null;
  sampleSize: number;
}

export function useDvfSearch() {
  return useMutation({
    mutationFn: (q: string) => api.get<DvfSearchResult>(`/market-intelligence/dvf-search?q=${encodeURIComponent(q)}`),
  });
}
