import { apiFetch } from './client';
import type { Professional, ProfessionalSchedule } from './types';

export interface ProfessionalInput {
  firstName: string;
  lastName: string;
  documentNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  hireDate?: string;
  position?: string;
  bankAlias?: string;
  bankCbu?: string;
  bankName?: string;
  colorHex: string;
  commissionPct: number;
  displayOrder: number;
  schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export function fetchProfessionals() {
  return apiFetch<Professional[]>('/professionals');
}

export function fetchMyProfile() {
  return apiFetch<Professional>('/professionals/me');
}

export function updateMyProfile(input: {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bankAlias?: string | null;
  bankCbu?: string | null;
  bankName?: string | null;
}) {
  return apiFetch<Professional>('/professionals/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export function createProfessional(input: ProfessionalInput) {
  return apiFetch<Professional>('/professionals', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProfessional(id: string, input: Partial<ProfessionalInput & { active: boolean }>) {
  return apiFetch<Professional>(`/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function fetchProfessionalLogin(id: string) {
  return apiFetch<{ id: string; email: string; active: boolean } | null>(`/professionals/${id}/login`);
}

export function createProfessionalLogin(id: string, input: { email: string; password: string }) {
  return apiFetch<{ id: string; email: string }>(`/professionals/${id}/login`, { method: 'POST', body: JSON.stringify(input) });
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT' | 'JUSTIFIED_ABSENCE';

export interface AttendanceRecord {
  id: string;
  professionalId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  notes: string | null;
}

export interface AttendanceEntry {
  professional: Professional;
  record: AttendanceRecord | null;
}

export function fetchAttendance(date: string) {
  return apiFetch<AttendanceEntry[]>(`/attendance?date=${date}`);
}

export function checkIn(input?: { date?: string; professionalId?: string }) {
  return apiFetch<AttendanceRecord>('/attendance/checkin', { method: 'POST', body: JSON.stringify(input ?? {}) });
}

export function checkOut(input?: { date?: string; professionalId?: string }) {
  return apiFetch<AttendanceRecord>('/attendance/checkout', { method: 'POST', body: JSON.stringify(input ?? {}) });
}

export function setAttendanceStatus(input: {
  professionalId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
}) {
  return apiFetch<AttendanceRecord>('/attendance/status', { method: 'PUT', body: JSON.stringify(input) });
}

export interface Absence {
  professionalId: string;
  date: string;
  status: 'ABSENT' | 'JUSTIFIED_ABSENCE';
}

export function fetchAbsences(from: string, to: string) {
  return apiFetch<Absence[]>(`/attendance/absences?from=${from}&to=${to}`);
}

export async function downloadAttendanceReport(from: string, to: string) {
  const token = localStorage.getItem('barby_token');
  const res = await fetch(`/api/attendance/export?from=${from}&to=${to}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Error al exportar asistencia');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_${from}_al_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export type { ProfessionalSchedule };
