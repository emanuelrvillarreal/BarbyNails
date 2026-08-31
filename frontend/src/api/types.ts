export type Role = 'SYSADMIN' | 'OWNER' | 'PROFESSIONAL';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT' | 'JUSTIFIED_ABSENCE';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MP_QR' | 'MP_POINT' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface SystemSettings {
  id: string;
  salonName: string;
  logoUrl: string | null;
  accentColor?: string | null;
}

export interface UserAccount {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  professionalId: string | null;
  createdAt: string;
  professional?: {
    id: string;
    firstName: string;
    lastName: string;
    position?: string | null;
  } | null;
}

export interface AttendanceRecord {
  id: string;
  professionalId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  notes: string | null;
}

export interface Professional {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hireDate: string | null;
  position: string | null;
  bankAlias: string | null;
  bankCbu: string | null;
  bankName: string | null;
  colorHex: string;
  commissionPct: string;
  active: boolean;
  displayOrder: number;
  schedules: ProfessionalSchedule[];
}

export interface ProfessionalSchedule {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  category: ServiceCategory;
  price: string;
  durationMinutes: number;
  bufferMinutes: number;
  active: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address?: string | null;
  birthday?: string | null;
  internalNotes?: string | null;
  status?: 'ACTIVA' | 'INACTIVA';
  lastVisit?: string | null;
  isSavedContact?: boolean;
  isBlacklisted?: boolean;
  blacklistedReason?: string | null;
  blacklistedAt?: string | null;
}

export interface AppointmentServiceItem {
  id: string;
  serviceId: string;
  priceAtBooking: string;
  durationMinutesAtBooking: number;
  bufferMinutesAtBooking: number;
  service: Service;
}

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  cancelledReason: string | null;
  client: Client;
  professional: Professional;
  services: AppointmentServiceItem[];
}

export interface GapSlot {
  start: string;
  end: string;
}

export type GapsByDate = Record<string, GapSlot[]>;
