import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MarketDigest {
  available: boolean;
  reason?: 'not_configured' | 'no_articles' | 'error';
  bullets: string[];
  generatedAt: string | null;
}

export function useMarketDigest() {
  return useQuery({
    queryKey: ['market-intelligence', 'digest'],
    queryFn: () => api.get<MarketDigest>('/market-intelligence/digest'),
    staleTime: 60 * 60_000,
  });
}
