import { apiFetch } from './client';
import type { SystemSettings } from './types';

export function fetchSettings() {
  return apiFetch<SystemSettings>('/settings');
}

export function updateSettings(input: { salonName: string; logoUrl?: string | null; accentColor?: string | null }) {
  return apiFetch<SystemSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
