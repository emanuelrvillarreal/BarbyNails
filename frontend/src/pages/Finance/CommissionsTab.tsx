import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchCommissionPreview,
  settleCommission,
  fetchSettlements,
  markSettlementPaid,
  createTransaction,
  fetchTransactions,
  deleteTransaction,
  type CommissionPreview,
  type CommissionSettlement,
  type Transaction,
} from '../../api/finance';
import { fetchProfessionals } from '../../api/catalog';
import type { PaymentMethod, Professional } from '../../api/types';
import { today, addDays } from '../Agenda/dateUtils';
import { ApiError } from '../../api/client';
import CommissionRatesMatrix from './CommissionRatesMatrix';
import EditTransactionModal from './EditTransactionModal';
import { Select, SelectItem } from '../../components/ui/select';
import { Modal } from '../../components/ui/dialog';
import { PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';

function AddTipModal({
  professionalId,
  professionalName,
  onClose,
  onSaved,
}: {
  professionalId: string;
  professionalName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (amount <= 0) return setError('El monto de la propina debe ser mayor a 0');
    setSubmitting(true);
    try {
      await createTransaction({
        type: 'INCOME',
        amount: 0,
        tipAmount: amount,
        tipProfessionalId: professionalId,
        paymentMethod,
        concept: 'Propina',
        datetime: `${date}T12:00:00.000Z`,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la propina');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`💰 Agregar propina — ${professionalName}`} maxWidth="sm">
      <div className="space-y-3">
        <p className="text-xs text-neutral-500">
          Para propinas que se dejan aparte del cobro del servicio (ej. cuando la clienta paga después del turno). Se suma directo a esta
          profesional, sin prorratear.
        </p>
        <label className="block text-sm font-medium text-neutral-700">
          Monto de la propina
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            autoFocus
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-medium text-neutral-700">
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Medio
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="mt-1 w-full">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </SelectItem>
              ))}
            </Select>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? 'Guardando...' : 'Guardar propina'}
        </button>
      </div>
    </Modal>
  );
}

export default function CommissionsTab() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [from, setFrom] = useState(addDays(today(), -7));
  const [to, setTo] = useState(today());
  const [preview, setPreview] = useState<CommissionPreview | null>(null);
  const [settlements, setSettlements] = useState<CommissionSettlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRatesMatrix, setShowRatesMatrix] = useState(false);
  const [showAddTip, setShowAddTip] = useState(false);
  const [looseTips, setLooseTips] = useState<Transaction[]>([]);
  const [editingTip, setEditingTip] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchProfessionals().then((list) => {
      setProfessionals(list);
      if (list.length > 0) setProfessionalId(list[0].id);
    });
    fetchSettlements().then(setSettlements);
  }, []);

  function reloadPreview() {
    if (!professionalId) return;
    fetchCommissionPreview(professionalId, new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`))
      .then(setPreview)
      .catch(() => setPreview(null));
  }

  function reloadLooseTips() {
    if (!professionalId) return;
    fetchTransactions({ from: new Date(`${from}T00:00:00.000Z`), to: new Date(`${to}T23:59:59.999Z`) })
      .then((list) => setLooseTips(list.filter((t) => t.tipProfessionalId === professionalId)))
      .catch(() => setLooseTips([]));
  }

  useEffect(reloadPreview, [professionalId, from, to]);
  useEffect(reloadLooseTips, [professionalId, from, to]);

  async function handleDeleteLooseTip(id: string) {
    if (!confirm('¿Borrar esta propina?')) return;
    await deleteTransaction(id);
    reloadLooseTips();
    reloadPreview();
  }

  async function handleSettle() {
    if (!professionalId) return;
    setError(null);
    setSubmitting(true);
    try {
      await settleCommission({ professionalId, periodStart: `${from}T00:00:00.000Z`, periodEnd: `${to}T23:59:59.999Z` });
      fetchSettlements().then(setSettlements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo liquidar');
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePaid(id: string, paid: boolean) {
    await markSettlementPaid(id, paid);
    fetchSettlements().then(setSettlements);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={professionalId} onValueChange={setProfessionalId}>
          {professionals.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </SelectItem>
          ))}
        </Select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <span className="text-neutral-400">a</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <button
          onClick={() => setShowAddTip(true)}
          disabled={!professionalId}
          className="ml-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          💰 Agregar propina
        </button>
        <button
          onClick={() => setShowRatesMatrix(true)}
          className="rounded-lg border border-pink-300 bg-pink-50 px-3 py-1.5 text-sm font-medium text-pink-700 hover:bg-pink-100"
        >
          ⚙️ Comisiones por categoría
        </button>
      </div>

      {preview && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <p className="font-bold text-neutral-800 text-base">
                {preview.professionalName} <span className="text-xs font-normal text-neutral-500">(Comisión: {preview.commissionPct}%)</span>
              </p>
            </div>
            {(() => {
              const prof = professionals.find((p) => p.id === professionalId);
              if (!prof || (!prof.bankAlias && !prof.bankCbu)) return null;
              return (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-emerald-800">Alias: {prof.bankAlias || prof.bankCbu}</span>
                    {prof.bankName && <span className="ml-1 text-emerald-600">({prof.bankName})</span>}
                  </div>
                  {prof.bankAlias && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(prof.bankAlias!);
                        toast.success(`Alias "${prof.bankAlias}" copiado al portapapeles`);
                      }}
                      className="rounded-lg bg-emerald-600 px-2 py-0.5 font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      📋 Copiar Alias
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">Total servicios realizados</p>
              <p className="text-lg font-semibold text-neutral-700">${preview.totalServiceAmount.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="text-xs text-pink-600">Comisión</p>
              <p className="text-lg font-semibold text-pink-700">${preview.totalCommission.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">+ Propinas</p>
              <p className="text-lg font-semibold text-amber-700">${preview.totalTips.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Total a pagar</p>
              <p className="text-lg font-bold text-emerald-700">${preview.grandTotal.toLocaleString('es-AR')}</p>
            </div>
          </div>

          {preview.breakdown.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Categoría</th>
                    <th className="px-3 py-1.5 font-medium text-right">Monto servicios</th>
                    <th className="px-3 py-1.5 font-medium text-right">%</th>
                    <th className="px-3 py-1.5 font-medium text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.breakdown.map((b) => (
                    <tr key={b.categoryId} className="border-t border-neutral-100">
                      <td className="px-3 py-1.5 text-neutral-700">
                        {b.categoryName}
                        {b.isOverride && (
                          <span className="ml-1.5 rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-700">excepción</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right text-neutral-500">${b.serviceAmount.toLocaleString('es-AR')}</td>
                      <td className="px-3 py-1.5 text-right text-neutral-500">{b.commissionPct}%</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-neutral-700">${b.commissionAmount.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {looseTips.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">Propinas sueltas cargadas en este período</p>
              <div className="space-y-1.5">
                {looseTips.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs">
                    <span className="text-neutral-600">
                      {t.datetime.slice(0, 10)} — {t.concept}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700">${Number(t.tipAmount).toLocaleString('es-AR')}</span>
                      {!t.cashRegisterId && (
                        <>
                          <button onClick={() => setEditingTip(t)} className="link-action">
                            Corregir
                          </button>
                          <button onClick={() => handleDeleteLooseTip(t.id)} className="link-action-muted">
                            Borrar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSettle}
            disabled={submitting || preview.totalServiceAmount === 0}
            className="mt-4 btn-primary"
          >
            {submitting ? 'Liquidando...' : 'Liquidar este periodo'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <h3 className="mb-2 text-sm font-medium text-neutral-700">Liquidaciones generadas</h3>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Profesional</th>
              <th className="px-4 py-2 font-medium">Datos de Transferencia</th>
              <th className="px-4 py-2 font-medium">Periodo</th>
              <th className="px-4 py-2 font-medium">%</th>
              <th className="px-4 py-2 font-medium">Comisión</th>
              <th className="px-4 py-2 font-medium">Propinas</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => {
              const prof = professionals.find((p) => p.id === s.professionalId);
              return (
                <tr key={s.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 text-neutral-700 font-medium">
                    {s.professional.firstName} {s.professional.lastName}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {prof?.bankAlias ? (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(prof.bankAlias!);
                          toast.success(`Alias "${prof.bankAlias}" copiado al portapapeles`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <span>{prof.bankAlias}</span>
                        <span>📋</span>
                      </button>
                    ) : (
                      <span className="text-neutral-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {s.periodStart.slice(0, 10)} a {s.periodEnd.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{Number(s.commissionPctApplied).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-neutral-700">${Number(s.totalCommission).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 text-amber-700">${Number(s.totalTips).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 font-bold text-emerald-800">
                    ${(Number(s.totalCommission) + Number(s.totalTips)).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => togglePaid(s.id, !s.paid)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        s.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.paid ? 'Pagada' : 'Pendiente'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {settlements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  Todavia no se generaron liquidaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showRatesMatrix && (
        <CommissionRatesMatrix
          onClose={() => {
            setShowRatesMatrix(false);
            if (professionalId) {
              fetchCommissionPreview(professionalId, new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`))
                .then(setPreview)
                .catch(() => {});
            }
          }}
        />
      )}

      {showAddTip && professionalId && (
        <AddTipModal
          professionalId={professionalId}
          professionalName={professionals.find((p) => p.id === professionalId)?.firstName ?? ''}
          onClose={() => setShowAddTip(false)}
          onSaved={() => {
            setShowAddTip(false);
            reloadPreview();
            reloadLooseTips();
            toast.success('Propina agregada');
          }}
        />
      )}

      {editingTip && (
        <EditTransactionModal
          transaction={editingTip}
          onClose={() => setEditingTip(null)}
          onSaved={() => {
            setEditingTip(null);
            reloadPreview();
            reloadLooseTips();
            toast.success('Propina corregida');
          }}
        />
      )}
    </div>
  );
}
