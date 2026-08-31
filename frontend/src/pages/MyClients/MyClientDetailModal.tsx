import { useEffect, useState } from 'react';
import { fetchMyClientDetail, type MyClientDetail } from '../../api/agenda';
import { STATUS_STYLES } from '../Agenda/statusColors';
import { Modal } from '../../components/ui/dialog';

interface Props {
  clientId: string;
  onClose: () => void;
}

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
        {detail.client.birthday
          ? ` • 🎂 ${detail.client.birthday.slice(8, 10)}/${detail.client.birthday.slice(5, 7)}/${detail.client.birthday.slice(0, 4)}`
          : ''}
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
        </div>
      )}
    </Modal>
  );
}
