import { useState } from 'react';
import { updateTransaction, type Transaction } from '../../api/finance';
import type { PaymentMethod } from '../../api/types';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';
import { Select, SelectItem } from '../../components/ui/select';
import { PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: Props) {
  const [concept, setConcept] = useState(transaction.concept);
  const [amount, setAmount] = useState(Number(transaction.amount));
  const [tipAmount, setTipAmount] = useState(Number(transaction.tipAmount));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (amount <= 0 && tipAmount <= 0) return setError('El monto o la propina deben ser mayores a 0');
    if (!concept.trim()) return setError('Cargá un concepto');
    setSubmitting(true);
    try {
      await updateTransaction(transaction.id, { amount, tipAmount, paymentMethod, concept });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la corrección');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Corregir movimiento" maxWidth="sm">
      <div className="space-y-3">
        <input
          placeholder="Concepto"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />

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
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-amber-700">
            Propina
            <input
              type="number"
              min={0}
              value={tipAmount}
              onChange={(e) => setTipAmount(Number(e.target.value))}
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
          {submitting ? 'Guardando...' : 'Guardar corrección'}
        </button>
      </div>
    </Modal>
  );
}
