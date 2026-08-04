import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RepaymentWithDeal } from '@/types';

export function useRepaymentsList(year: number) {
  return useQuery({
    queryKey: ['repayments-list', year],
    queryFn: () => api.get<RepaymentWithDeal[]>(`/repayments?year=${year}`),
  });
}
