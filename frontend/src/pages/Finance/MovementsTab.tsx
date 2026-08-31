import { useEffect, useState } from 'react';
import { fetchTransactions, deleteTransaction, type Transaction } from '../../api/finance';
import { fetchServices, fetchProfessionals } from '../../api/catalog';
import type { Professional, Service } from '../../api/types';
import TransactionFormModal from './TransactionFormModal';
import EditTransactionModal from './EditTransactionModal';
import { today, addDays } from '../Agenda/dateUtils';
import StatCard from '../../components/StatCard';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MP_QR: 'MP QR',
  MP_POINT: 'MP Point',
};

export default function MovementsTab() {
  const [from, setFrom] = useState(addDays(today(), -7));
  const [to, setTo] = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    fetchTransactions({ from: new Date(`${from}T00:00:00.000Z`), to: new Date(`${to}T23:59:59.999Z`) })
      .then(setTransactions)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchServices().then(setServices);
    fetchProfessionals().then(setProfessionals);
  }, []);

  useEffect(load, [from, to]);

  async function handleDelete(id: string) {
    if (!confirm('¿Borrar este movimiento?')) return;
    await deleteTransaction(id);
    load();
  }

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          <span className="text-neutral-400">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nuevo movimiento
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Ingresos" value={`$${totalIncome.toLocaleString('es-AR')}`} icon="💰" tone="income" />
        <StatCard label="Egresos" value={`$${totalExpense.toLocaleString('es-AR')}`} icon="📉" tone="expense" />
        <StatCard label="Balance" value={`$${(totalIncome - totalExpense).toLocaleString('es-AR')}`} icon="⚖️" tone="neutral" />
      </div>

      {loading && <p className="mb-2 text-sm text-neutral-400">Cargando...</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Concepto</th>
              <th className="px-4 py-2 font-medium">Clienta</th>
              <th className="px-4 py-2 font-medium">Medio</th>
              <th className="px-4 py-2 font-medium">Bruto</th>
              <th className="px-4 py-2 font-medium">Propina</th>
              <th className="px-4 py-2 font-medium">Neto</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-500">
                  {t.datetime.slice(0, 10)} {t.datetime.slice(11, 16)}
                </td>
                <td className={`px-4 py-2 font-medium ${t.type === 'INCOME' ? 'text-emerald-700' : 'text-red-700'}`}>{t.concept}</td>
                <td className="px-4 py-2 text-neutral-500">{t.client ? `${t.client.firstName} ${t.client.lastName}` : '—'}</td>
                <td className="px-4 py-2 text-neutral-500">{PAYMENT_METHOD_LABELS[t.paymentMethod]}</td>
                <td className="px-4 py-2 text-neutral-700">${Number(t.amount).toLocaleString('es-AR')}</td>
                <td className="px-4 py-2 text-amber-700">
                  {Number(t.tipAmount) > 0 ? `$${Number(t.tipAmount).toLocaleString('es-AR')}` : <span className="text-neutral-300">—</span>}
                </td>
                <td className="px-4 py-2 text-neutral-500">${Number(t.netAmount).toLocaleString('es-AR')}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  {!t.cashRegisterId && (
                    <>
                      <button onClick={() => setEditingTransaction(t)} className="link-action">
                        Corregir
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="link-action-muted">
                        Borrar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  No hay movimientos en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TransactionFormModal
          services={services}
          professionals={professionals}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={() => {
            setEditingTransaction(null);
            load();
          }}
        />
      )}
    </div>
  );
}
