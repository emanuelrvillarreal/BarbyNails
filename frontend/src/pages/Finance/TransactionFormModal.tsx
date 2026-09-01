import { useEffect, useState } from 'react';
import type { Client, PaymentMethod, Professional, Service, TransactionType } from '../../api/types';
import { createTransaction } from '../../api/finance';
import { fetchClients } from '../../api/clients';
import { ApiError } from '../../api/client';
import { today } from '../Agenda/dateUtils';
import { Modal } from '../../components/ui/dialog';
import { Select, SelectItem } from '../../components/ui/select';
import { PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';

interface Props {
  services: Service[];
  professionals: Professional[];
  onClose: () => void;
  onCreated: () => void;
}

export default function TransactionFormModal({ services, professionals, onClose, onCreated }: Props) {
  const [type, setType] = useState<TransactionType>('INCOME');
  const [amountInput, setAmountInput] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [tipAmountInput, setTipAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [professionalId, setProfessionalId] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

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

  const amount = amountInput === '' ? 0 : Number(amountInput);
  const tipAmount = tipAmountInput === '' ? 0 : Number(tipAmountInput);

  const suggestedAmount = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + Number(s.price), 0);

  useEffect(() => {
    if (type === 'INCOME' && !amountTouched && selectedServiceIds.length > 0) {
      setAmountInput(String(suggestedAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceIds, type]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  const feeApplies = paymentMethod !== 'CASH' && paymentMethod !== 'TRANSFER';

  async function handleSubmit() {
    setError(null);
    const hasTip = type === 'INCOME' && tipAmount > 0;
    if (amount <= 0 && !hasTip) return setError('El monto debe ser mayor a 0');
    if (!concept.trim()) return setError('Cargá un concepto');
    if (type === 'INCOME' && selectedServiceIds.length > 0 && !professionalId) {
      return setError('Elegí qué profesional realizó los servicios');
    }
    if (hasTip && !professionalId) {
      return setError('Elegí para qué profesional es la propina');
    }

    setSubmitting(true);
    try {
      await createTransaction({
        type,
        amount,
        paymentMethod,
        concept,
        clientId: type === 'INCOME' ? selectedClientId ?? undefined : undefined,
        tipAmount: hasTip ? tipAmount : undefined,
        tipProfessionalId: hasTip ? professionalId : undefined,
        datetime: `${date}T${time}:00.000Z`,
        services:
          type === 'INCOME' && selectedServiceIds.length > 0
            ? selectedServiceIds.map((serviceId) => ({ serviceId, professionalId }))
            : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Nuevo movimiento" maxWidth="md">
        <div className="mb-4 flex overflow-hidden rounded-lg border border-neutral-300">
          <button
            onClick={() => setType('INCOME')}
            className={`flex-1 py-2 text-sm font-medium ${type === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-600'}`}
          >
            Ingreso
          </button>
          <button
            onClick={() => setType('EXPENSE')}
            className={`flex-1 py-2 text-sm font-medium ${type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-white text-neutral-600'}`}
          >
            Egreso
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
          </div>

          <input
            placeholder="Concepto"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />

          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="w-full">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </Select>

          {type === 'INCOME' && (
            <>
              <div>
                <p className="mb-1 text-sm font-medium text-neutral-700">Clienta (opcional)</p>
                <input
                  placeholder="Buscar por nombre..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClientId(null);
                  }}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                />
                {clientOptions.length > 0 && (
                  <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-neutral-200">
                    {clientOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearch(`${c.firstName} ${c.lastName}`);
                            setClientOptions([]);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-pink-50"
                        >
                          {c.firstName} {c.lastName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-neutral-700">Servicios (opcional, autocompleta el monto)</p>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                        {s.name}
                      </span>
                      <span className="text-neutral-400">${Number(s.price).toLocaleString('es-AR')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(selectedServiceIds.length > 0 || tipAmount > 0) && (
                <Select
                  value={professionalId}
                  onValueChange={setProfessionalId}
                  placeholder={selectedServiceIds.length > 0 ? '¿Quién realizó el/los servicio/s?' : '¿Para qué profesional es la propina?'}
                  className="w-full"
                >
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block text-sm font-medium text-neutral-700">
              Monto
              <input
                type="number"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setAmountTouched(true);
                }}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
            </label>

            {type === 'INCOME' && (
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
            )}
          </div>

          {type === 'INCOME' && tipAmount > 0 && (
            <p className="text-xs text-amber-600">
              La propina se reparte por separado de la comisión, prorrateada entre las profesionales que atendieron según lo que hizo cada
              una.
            </p>
          )}

          {feeApplies && amount > 0 && (
            <p className="text-xs text-neutral-500">
              Se descuenta la comisión de {PAYMENT_METHOD_LABELS[paymentMethod]} configurada — el neto acreditado se calcula automáticamente al guardar.
            </p>
          )}
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
