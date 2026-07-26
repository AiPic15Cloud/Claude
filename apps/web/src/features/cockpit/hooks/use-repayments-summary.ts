import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RepaymentsSummary } from '@/types';

export function useRepaymentsSummary(year: number) {
  return useQuery({
    queryKey: ['repayments-summary', year],
    queryFn: () => api.get<RepaymentsSummary>(`/repayments/summary?year=${year}`),
  });
}
