import { apiFetch } from './client';
import type { Appointment, Client } from './types';

export type WhatsappTemplateType = 'APPOINTMENT_REMINDER' | 'PAYMENT_PENDING' | 'PROMOTION';
export type WhatsappCampaignType = 'PAYMENT_PENDING' | 'PROMOTION';
export type WhatsappReminderStatus = 'SENT' | 'CONFIRMED' | 'CANCELLED' | 'NO_RESPONSE';

export interface WhatsappTemplate {
  id: string;
  type: WhatsappTemplateType;
  name: string;
  bodyText: string;
  active: boolean;
}

export function fetchTemplates(type?: WhatsappTemplateType) {
  const qs = type ? `?type=${type}` : '';
  return apiFetch<WhatsappTemplate[]>(`/whatsapp/templates${qs}`);
}

export function createTemplate(input: { type: WhatsappTemplateType; name: string; bodyText: string }) {
  return apiFetch<WhatsappTemplate>('/whatsapp/templates', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTemplate(id: string, input: Partial<{ name: string; bodyText: string; active: boolean }>) {
  return apiFetch<WhatsappTemplate>(`/whatsapp/templates/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export interface WhatsappReminder {
  id: string;
  appointmentId: string;
  sentAt: string | null;
  status: WhatsappReminderStatus;
}

export type AppointmentWithReminder = Appointment & { whatsappReminder: WhatsappReminder | null };

export function fetchReminders(from: Date, to: Date) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<AppointmentWithReminder[]>(`/whatsapp/reminders?${query}`);
}

export function previewReminder(appointmentId: string) {
  return apiFetch<{ phone: string; message: string }>(`/whatsapp/reminders/${appointmentId}/preview`);
}

export function markReminderSent(appointmentId: string) {
  return apiFetch<WhatsappReminder>(`/whatsapp/reminders/${appointmentId}/mark-sent`, { method: 'POST' });
}

export function updateReminderStatus(appointmentId: string, status: WhatsappReminderStatus) {
  return apiFetch<WhatsappReminder>(`/whatsapp/reminders/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export interface WhatsappCampaignRecipient {
  id: string;
  clientId: string;
  client: Client;
  sentAt: string | null;
  status: 'PENDING' | 'SENT' | 'SKIPPED';
  message?: string;
}

export interface WhatsappCampaign {
  id: string;
  templateId: string;
  template: WhatsappTemplate;
  type: WhatsappCampaignType;
  createdAt: string;
  recipients: WhatsappCampaignRecipient[];
}

export function fetchCampaigns(type?: WhatsappCampaignType) {
  const qs = type ? `?type=${type}` : '';
  return apiFetch<WhatsappCampaign[]>(`/whatsapp/campaigns${qs}`);
}

export function createCampaign(input: {
  templateId: string;
  type: WhatsappCampaignType;
  recipients: { clientId: string; appointmentId?: string }[];
}) {
  return apiFetch<WhatsappCampaign>('/whatsapp/campaigns', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchCampaign(id: string) {
  return apiFetch<WhatsappCampaign>(`/whatsapp/campaigns/${id}`);
}

export function deleteCampaign(id: string) {
  return apiFetch<void>(`/whatsapp/campaigns/${id}`, { method: 'DELETE' });
}

export function markRecipientSent(campaignId: string, recipientId: string) {
  return apiFetch<WhatsappCampaignRecipient>(`/whatsapp/campaigns/${campaignId}/recipients/${recipientId}/mark-sent`, { method: 'POST' });
}
