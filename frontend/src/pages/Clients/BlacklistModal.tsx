import { useState, type FormEvent } from 'react';
import type { Client } from '../../api/types';
import { blacklistClient } from '../../api/clients';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';

interface Props {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BlacklistModal({ client, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      return setError('Debe ingresar un motivo para mover la clienta a Lista Negra');
    }
    setSubmitting(true);
    setError(null);
    try {
      await blacklistClient(client.id, reason.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo mover a Lista Negra');
    } finally {
      setSubmitting(false);
    }
  }

  const title = (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-lg text-red-600">🚫</span>
      Pasar a Lista Negra
    </div>
  );

  return (
    <Modal open onClose={onClose} title={title} maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-neutral-700">
              Clienta: <span className="text-neutral-900 font-bold">{client.firstName} {client.lastName}</span>
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Teléfono: {client.phone}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Motivo o Razón de la Baja <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Faltó 3 veces seguidas sin avisar, no saldó la deuda pendiente..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
            />
            <p className="mt-1 text-3xs text-neutral-400">
              Este motivo quedará registrado permanentemente en el historial de la clienta.
            </p>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg text-center">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : '🚫 Confirmar Lista Negra'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
