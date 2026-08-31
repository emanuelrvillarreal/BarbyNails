import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchPaymentMethodFees, setPaymentMethodFee, type PaymentMethodFee } from '../../api/finance';
import type { PaymentMethod } from '../../api/types';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';
import { today } from '../Agenda/dateUtils';

export default function PaymentMethodFeesSection() {
  const [fees, setFees] = useState<PaymentMethodFee[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingMethod, setSavingMethod] = useState<PaymentMethod | null>(null);

  function load() {
    fetchPaymentMethodFees().then(setFees);
  }

  useEffect(load, []);

  function currentPct(method: PaymentMethod) {
    return fees.find((f) => f.paymentMethod === method);
  }

  function draftValue(method: PaymentMethod) {
    if (method in drafts) return drafts[method];
    return currentPct(method)?.feePct ?? '';
  }

  async function handleSave(method: PaymentMethod) {
    const raw = draftValue(method).trim();
    const pct = Number(raw);
    if (raw === '' || Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('El % tiene que ser un número entre 0 y 100');
      return;
    }
    setSavingMethod(method);
    try {
      await setPaymentMethodFee({ paymentMethod: method, feePct: pct, effectiveFrom: today() });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[method];
        return next;
      });
      load();
      toast.success(`Comisión de ${PAYMENT_METHOD_LABELS[method]} actualizada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la comisión');
    } finally {
      setSavingMethod(null);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
      <h2 className="mb-1 text-base font-bold text-neutral-800">Comisiones por Medio de Pago</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Todo lo que descuenta cada medio de pago se configura acá — impacta directo en Finanzas al calcular el neto de cada cobro. Al
        guardar un nuevo % se aplica desde hoy en adelante; los cobros ya registrados mantienen el % que tenían al momento.
      </p>

      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => {
          const existing = currentPct(method);
          return (
            <div key={method} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-neutral-700">{PAYMENT_METHOD_LABELS[method]}</p>
                <p className="text-xs text-neutral-400">{existing ? `Actual: ${existing.feePct}%` : 'Sin comisión configurada (0%)'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={draftValue(method)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [method]: e.target.value }))}
                  placeholder="0"
                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-right text-sm focus:border-pink-400"
                />
                <span className="text-sm text-neutral-500">%</span>
                <button
                  onClick={() => handleSave(method)}
                  disabled={savingMethod === method}
                  className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                >
                  {savingMethod === method ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
