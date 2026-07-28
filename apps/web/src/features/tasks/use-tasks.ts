import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task } from '@/types';

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
    mutationFn: (data: { title: string; dueDate?: string; priority?: Task['priority'] }) => api.post<Task>('/tasks', data),
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
