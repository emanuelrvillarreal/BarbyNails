import { apiFetch } from './client';
import type { Professional, Service, ServiceCategory } from './types';

export function fetchProfessionals() {
  return apiFetch<Professional[]>('/professionals');
}

export function fetchCategories() {
  return apiFetch<ServiceCategory[]>('/catalog/categories');
}

export function createCategory(input: { name: string; displayOrder: number }) {
  return apiFetch<ServiceCategory>('/catalog/categories', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: Partial<{ name: string; displayOrder: number; active: boolean }>) {
  return apiFetch<ServiceCategory>(`/catalog/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function fetchServices() {
  return apiFetch<Service[]>('/catalog/services');
}

export interface ServiceInput {
  name: string;
  categoryId: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
}

export function createService(input: ServiceInput) {
  return apiFetch<Service>('/catalog/services', { method: 'POST', body: JSON.stringify(input) });
}

export function updateService(id: string, input: Partial<ServiceInput & { active: boolean }>) {
  return apiFetch<Service>(`/catalog/services/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}
