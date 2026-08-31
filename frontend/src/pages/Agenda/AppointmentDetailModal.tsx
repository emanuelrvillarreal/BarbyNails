import { useEffect, useState } from 'react';
import type { Appointment, AppointmentStatus } from '../../api/types';
import { updateAppointmentStatus, fetchAppointmentNotes, createAppointmentNote } from '../../api/agenda';
import { previewReminder, markReminderSent } from '../../api/whatsapp';
import { STATUS_STYLES } from './statusColors';
import { ApiError } from '../../api/client';
import type { ClientNote } from '../../api/clients';
import ClientNotesSection from '../../components/ClientNotesSection';
import { Modal } from '../../components/ui/dialog';

interface Props {
  appointment: Appointment;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function AppointmentDetailModal({ appointment, canEdit, onClose, onUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState<string | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);

  useEffect(() => {
    fetchAppointmentNotes(appointment.id).then(setNotes).catch(() => setNotes([]));
  }, [appointment.id]);

  async function handleAddNote(body: string) {
    const note = await createAppointmentNote(appointment.id, body);
    setNotes((prev) => [note, ...prev]);
  }

  async function handleNotify() {
    setNotifying(true);
    setError(null);
    try {
      const { phone, message } = await previewReminder(appointment.id);
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      await markReminderSent(appointment.id);
      setNotifiedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo preparar el mensaje');
    } finally {
      setNotifying(false);
    }
  }

  async function changeStatus(status: AppointmentStatus) {
    setSubmitting(true);
    setError(null);
    try {
      await updateAppointmentStatus(appointment.id, status, status === 'CANCELLED' ? 'Cancelado desde la agenda' : undefined);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el turno');
    } finally {
      setSubmitting(false);
    }
  }

  const style = STATUS_STYLES[appointment.status];

  return (
    <Modal open onClose={onClose} title={`${appointment.client.firstName} ${appointment.client.lastName}`} maxWidth="md">
        <p className="text-sm text-neutral-500">
          {appointment.professional.firstName} — {appointment.startDatetime.slice(11, 16)} a {appointment.endDatetime.slice(11, 16)}hs
        </p>
        <p className="mt-1 text-sm text-neutral-500">Tel: {appointment.client.phone}</p>

        {appointment.client.internalNotes && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              <span>⚠️ Alergias / advertencias generales</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-amber-900">{appointment.client.internalNotes}</p>
          </div>
        )}

        <ul className="mt-3 space-y-1 text-sm text-neutral-600">
          {appointment.services.map((s) => (
            <li key={s.id}>
              {s.service.name} — ${Number(s.priceAtBooking).toLocaleString('es-AR')}
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-neutral-100 pt-4">
          <ClientNotesSection notes={notes} onAdd={handleAddNote} emptyLabel="Sin notas de esta clienta todavía." />
        </div>

        <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm ${style.solid}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          {style.label}
        </span>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {appointment.status !== 'CANCELLED' && (
          <div className="mt-4">
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="btn-success w-full"
            >
              {notifying ? 'Preparando mensaje...' : '📲 Notificar por WhatsApp'}
            </button>
            {notifiedAt && <p className="mt-1 text-center text-xs text-neutral-400">Marcado como enviado a las {notifiedAt.slice(11, 16)}</p>}
          </div>
        )}

        {canEdit && appointment.status !== 'CANCELLED' && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {appointment.status !== 'CONFIRMED' && appointment.status !== 'IN_PROGRESS' && appointment.status !== 'COMPLETED' && (
                <button onClick={() => changeStatus('CONFIRMED')} disabled={submitting} className="btn-secondary py-2 text-xs">
                  ✓ Confirmar
                </button>
              )}
              {appointment.status !== 'IN_PROGRESS' && appointment.status !== 'COMPLETED' && (
                <button
                  onClick={() => changeStatus('IN_PROGRESS')}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2 px-3 text-xs flex-1 shadow-md transition-all active:scale-95"
                >
                  ▶ Iniciar Servicio
                </button>
              )}
              {appointment.status !== 'COMPLETED' && (
                <button
                  onClick={() => changeStatus('COMPLETED')}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2 px-3 text-xs flex-1 shadow-md transition-all active:scale-95"
                >
                  ✨ Servicio Terminado
                </button>
              )}
            </div>
            <button onClick={() => changeStatus('CANCELLED')} disabled={submitting} className="btn-danger-soft w-full text-xs mt-1">
              Cancelar turno
            </button>
          </div>
        )}
    </Modal>
  );
}
