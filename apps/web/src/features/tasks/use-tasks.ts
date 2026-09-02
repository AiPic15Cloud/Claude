import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, TaskType } from '@/types';

/** Tâches d'un dossier — pour le calibrage de la charge par projet (onglet Tâches de la fiche dossier). */
export function useDealTasks(dealId: string) {
  return useQuery({
    queryKey: ['tasks', 'deal', dealId],
    queryFn: () => api.get<Task[]>(`/deals/${dealId}/tasks`),
    enabled: !!dealId,
  });
}

/** Vue transversale portefeuille (spec ATLAS v2, F.1) — toutes les tâches ouvertes, tous dossiers confondus. */
export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.get<Task[]>('/tasks?scope=all'),
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<Task>(`/tasks/${id}`, { done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; dueDate?: string; priority?: Task['priority']; dealId?: string; typeTache?: TaskType }) =>
      api.post<Task>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export type KanbanColumn = 'A_FAIRE' | 'EN_COURS' | 'TERMINE';

/** Déplacement d'une carte entre colonnes du Kanban (spec ATLAS v2, F.1) — un seul PATCH atomique plutôt que deux appels enchaînés (done puis inProgress). */
export function useMoveTaskToColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, column }: { id: string; column: KanbanColumn }) =>
      api.patch<Task>(`/tasks/${id}`, column === 'TERMINE' ? { done: true } : { done: false, inProgress: column === 'EN_COURS' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: Task['priority'] }) =>
      api.patch<Task>(`/tasks/${id}`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; title?: string; dueDate?: string; priority?: Task['priority']; typeTache?: TaskType }) =>
      api.patch<Task>(`/tasks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
