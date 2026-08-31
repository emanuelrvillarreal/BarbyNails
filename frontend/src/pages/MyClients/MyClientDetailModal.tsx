import { useEffect, useState } from 'react';
import { fetchMyClientDetail, type MyClientDetail } from '../../api/agenda';
import { STATUS_STYLES } from '../Agenda/statusColors';
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

export default function MyClientDetailModal({ clientId, onClose }: Props) {
  const [detail, setDetail] = useState<MyClientDetail | null>(null);

  useEffect(() => {
    fetchMyClientDetail(clientId).then(setDetail);
  }, [clientId]);

  const title = detail ? (
    <div>
      <div>{detail.client.firstName} {detail.client.lastName}</div>
      <p className="mt-0.5 text-xs font-normal text-neutral-500">
        📞 {detail.client.phone} {detail.client.email ? `• ✉️ ${detail.client.email}` : ''}
      </p>
    </div>
  ) : (
    'Cargando clienta...'
  );

  return (
    <Modal open onClose={onClose} title={title} maxWidth="lg">
      {detail && (
        <div className="space-y-5">
          {detail.client.internalNotes && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                <span>⚠️ Alergias / advertencias generales</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-amber-900">{detail.client.internalNotes}</p>
            </div>
          )}

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-neutral-800">
              <span>💅 Tus Turnos con esta Clienta</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{detail.appointments.length}</span>
            </h3>
            {detail.appointments.length === 0 ? (
              <p className="text-xs text-neutral-400">Sin turnos registrados.</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {detail.appointments.map((a) => {
                  const style = STATUS_STYLES[a.status];
                  return (
                    <div key={a.id} className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs transition-colors hover:bg-neutral-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-800">
                          {a.startDatetime.slice(0, 10)} — {a.startDatetime.slice(11, 16)} hs
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-3xs font-semibold ${style.bg} ${style.border} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="mt-1 text-neutral-600">
                        <span className="font-medium text-neutral-500">Servicios:</span> {a.services.map((s) => s.service.name).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-neutral-800">
              <span>💰 Tus Cobros a esta Clienta</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{detail.transactionServices.length}</span>
            </h3>
            {detail.transactionServices.length === 0 ? (
              <p className="text-xs text-neutral-400">Todavía no se registró ningún cobro por tus servicios a esta clienta.</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {detail.transactionServices.map((ts) => (
                  <div key={ts.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-2xs">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                      <span className="font-bold text-neutral-800">
                        {ts.transaction.datetime.slice(0, 10)} — {ts.transaction.datetime.slice(11, 16)} hs
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-3xs font-bold text-emerald-700">
                        {PAYMENT_METHOD_LABELS[ts.transaction.paymentMethod] ?? ts.transaction.paymentMethod}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-neutral-600">
                      <span>{ts.service.name}</span>
                      <span className="font-semibold text-emerald-700">${Number(ts.priceAtTransaction).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
