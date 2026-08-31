import { apiFetch } from './client';
import type { Client, PaymentMethod, Professional, Service } from './types';

export interface ClientPaymentService {
  id: string;
  serviceId: string;
  professionalId: string;
  priceAtTransaction: string;
  service: Service;
  professional: Professional;
}

export interface ClientPayment {
  id: string;
  datetime: string;
  amount: string;
  netAmount: string;
  paymentMethod: PaymentMethod;
  concept: string;
  services: ClientPaymentService[];
}

export interface ClientInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  internalNotes?: string;
  isSavedContact?: boolean;
  serviceInterestIds?: string[];
}

export function fetchClients(params?: { search?: string; status?: 'ACTIVA' | 'INACTIVA'; blacklisted?: boolean }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.blacklisted) query.set('blacklisted', 'true');
  const qs = query.toString();
  return apiFetch<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
}

export function fetchClient(id: string) {
  return apiFetch<Client>(`/clients/${id}`);
}

export function createClient(input: ClientInput) {
  return apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify(input) });
}

export function updateClient(id: string, input: Partial<ClientInput>) {
  return apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function blacklistClient(id: string, reason: string) {
  return apiFetch<Client>(`/clients/${id}/blacklist`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export function unblacklistClient(id: string) {
  return apiFetch<Client>(`/clients/${id}/unblacklist`, { method: 'POST' });
}

export interface ClientNote {
  id: string;
  clientId: string;
  appointmentId: string | null;
  authorUserId: string;
  author: {
    id: string;
    email: string;
    role: string;
    professional: { firstName: string; lastName: string } | null;
  };
  body: string;
  createdAt: string;
}

export function fetchClientNotes(clientId: string) {
  return apiFetch<ClientNote[]>(`/clients/${clientId}/notes`);
}

export function createClientNote(clientId: string, body: string, appointmentId?: string) {
  return apiFetch<ClientNote>(`/clients/${clientId}/notes`, { method: 'POST', body: JSON.stringify({ body, appointmentId }) });
}
