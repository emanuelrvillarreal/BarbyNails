import { useState } from 'react';
import type { Client, Service } from '../../api/types';
import { createClient, updateClient } from '../../api/clients';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';

interface Props {
  client: Client | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ClientFormModal({ client, services, onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState(client?.firstName ?? '');
  const [lastName, setLastName] = useState(client?.lastName ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [birthday, setBirthday] = useState(client?.birthday ? client.birthday.slice(0, 10) : '');
  const [internalNotes, setInternalNotes] = useState(client?.internalNotes ?? '');
  const [isSavedContact, setIsSavedContact] = useState(client?.isSavedContact ?? false);
  const [serviceInterestIds, setServiceInterestIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleService(id: string) {
    setServiceInterestIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setError(null);
    if (!firstName || !lastName || !phone) {
      setError('Nombre, apellido y telefono son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        firstName,
        lastName,
        phone,
        email: email || undefined,
        address: address || undefined,
        birthday: birthday || undefined,
        internalNotes: internalNotes || undefined,
        isSavedContact,
        serviceInterestIds,
      };
      if (client) {
        await updateClient(client.id, input);
      } else {
        await createClient(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la clienta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={client ? 'Editar clienta' : 'Nueva clienta'} maxWidth="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
            <input
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>
          <input
            placeholder="Telefono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
          <input
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
          <input
            placeholder="Domicilio (opcional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />

          <label className="block text-sm text-neutral-600">
            🎂 Fecha de cumpleaños (opcional)
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-700">
              ⚠️ Alergias, cuidados especiales u otras advertencias (opcional)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Ej: alergia a la acetona, uñas quebradizas, usar siempre base especial..."
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Esto queda siempre visible arriba de todo en su ficha. Después, en cada turno, se pueden agregar notas puntuales de esa visita.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" checked={isSavedContact} onChange={(e) => setIsSavedContact(e.target.checked)} />
            La tengo guardada en mi WhatsApp (habilita sugerencia de lista de difusión en campañas)
          </label>

          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700">Servicios de interes</p>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={serviceInterestIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </div>

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
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
    </Modal>
  );
}
