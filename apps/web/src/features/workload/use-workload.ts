import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WorkloadEntry } from '@/types';

/** Charge de travail par analyste (spec gestion de projet) — une ligne par analyste ayant au moins une tâche ouverte. */
export function useWorkload() {
  return useQuery({
    queryKey: ['workload'],
    queryFn: () => api.get<WorkloadEntry[]>('/workload'),
  });
}
