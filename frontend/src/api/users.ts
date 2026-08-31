import { apiFetch } from './client';
import type { Role, UserAccount } from './types';

export function fetchUsers() {
  return apiFetch<UserAccount[]>('/users');
}

export function createUser(input: { email: string; password: string; role: Role; professionalId?: string | null }) {
  return apiFetch<UserAccount>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateUser(id: string, input: { role?: Role; active?: boolean; professionalId?: string | null }) {
  return apiFetch<UserAccount>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function resetUserPassword(id: string, newPassword: string) {
  return apiFetch<{ message: string }>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export function requestForgotPassword(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
