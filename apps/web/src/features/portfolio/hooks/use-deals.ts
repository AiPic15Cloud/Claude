import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Deal, DealDetail, DealKpis, DealStage, DealStatus, DealType, PaginatedResult } from '@/types';

export interface DealsFilters {
  search?: string;
  stage?: DealStage[];
  type?: DealType[];
  tagIds?: string[];
  late?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

function buildQuery(filters: DealsFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  filters.stage?.forEach((s) => params.append('stage', s));
  filters.type?.forEach((t) => params.append('type', t));
  filters.tagIds?.forEach((t) => params.append('tagIds', t));
  if (filters.late) params.set('late', 'true');
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  params.set('pageSize', String(filters.pageSize ?? 200));
  return params.toString();
}

export function useDeals(filters: DealsFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => api.get<PaginatedResult<Deal>>(`/deals?${buildQuery(filters)}`),
  });
}

export function useDeal(dealId: string | null) {
  return useQuery({
    queryKey: ['deals', 'detail', dealId],
    queryFn: () => api.get<DealDetail>(`/deals/${dealId}`),
    enabled: Boolean(dealId),
  });
}

export function useDealKpis() {
  return useQuery({
    queryKey: ['deals', 'kpis'],
    queryFn: () => api.get<DealKpis>('/deals/kpis'),
  });
}

export interface CreateDealPayload {
  name: string;
  type: DealType;
  amountTarget: number;
  interestRate?: number;
  feesRate?: number;
  durationMonths?: number;
  city?: string;
  address?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  dateMin?: string;
  dateCible?: string;
  dateMax?: string;
  description?: string;
  tagIds?: string[];
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDealPayload) => api.post<Deal>('/deals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
    },
  });
}

export interface UpdateDealPayload {
  name?: string;
  type?: DealType;
  stage?: DealStage;
  status?: DealStatus;
  amountTarget?: number;
  amountRaised?: number;
  interestRate?: number | null;
  feesRate?: number | null;
  durationMonths?: number | null;
  city?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  dateMin?: string;
  dateCible?: string;
  dateMax?: string;
}

export function useUpdateDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDealPayload) => api.patch<Deal>(`/deals/${dealId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['market-ticker'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => api.delete(`/deals/${dealId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['market-ticker'] });
    },
  });
}

export function useChangeDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) => api.patch<Deal>(`/deals/${id}/stage`, { stage }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previous = queryClient.getQueriesData<PaginatedResult<Deal>>({ queryKey: ['deals'] });
      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<PaginatedResult<Deal>>(key, {
          ...data,
          items: data.items.map((d) => (d.id === id ? { ...d, stage } : d)),
        });
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, content, images }: { dealId: string; content: string; images?: File[] }) => {
      const form = new FormData();
      form.append('content', content);
      images?.forEach((file) => form.append('images', file));
      return api.post(`/deals/${dealId}/notes`, form);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', variables.dealId] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, noteId, content }: { dealId: string; noteId: string; content: string }) =>
      api.patch(`/deals/${dealId}/notes/${noteId}`, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', variables.dealId] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, noteId }: { dealId: string; noteId: string }) =>
      api.delete(`/deals/${dealId}/notes/${noteId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', variables.dealId] });
    },
  });
}
