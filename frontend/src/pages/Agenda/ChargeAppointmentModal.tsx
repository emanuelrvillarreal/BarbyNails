import { useState } from 'react';
import type { Appointment, PaymentMethod, Service } from '../../api/types';
import { createTransaction } from '../../api/finance';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';
import { Select, SelectItem } from '../../components/ui/select';
import { PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';

interface Props {
  appointment: Appointment;
  services: Service[];
  onClose: () => void;
  onCharged: () => void;
}

export default function ChargeAppointmentModal({ appointment, services, onClose, onCharged }: Props) {
  const bookedServiceIds = appointment.services.map((s) => s.serviceId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(bookedServiceIds);
  const [editingServices, setEditingServices] = useState(false);
  const [amountInput, setAmountInput] = useState(String(appointment.services.reduce((sum, s) => sum + Number(s.priceAtBooking), 0)));
  const [amountTouched, setAmountTouched] = useState(false);
  const [tipAmountInput, setTipAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = amountInput === '' ? 0 : Number(amountInput);
  const tipAmount = tipAmountInput === '' ? 0 : Number(tipAmountInput);

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const suggestedAmount = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      if (!amountTouched) {
        const total = services.filter((s) => next.includes(s.id)).reduce((sum, s) => sum + Number(s.price), 0);
        setAmountInput(String(total));
      }
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (amount <= 0) return setError('El monto debe ser mayor a 0');
    if (selectedServiceIds.length === 0) return setError('Elegí al menos un servicio');
    setSubmitting(true);
    try {
      await createTransaction({
        type: 'INCOME',
        amount,
        paymentMethod,
        concept: `Turno — ${selectedServices.map((s) => s.name).join(', ')}`,
        clientId: appointment.clientId,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
        tipProfessionalId: tipAmount > 0 ? appointment.professionalId : undefined,
        datetime: new Date().toISOString(),
        services: selectedServiceIds.map((serviceId) => ({ serviceId, professionalId: appointment.professionalId })),
      });
      onCharged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el cobro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`💳 Cobrar — ${appointment.client.firstName} ${appointment.client.lastName}`} maxWidth="sm">
      <div className="space-y-3">
        <p className="text-xs text-neutral-500">
          {appointment.professional.firstName} {appointment.professional.lastName}
        </p>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-700">Servicios a cobrar</p>
            <button type="button" onClick={() => setEditingServices((v) => !v)} className="text-xs font-semibold text-pink-600 hover:underline">
              {editingServices ? 'Listo' : '✏️ Editar servicios'}
            </button>
          </div>

          {!editingServices ? (
            <ul className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5 text-sm text-neutral-600">
              {selectedServices.length > 0 ? (
                selectedServices.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>{s.name}</span>
                    <span className="text-neutral-400">${Number(s.price).toLocaleString('es-AR')}</span>
                  </li>
                ))
              ) : (
                <li className="text-neutral-400">Sin servicios seleccionados.</li>
              )}
            </ul>
          ) : (
            <>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                      {s.name}
                      {bookedServiceIds.includes(s.id) && (
                        <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-700">reservado</span>
                      )}
                    </span>
                    <span className="text-neutral-400">${Number(s.price).toLocaleString('es-AR')}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-neutral-400">Tildá o destildá para agregar o sacar servicios — el monto sugerido se recalcula solo.</p>
            </>
          )}
        </div>

        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="w-full">
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <SelectItem key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </SelectItem>
          ))}
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block text-sm font-medium text-neutral-700">
            Monto
            <input
              type="number"
              min={0}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setAmountTouched(true);
              }}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            {amountTouched && amount !== suggestedAmount && (
              <button
                type="button"
                onClick={() => {
                  setAmountInput(String(suggestedAmount));
                  setAmountTouched(false);
                }}
                className="mt-0.5 text-3xs font-medium text-pink-600 hover:underline"
              >
                Usar sugerido (${suggestedAmount.toLocaleString('es-AR')})
              </button>
            )}
          </label>
          <label className="block text-sm font-medium text-amber-700">
            Propina (opcional)
            <input
              type="number"
              min={0}
              value={tipAmountInput}
              onChange={(e) => setTipAmountInput(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 focus:border-amber-400"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? 'Guardando...' : 'Confirmar cobro'}
        </button>
      </div>
    </Modal>
  );
}
