import { useEffect, useState } from 'react';
import type { Client, Professional, Service } from '../../api/types';
import { fetchClients, createClient } from '../../api/clients';
import { createAppointment } from '../../api/agenda';
import { isoToLocalInput, localInputToIso } from './dateUtils';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';

interface AppointmentModalProps {
  professional: Professional;
  services: Service[];
  startIso: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AppointmentModal({ professional, services, startIso, onClose, onCreated }: AppointmentModalProps) {
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', phone: '' });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [datetimeLocal, setDatetimeLocal] = useState(isoToLocalInput(startIso));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClientOptions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetchClients({ search: clientSearch }).then(setClientOptions).catch(() => setClientOptions([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [clientSearch]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalBuffer = selectedServices.reduce((max, s) => Math.max(max, s.bufferMinutes), 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  async function handleSubmit() {
    setError(null);
    try {
      setSubmitting(true);

      let clientId = selectedClientId;
      if (showNewClient) {
        if (!newClient.firstName || !newClient.lastName || !newClient.phone) {
          throw new Error('Completa nombre, apellido y telefono de la nueva clienta');
        }
        const created = await createClient(newClient);
        clientId = created.id;
      }
      if (!clientId) throw new Error('Elegi una clienta o carga una nueva');
      if (selectedServiceIds.length === 0) throw new Error('Elegi al menos un servicio');

      await createAppointment({
        clientId,
        professionalId: professional.id,
        startDatetime: localInputToIso(datetimeLocal),
        serviceIds: selectedServiceIds,
      });

      onCreated();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError('No se pudo crear el turno');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Nuevo turno — ${professional.firstName}`} maxWidth="md">
        <label className="mb-1 block text-sm font-medium text-neutral-700">Horario</label>
        <input
          type="datetime-local"
          value={datetimeLocal}
          onChange={(e) => setDatetimeLocal(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700">Clienta</label>
        {!showNewClient ? (
          <>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setSelectedClientId(null);
              }}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            {clientOptions.length > 0 && (
              <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-neutral-200">
                {clientOptions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientSearch(`${c.firstName} ${c.lastName}`);
                        setClientOptions([]);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-pink-50 ${
                        selectedClientId === c.id ? 'bg-pink-50' : ''
                      }`}
                    >
                      {c.firstName} {c.lastName} — {c.phone}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="mt-2 text-sm font-medium text-pink-600 hover:underline"
            >
              + Cargar clienta nueva
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nombre"
              value={newClient.firstName}
              onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Apellido"
              value={newClient.lastName}
              onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Telefono"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            <button type="button" onClick={() => setShowNewClient(false)} className="text-sm text-neutral-500 hover:underline">
              Cancelar, buscar clienta existente
            </button>
          </div>
        )}

        <label className="mb-1 mt-4 block text-sm font-medium text-neutral-700">Servicios</label>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                {s.name}
              </span>
              <span className="text-neutral-400">
                {s.durationMinutes}min — ${Number(s.price).toLocaleString('es-AR')}
              </span>
            </label>
          ))}
        </div>

        {selectedServices.length > 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Duracion total: {totalDuration + totalBuffer} min ({totalDuration} min de servicio + {totalBuffer} min de tolerancia)
            &nbsp;·&nbsp; Total: ${totalPrice.toLocaleString('es-AR')}
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Guardando...' : 'Agendar turno'}
          </button>
        </div>
    </Modal>
  );
}
