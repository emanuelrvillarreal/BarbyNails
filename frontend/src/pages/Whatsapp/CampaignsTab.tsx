import { useEffect, useState } from 'react';
import {
  fetchCampaigns,
  createCampaign,
  fetchCampaign,
  deleteCampaign,
  markRecipientSent,
  fetchTemplates,
  type WhatsappCampaign,
  type WhatsappCampaignType,
  type WhatsappTemplate,
} from '../../api/whatsapp';
import { fetchClients } from '../../api/clients';
import { fetchAppointments } from '../../api/agenda';
import type { Appointment, Client } from '../../api/types';
import { ApiError } from '../../api/client';
import { addDays, today } from '../Agenda/dateUtils';
import { Select, SelectItem } from '../../components/ui/select';
import { Modal } from '../../components/ui/dialog';

const TYPE_LABELS: Record<WhatsappCampaignType, string> = {
  PAYMENT_PENDING: 'Pago pendiente',
  PROMOTION: 'Promocion',
};

function CampaignDetail({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  const [campaign, setCampaign] = useState<WhatsappCampaign | null>(null);

  function load() {
    fetchCampaign(campaignId).then(setCampaign);
  }

  useEffect(load, [campaignId]);

  async function handleSend(recipientId: string, phone: string, message: string) {
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    await markRecipientSent(campaignId, recipientId);
    load();
  }

  if (!campaign) return <p className="text-sm text-neutral-400">Cargando...</p>;

  const saved = campaign.recipients.filter((r) => r.client.isSavedContact);
  const notSaved = campaign.recipients.filter((r) => !r.client.isSavedContact);

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm text-neutral-500 hover:underline">
        ← Volver a campañas
      </button>
      <h3 className="mb-1 text-sm font-medium text-neutral-700">
        {TYPE_LABELS[campaign.type]} — {campaign.template.name}
      </h3>
      <p className="mb-4 text-xs text-neutral-400">{campaign.recipients.length} destinataria(s)</p>

      {saved.length > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-800">
            Guardadas en tu WhatsApp ({saved.length}) — mejor usar una lista de difusion desde la app en vez de una por una
          </p>
          <ul className="space-y-1 text-sm text-emerald-700">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>
                  {r.client.firstName} {r.client.lastName} — {r.client.phone}
                </span>
                {r.status === 'SENT' ? (
                  <span className="text-xs text-emerald-600">✓ Enviado</span>
                ) : (
                  <button onClick={() => handleSend(r.id, r.client.phone, r.message ?? '')} className="text-xs font-medium underline">
                    Enviar individual
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">Cola individual ({notSaved.length})</p>
        <ul className="space-y-1 text-sm text-neutral-600">
          {notSaved.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span>
                {r.client.firstName} {r.client.lastName} — {r.client.phone}
              </span>
              {r.status === 'SENT' ? (
                <span className="text-xs text-emerald-600">✓ Enviado</span>
              ) : (
                <button onClick={() => handleSend(r.id, r.client.phone, r.message ?? '')} className="text-xs font-medium text-emerald-600 hover:underline">
                  Enviar
                </button>
              )}
            </li>
          ))}
          {notSaved.length === 0 && <p className="text-neutral-400">Ninguna.</p>}
        </ul>
      </div>
    </div>
  );
}

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<WhatsappCampaign[]>([]);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [type, setType] = useState<WhatsappCampaignType>('PROMOTION');
  const [templateId, setTemplateId] = useState('');

  // Promocion: se elige por clienta.
  const [clientFilter, setClientFilter] = useState<'ALL' | 'INACTIVA'>('INACTIVA');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Pago pendiente: se elige por turno puntual (asi la plantilla puede
  // completar monto/servicios/fecha/hora/profesional).
  const [apptFrom, setApptFrom] = useState(addDays(today(), -30));
  const [apptTo, setApptTo] = useState(today());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetchCampaigns().then(setCampaigns);
  }

  useEffect(load, []);

  useEffect(() => {
    if (!showForm) return;
    fetchTemplates(type).then((list) => {
      setTemplates(list);
      setTemplateId(list[0]?.id ?? '');
    });
  }, [showForm, type]);

  useEffect(() => {
    if (!showForm || type !== 'PROMOTION') return;
    fetchClients({ status: clientFilter === 'ALL' ? undefined : 'INACTIVA' }).then(setClients);
    setSelectedClientIds([]);
  }, [showForm, type, clientFilter]);

  useEffect(() => {
    if (!showForm || type !== 'PAYMENT_PENDING') return;
    fetchAppointments({ from: new Date(`${apptFrom}T00:00:00.000Z`), to: new Date(`${apptTo}T23:59:59.999Z`) })
      .then((list) => setAppointments(list.filter((a) => a.status !== 'CANCELLED')))
      .catch(() => setAppointments([]));
    setSelectedAppointmentIds([]);
  }, [showForm, type, apptFrom, apptTo]);

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function toggleAppointment(id: string) {
    setSelectedAppointmentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function handleCreate() {
    setError(null);
    if (!templateId) return setError('Elegi una plantilla');

    const recipients =
      type === 'PAYMENT_PENDING'
        ? appointments
            .filter((a) => selectedAppointmentIds.includes(a.id))
            .map((a) => ({ clientId: a.clientId, appointmentId: a.id }))
        : selectedClientIds.map((clientId) => ({ clientId }));

    if (recipients.length === 0) {
      return setError(type === 'PAYMENT_PENDING' ? 'Elegi al menos un turno' : 'Elegi al menos una clienta');
    }

    setSubmitting(true);
    try {
      const campaign = await createCampaign({ templateId, type, recipients });
      setShowForm(false);
      load();
      setOpenCampaignId(campaign.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la campaña');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deletingCampaignId) return;
    await deleteCampaign(deletingCampaignId);
    setDeletingCampaignId(null);
    load();
  }

  if (openCampaignId) {
    return <CampaignDetail campaignId={openCampaignId} onBack={() => setOpenCampaignId(null)} />;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nueva campaña
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Plantilla</th>
              <th className="px-4 py-2 font-medium">Destinatarias</th>
              <th className="px-4 py-2 font-medium">Enviados</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-700">{TYPE_LABELS[c.type]}</td>
                <td className="px-4 py-2 text-neutral-500">{c.template.name}</td>
                <td className="px-4 py-2 text-neutral-500">{c.recipients.length}</td>
                <td className="px-4 py-2 text-neutral-500">{c.recipients.filter((r) => r.status === 'SENT').length}</td>
                <td className="px-4 py-2 text-neutral-500">{c.createdAt.slice(0, 10)}</td>
                <td className="space-x-2 px-4 py-2 text-right">
                  <button onClick={() => setOpenCampaignId(c.id)} className="link-action">
                    Ver
                  </button>
                  <button onClick={() => setDeletingCampaignId(c.id)} className="link-action-muted">
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Todavia no se crearon campañas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="Nueva campaña" maxWidth="md">
            <div className="space-y-3">
              <div className="flex overflow-hidden rounded-xl border-2 border-neutral-200 shadow-sm">
                {(['PROMOTION', 'PAYMENT_PENDING'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 ${type === t ? 'segment-active' : 'segment-inactive'}`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              <Select
                value={templateId}
                onValueChange={setTemplateId}
                disabled={templates.length === 0}
                placeholder={templates.length === 0 ? 'No hay plantillas de este tipo — cargá una primero' : undefined}
                className="w-full"
              >
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </Select>

              {type === 'PROMOTION' ? (
                <>
                  <div className="flex overflow-hidden rounded-lg border border-neutral-300">
                    <button
                      onClick={() => setClientFilter('INACTIVA')}
                      className={`flex-1 py-1.5 text-xs font-medium ${clientFilter === 'INACTIVA' ? 'bg-violet-500 text-white' : 'bg-white text-neutral-600'}`}
                    >
                      Solo inactivas
                    </button>
                    <button
                      onClick={() => setClientFilter('ALL')}
                      className={`flex-1 py-1.5 text-xs font-medium ${clientFilter === 'ALL' ? 'bg-violet-500 text-white' : 'bg-white text-neutral-600'}`}
                    >
                      Todas
                    </button>
                  </div>

                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                    {clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedClientIds.includes(c.id)} onChange={() => toggleClient(c.id)} />
                        {c.firstName} {c.lastName}
                        {c.isSavedContact && <span className="text-xs text-emerald-600">(guardada)</span>}
                      </label>
                    ))}
                    {clients.length === 0 && <p className="text-sm text-neutral-400">No hay clientas para este filtro.</p>}
                  </div>
                  <p className="text-xs text-neutral-400">{selectedClientIds.length} seleccionada(s)</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-neutral-500">
                    Elegí el turno correspondiente a cada clienta — así la plantilla puede completar monto, servicios, fecha, hora y
                    profesional.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={apptFrom} onChange={(e) => setApptFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
                    <input type="date" value={apptTo} onChange={(e) => setApptTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
                  </div>

                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                    {appointments.map((a) => {
                      const monto = a.services.reduce((sum, s) => sum + Number(s.priceAtBooking), 0);
                      return (
                        <label key={a.id} className="flex items-start gap-2 text-sm">
                          <input type="checkbox" checked={selectedAppointmentIds.includes(a.id)} onChange={() => toggleAppointment(a.id)} className="mt-0.5" />
                          <span>
                            <span className="font-medium text-neutral-700">
                              {a.client.firstName} {a.client.lastName}
                            </span>{' '}
                            <span className="text-neutral-400">
                              — {a.startDatetime.slice(0, 10)} {a.startDatetime.slice(11, 16)}hs — {a.services.map((s) => s.service.name).join(', ')} — $
                              {monto.toLocaleString('es-AR')}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {appointments.length === 0 && <p className="text-sm text-neutral-400">No hay turnos en ese rango de fechas.</p>}
                  </div>
                  <p className="text-xs text-neutral-400">{selectedAppointmentIds.length} turno(s) seleccionado(s)</p>
                </>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={submitting} className="btn-primary">
                Crear campaña
              </button>
            </div>
        </Modal>
      )}

      {deletingCampaignId && (
        <Modal open onClose={() => setDeletingCampaignId(null)} title="🗑️ Borrar campaña" maxWidth="sm">
          <p className="text-sm text-neutral-600">
            ¿Borrar esta campaña? Esto no cancela mensajes ya enviados por WhatsApp, solo borra el registro.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeletingCampaignId(null)} className="btn-ghost">
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-700 active:scale-95"
            >
              Sí, borrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
