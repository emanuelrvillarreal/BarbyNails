import type { AppointmentStatus } from '../../api/types';

export const STATUS_STYLES: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; solid: string; label: string }
> = {
  PENDING: {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-800',
    solid: 'bg-gradient-to-r from-amber-400 to-orange-400',
    label: 'Pendiente',
  },
  CONFIRMED: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-800',
    solid: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    label: 'Confirmado',
  },
  IN_PROGRESS: {
    bg: 'bg-sky-100',
    border: 'border-sky-400',
    text: 'text-sky-800 font-bold',
    solid: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    label: '▶ En Servicio',
  },
  COMPLETED: {
    bg: 'bg-indigo-100',
    border: 'border-indigo-400',
    text: 'text-indigo-800',
    solid: 'bg-gradient-to-r from-indigo-500 to-purple-600',
    label: 'Terminado',
  },
  CANCELLED: {
    bg: 'bg-neutral-100',
    border: 'border-neutral-300',
    text: 'text-neutral-400 line-through',
    solid: 'bg-neutral-400',
    label: 'Cancelado',
  },
};
