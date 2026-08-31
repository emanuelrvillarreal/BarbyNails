import { apiFetch } from './client';
import type { Appointment, AppointmentStatus, Client, GapsByDate, ServiceCategory } from './types';
import type { ClientNote } from './clients';

export function fetchAppointments(params: { from: Date; to: Date; professionalId?: string }) {
  const query = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
  });
  return apiFetch<Appointment[]>(`/agenda/appointments?${query}`);
}

export function fetchGaps(params: { from: Date; to: Date; professionalId: string }) {
  const query = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    professionalId: params.professionalId,
  });
  return apiFetch<GapsByDate>(`/agenda/gaps?${query}`);
}

export function createAppointment(input: {
  clientId: string;
  professionalId: string;
  startDatetime: string;
  serviceIds: string[];
}) {
  return apiFetch<Appointment>('/agenda/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus, cancelledReason?: string) {
  return apiFetch<Appointment>(`/agenda/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, cancelledReason }),
  });
}

export type MyClient = Client & { lastVisit: string; visitCount: number };

// Version sin montos de plata: es lo unico que le corresponde ver a la
// profesional (nunca precios/cobros), a diferencia del Appointment/Service
// completos que usa la Agenda del lado OWNER.
export interface MyClientAppointmentServiceItem {
  id: string;
  serviceId: string;
  durationMinutesAtBooking: number;
  bufferMinutesAtBooking: number;
  service: { id: string; name: string; categoryId: string; category: ServiceCategory };
}

export interface MyClientAppointment {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  cancelledReason: string | null;
  services: MyClientAppointmentServiceItem[];
}

export interface MyClientDetail {
  client: Client;
  appointments: MyClientAppointment[];
}

export function fetchMyClients() {
  return apiFetch<MyClient[]>('/agenda/my-clients');
}

export function fetchMyClientDetail(clientId: string) {
  return apiFetch<MyClientDetail>(`/agenda/my-clients/${clientId}`);
}

export function fetchAppointmentNotes(appointmentId: string) {
  return apiFetch<ClientNote[]>(`/agenda/appointments/${appointmentId}/notes`);
}

export function createAppointmentNote(appointmentId: string, body: string) {
  return apiFetch<ClientNote>(`/agenda/appointments/${appointmentId}/notes`, { method: 'POST', body: JSON.stringify({ body }) });
}
