import { useEffect, useState } from 'react';
import { fetchClient, fetchClientNotes, createClientNote, type ClientPayment, type ClientNote } from '../../api/clients';
import type { Appointment, Client } from '../../api/types';
import { STATUS_STYLES } from '../Agenda/statusColors';
import ClientNotesSection from '../../components/ClientNotesSection';
import { Modal } from '../../components/ui/dialog';

interface Props {
  clientId: string;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MP_QR: 'Mercado Pago QR',
  MP_POINT: 'Mercado Pago Point',
};

type ClientDetail = Client & { appointments: Appointment[]; payments: ClientPayment[] };

const PAGE_SIZE = 10;

export default function ClientDetailModal({ clientId, onClose }: Props) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [visibleAppointments, setVisibleAppointments] = useState(PAGE_SIZE);
  const [visiblePayments, setVisiblePayments] = useState(PAGE_SIZE);

  useEffect(() => {
    fetchClient(clientId).then((c) => setDetail(c as ClientDetail));
    fetchClientNotes(clientId).then(setNotes).catch(() => setNotes([]));
    setVisibleAppointments(PAGE_SIZE);
    setVisiblePayments(PAGE_SIZE);
  }, [clientId]);

  async function handleAddNote(body: string) {
    const note = await createClientNote(clientId, body);
    setNotes((prev) => [note, ...prev]);
  }

  const lastAppointment = detail?.appointments.find((a) => a.status !== 'CANCELLED') || detail?.appointments[0];
  const lastPayment = detail?.payments[0];

  const title = detail ? (
    <div>
      <div>{detail.firstName} {detail.lastName}</div>
      <p className="mt-0.5 text-xs font-normal text-neutral-500">
        📞 {detail.phone} {detail.email ? `• ✉️ ${detail.email}` : ''}
      </p>
    </div>
  ) : (
    'Cargando clienta...'
  );

  return (
    <Modal open onClose={onClose} title={title} maxWidth="xl">
        {detail && (
          <div className="space-y-5">
            {/* Alergias / advertencias cargadas al inscribirla */}
            {detail.internalNotes && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <span>⚠️ Alergias / advertencias generales</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-amber-900">{detail.internalNotes}</p>
              </div>
            )}

            {/* Badges de Vigencia y Lista Negra */}
            {detail.isBlacklisted && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-xs text-red-700 uppercase tracking-wider">
                  <span>🚫 CLIENTE EN LISTA NEGRA</span>
                  {detail.blacklistedAt && <span>({detail.blacklistedAt.slice(0, 10)})</span>}
                </div>
                <p className="mt-1 text-xs text-red-800 font-semibold">
                  Motivo: {detail.blacklistedReason || 'Sin motivo especificado'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-xs ${
                  detail.isBlacklisted ? 'bg-red-600' : detail.status === 'ACTIVA' ? 'bg-emerald-500' : 'bg-violet-500'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                {detail.isBlacklisted ? 'Lista Negra' : detail.status === 'ACTIVA' ? 'Clienta Activa' : 'Clienta Inactiva'}
              </span>
              {detail.isSavedContact && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  💬 Guardada en WhatsApp
                </span>
              )}
            </div>

            {/* Tarjeta de Resumen: Última Atención y Último Pago */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-pink-50/30 p-3.5 shadow-2xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">🗓️ Última Atención</div>
                {lastAppointment ? (
                  <div className="mt-1.5 space-y-0.5 text-xs text-neutral-700">
                    <div className="font-bold text-neutral-800">{lastAppointment.startDatetime.slice(0, 10)} a las {lastAppointment.startDatetime.slice(11, 16)} hs</div>
                    <div><span className="font-medium text-neutral-500">Atendió:</span> <span className="font-semibold text-rose-800">{lastAppointment.professional.firstName} {lastAppointment.professional.lastName}</span></div>
                    <div><span className="font-medium text-neutral-500">Servicios:</span> {lastAppointment.services.map((s) => s.service.name).join(', ')}</div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-400">Sin atenciones registradas.</p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 p-3.5 shadow-2xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">💳 Último Pago Registrado</div>
                {lastPayment ? (
                  <div className="mt-1.5 space-y-0.5 text-xs text-neutral-700">
                    <div className="font-bold text-emerald-900">${Number(lastPayment.amount).toLocaleString('es-AR')} ({PAYMENT_METHOD_LABELS[lastPayment.paymentMethod] ?? lastPayment.paymentMethod})</div>
                    <div><span className="font-medium text-neutral-500">Fecha:</span> {lastPayment.datetime.slice(0, 10)} a las {lastPayment.datetime.slice(11, 16)} hs</div>
                    {lastPayment.services.length > 0 && (
                      <div><span className="font-medium text-neutral-500">Servicios:</span> {lastPayment.services.map((s) => s.service.name).join(', ')}</div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-400">Sin cobros registrados aún.</p>
                )}
              </div>
            </div>

            <ClientNotesSection notes={notes} onAdd={handleAddNote} />

            {/* Historial de Atenciones / Turnos */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-neutral-800 flex items-center gap-2">
                <span>💅 Historial de Turnos y Atenciones</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{detail.appointments.length}</span>
              </h3>
              {detail.appointments.length === 0 ? (
                <p className="text-xs text-neutral-400">Sin turnos registrados.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {detail.appointments.slice(0, visibleAppointments).map((a) => {
                      const style = STATUS_STYLES[a.status];
                      return (
                        <div key={a.id} className="rounded-xl border border-neutral-200 p-3 text-xs bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-800">
                              {a.startDatetime.slice(0, 10)} — {a.startDatetime.slice(11, 16)} hs
                            </span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-3xs font-semibold ${style.bg} ${style.border} ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap justify-between gap-1 text-neutral-600">
                            <div><span className="font-medium text-neutral-500">Atendida por:</span> <strong className="text-neutral-700">{a.professional.firstName} {a.professional.lastName}</strong></div>
                            <div><span className="font-medium text-neutral-500">Servicios:</span> {a.services.map((s) => s.service.name).join(', ')}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibleAppointments < detail.appointments.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleAppointments((v) => v + PAGE_SIZE)}
                      className="mt-2 text-xs font-semibold text-pink-600 hover:text-pink-800 hover:underline"
                    >
                      Ver más ({detail.appointments.length - visibleAppointments} restantes)
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Historial de Pagos Reales */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-neutral-800 flex items-center gap-2">
                <span>💰 Historial Completo de Pagos</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{detail.payments.length}</span>
              </h3>
              {detail.payments.length === 0 ? (
                <p className="text-xs text-neutral-400">Todavía no se registró ningún cobro a esta clienta.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {detail.payments.slice(0, visiblePayments).map((p) => (
                      <div key={p.id} className="rounded-xl border border-neutral-200 p-3 text-xs bg-white shadow-2xs">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                          <span className="font-bold text-neutral-800">
                            {p.datetime.slice(0, 10)} — {p.datetime.slice(11, 16)} hs
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-3xs font-bold text-emerald-700 border border-emerald-200">
                            {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                          </span>
                        </div>
                        {p.services.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {p.services.map((s) => (
                              <li key={s.id} className="flex items-center justify-between text-neutral-600">
                                <span>
                                  {s.service.name} <span className="text-neutral-400">(con {s.professional.firstName} {s.professional.lastName})</span>
                                </span>
                                <span className="font-semibold text-neutral-700">${Number(s.priceAtTransaction).toLocaleString('es-AR')}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1.5 text-neutral-600">{p.concept}</p>
                        )}
                        <div className="mt-2 flex justify-end border-t border-neutral-100 pt-1.5">
                          <span className="text-xs font-bold text-emerald-700">Total Abonado: ${Number(p.amount).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {visiblePayments < detail.payments.length && (
                    <button
                      type="button"
                      onClick={() => setVisiblePayments((v) => v + PAGE_SIZE)}
                      className="mt-2 text-xs font-semibold text-pink-600 hover:text-pink-800 hover:underline"
                    >
                      Ver más ({detail.payments.length - visiblePayments} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </Modal>
  );
}
