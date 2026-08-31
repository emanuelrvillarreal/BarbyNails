import { useEffect, useState } from 'react';
import { fetchReminders, previewReminder, markReminderSent, updateReminderStatus, type AppointmentWithReminder, type WhatsappReminderStatus } from '../../api/whatsapp';
import { today, addDays } from '../Agenda/dateUtils';
import { ApiError } from '../../api/client';

const STATUS_LABELS: Record<WhatsappReminderStatus, { label: string; className: string }> = {
  SENT: { label: 'Enviado', className: 'bg-neutral-100 text-neutral-600' },
  CONFIRMED: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
  NO_RESPONSE: { label: 'Sin responder', className: 'bg-amber-100 text-amber-700' },
};

export default function RemindersTab() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(addDays(today(), 6));
  const [appointments, setAppointments] = useState<AppointmentWithReminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetchReminders(new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`)).then(setAppointments);
  }

  useEffect(load, [from, to]);

  async function handleNotify(appointmentId: string) {
    setBusyId(appointmentId);
    setError(null);
    try {
      const { phone, message } = await previewReminder(appointmentId);
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      await markReminderSent(appointmentId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo preparar el mensaje');
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(appointmentId: string, status: WhatsappReminderStatus) {
    await updateReminderStatus(appointmentId, status);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <span className="text-neutral-400">a</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Turno</th>
              <th className="px-4 py-2 font-medium">Clienta</th>
              <th className="px-4 py-2 font-medium">Profesional</th>
              <th className="px-4 py-2 font-medium">Enviado</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {appointments
              .filter((a) => a.status !== 'CANCELLED')
              .map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 text-neutral-500">
                    {a.startDatetime.slice(0, 10)} {a.startDatetime.slice(11, 16)}
                  </td>
                  <td className="px-4 py-2 font-medium text-neutral-700">
                    {a.client.firstName} {a.client.lastName}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{a.professional.firstName}</td>
                  <td className="px-4 py-2 text-neutral-500">{a.whatsappReminder?.sentAt ? a.whatsappReminder.sentAt.slice(11, 16) : '—'}</td>
                  <td className="px-4 py-2">
                    {a.whatsappReminder ? (
                      <div className="flex flex-wrap gap-1">
                        {(['SENT', 'CONFIRMED', 'CANCELLED', 'NO_RESPONSE'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(a.id, s)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              a.whatsappReminder?.status === s ? STATUS_LABELS[s].className : 'bg-neutral-50 text-neutral-400 hover:bg-neutral-100'
                            }`}
                          >
                            {STATUS_LABELS[s].label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">Sin enviar</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleNotify(a.id)}
                      disabled={busyId === a.id}
                      className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      {a.whatsappReminder ? 'Reenviar' : 'Notificar'}
                    </button>
                  </td>
                </tr>
              ))}
            {appointments.filter((a) => a.status !== 'CANCELLED').length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  No hay turnos en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
