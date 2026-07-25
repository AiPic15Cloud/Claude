import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthResponse, CurrentUser } from '@/types';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  firstName: string;
  lastName: string;
  organizationName: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => api.post<AuthResponse>('/auth/login', payload, { skipAuth: true }),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/cockpit', { replace: true });
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => api.post<AuthResponse>('/auth/register', payload, { skipAuth: true }),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/cockpit', { replace: true });
    },
  });
}

export function useLogout() {
  const { refreshToken, clear } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clear();
    navigate('/login', { replace: true });
  };
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await api.get<CurrentUser>('/auth/me');
      setUser(user);
      return user;
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });
}
