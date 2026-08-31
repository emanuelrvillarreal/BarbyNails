import { useEffect, useState } from 'react';
import {
  fetchCashRegister,
  openCashRegister,
  closeCashRegister,
  fetchCashRegisterHistory,
  type CashRegisterSummary,
  type CashRegisterRecord,
} from '../../api/finance';
import { today, addDays } from '../Agenda/dateUtils';
import { ApiError } from '../../api/client';
import StatCard from '../../components/StatCard';

export default function CashRegisterTab() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [openingInput, setOpeningInput] = useState(0);
  const [history, setHistory] = useState<CashRegisterRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetchCashRegister(date).then(setSummary);
  }

  useEffect(load, [date]);

  useEffect(() => {
    fetchCashRegisterHistory(new Date(`${addDays(today(), -30)}T00:00:00.000Z`), new Date(`${today()}T23:59:59.999Z`)).then(setHistory);
  }, []);

  async function handleOpen() {
    setError(null);
    setSubmitting(true);
    try {
      await openCashRegister(date, openingInput);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la caja');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!confirm(`¿Cerrar la caja del ${date}? No vas a poder borrar movimientos de ese dia despues.`)) return;
    setError(null);
    setSubmitting(true);
    try {
      await closeCashRegister(date);
      load();
      fetchCashRegisterHistory(new Date(`${addDays(today(), -30)}T00:00:00.000Z`), new Date(`${today()}T23:59:59.999Z`)).then(setHistory);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cerrar la caja');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      {summary && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Apertura" value={`$${summary.openingBalance.toLocaleString('es-AR')}`} icon="🔓" tone="accent" />
            <StatCard label="Ingresos" value={`$${summary.totalIncome.toLocaleString('es-AR')}`} icon="💰" tone="income" />
            <StatCard label="Egresos" value={`$${summary.totalExpense.toLocaleString('es-AR')}`} icon="📉" tone="expense" />
            <StatCard label="Balance" value={`$${summary.balance.toLocaleString('es-AR')}`} icon="⚖️" tone="neutral" />
          </div>

          <p className="mb-3 text-xs text-neutral-400">{summary.transactionCount} movimiento(s) este dia.</p>

          {summary.closed ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              Caja cerrada {summary.closedAt ? `el ${summary.closedAt.slice(0, 10)} a las ${summary.closedAt.slice(11, 16)}` : ''}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={openingInput}
                onChange={(e) => setOpeningInput(Number(e.target.value))}
                placeholder="Monto de apertura"
                className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleOpen}
                disabled={submitting}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Registrar apertura
              </button>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="btn-primary"
              >
                Cerrar caja
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <h3 className="mb-2 text-sm font-medium text-neutral-700">Historial (ultimos 30 dias)</h3>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Apertura</th>
              <th className="px-4 py-2 font-medium">Ingresos</th>
              <th className="px-4 py-2 font-medium">Egresos</th>
              <th className="px-4 py-2 font-medium">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {history
              .filter((h) => h.closedAt)
              .map((h) => (
                <tr key={h.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 text-neutral-700">{h.date.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-neutral-500">${Number(h.openingBalance).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 text-emerald-700">${Number(h.totalIncome ?? 0).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 text-red-700">${Number(h.totalExpense ?? 0).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 font-medium text-neutral-700">${Number(h.closingBalance ?? 0).toLocaleString('es-AR')}</td>
                </tr>
              ))}
            {history.filter((h) => h.closedAt).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Todavia no hay cajas cerradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
