import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthResponse, CurrentUser, LoginResult } from '@/types';

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
    mutationFn: (payload: LoginPayload) => api.post<LoginResult>('/auth/login', payload, { skipAuth: true }),
    onSuccess: (data) => {
      if ('requiresTwoFactor' in data) return;
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/cockpit', { replace: true });
    },
  });
}

export function useVerifyTwoFactor() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: { challengeToken: string; code: string }) =>
      api.post<AuthResponse>('/auth/2fa/verify', payload, { skipAuth: true }),
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      navigate('/cockpit', { replace: true });
    },
  });
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: () => api.post<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>('/users/me/2fa/setup'),
  });
}

export function useEnableTwoFactor() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (code: string) => api.post<{ recoveryCodes: string[] }>('/users/me/2fa/enable', { code }),
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      if (user) setUser({ ...user, twoFactorEnabled: true });
    },
  });
}

export function useDisableTwoFactor() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (password: string) => api.post<void>('/users/me/2fa/disable', { password }),
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      if (user) setUser({ ...user, twoFactorEnabled: false });
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

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: { firstName?: string; lastName?: string }) => api.patch<CurrentUser>('/users/me', payload),
    onSuccess: (user) => setUser(user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => api.patch<void>('/users/me/password', payload),
  });
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
