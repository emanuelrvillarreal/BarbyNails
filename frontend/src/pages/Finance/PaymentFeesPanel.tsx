import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../../api/client';
import { today } from '../Agenda/dateUtils';
import { Modal } from '../../components/ui/dialog';
import { Select, SelectItem } from '../../components/ui/select';

interface Fee {
  id: string;
  paymentMethod: 'MP_QR' | 'MP_POINT';
  feePct: string;
  effectiveFrom: string;
}

export default function PaymentFeesPanel({ onClose }: { onClose: () => void }) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [method, setMethod] = useState<'MP_QR' | 'MP_POINT'>('MP_QR');
  const [pct, setPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<Fee[]>('/finance/payment-method-fees').then(setFees);
  }

  useEffect(load, []);

  const currentQr = fees.find((f) => f.paymentMethod === 'MP_QR');
  const currentPoint = fees.find((f) => f.paymentMethod === 'MP_POINT');

  async function handleSave() {
    setSubmitting(true);
    try {
      await apiFetch('/finance/payment-method-fees', {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: method, feePct: pct, effectiveFrom: today() }),
      });
      toast.success('Comisión actualizada');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la comisión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Comisiones de Mercado Pago" maxWidth="sm">
      <div className="mb-4 space-y-1 text-sm text-neutral-600">
        <p>QR actual: {currentQr ? `${currentQr.feePct}%` : 'sin configurar'}</p>
        <p>Point actual: {currentPoint ? `${currentPoint.feePct}%` : 'sin configurar'}</p>
      </div>

      <p className="mb-2 text-xs text-neutral-500">
        Al guardar un nuevo % se aplica desde hoy en adelante — los cobros ya registrados mantienen el % que tenían al momento.
      </p>

      <div className="flex items-end gap-2">
        <Select value={method} onValueChange={(v) => setMethod(v as 'MP_QR' | 'MP_POINT')}>
          <SelectItem value="MP_QR">MP QR</SelectItem>
          <SelectItem value="MP_POINT">MP Point</SelectItem>
        </Select>
        <input
          type="number"
          step="0.01"
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-24 rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm outline-none focus:border-pink-400"
        />
        <button onClick={handleSave} disabled={submitting} className="btn-primary">
          Guardar
        </button>
      </div>
    </Modal>
  );
}
