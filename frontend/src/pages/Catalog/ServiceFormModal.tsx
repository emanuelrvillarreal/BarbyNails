import { useState } from 'react';
import type { Service, ServiceCategory } from '../../api/types';
import { createService, updateService } from '../../api/catalog';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';
import { Select, SelectItem } from '../../components/ui/select';

interface Props {
  service: Service | null;
  categories: ServiceCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceFormModal({ service, categories, onClose, onSaved }: Props) {
  const [name, setName] = useState(service?.name ?? '');
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? categories[0]?.id ?? '');
  const [price, setPrice] = useState(service ? Number(service.price) : 0);
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes ?? 30);
  const [bufferMinutes, setBufferMinutes] = useState(service?.bufferMinutes ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name || !categoryId || price <= 0 || durationMinutes <= 0) {
      setError('Completa nombre, categoria, precio y duracion');
      return;
    }
    setSubmitting(true);
    try {
      const input = { name, categoryId, price, durationMinutes, bufferMinutes };
      if (service) {
        await updateService(service.id, input);
      } else {
        await createService(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el servicio');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!service) return;
    setSubmitting(true);
    try {
      await updateService(service.id, { active: false });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo dar de baja el servicio');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={service ? 'Editar servicio' : 'Nuevo servicio'} maxWidth="sm">
      <div className="space-y-3">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm outline-none focus:border-pink-400"
        />
        <Select value={categoryId} onValueChange={setCategoryId} className="w-full">
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-neutral-500">
            Precio
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 px-2 py-2 text-sm outline-none focus:border-pink-400"
            />
          </label>
          <label className="text-xs text-neutral-500">
            Duracion (min)
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 px-2 py-2 text-sm outline-none focus:border-pink-400"
            />
          </label>
          <label className="text-xs text-neutral-500">
            Buffer (min)
            <input
              type="number"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 px-2 py-2 text-sm outline-none focus:border-pink-400"
            />
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        {service ? (
          <button onClick={handleDeactivate} disabled={submitting} className="text-sm text-red-600 hover:underline disabled:opacity-50">
            Dar de baja
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
