import { useEffect, useState } from 'react';
import { fetchReportSummary, type ReportSummary } from '../../api/finance';
import type { PaymentMethod } from '../../api/types';
import { today, addDays } from '../Agenda/dateUtils';
import StatCard from '../../components/StatCard';
import { PAYMENT_METHOD_LABELS } from '../../constants/paymentMethods';

type Preset = 'week' | 'month' | 'custom';

export default function ReportsTab() {
  const [preset, setPreset] = useState<Preset>('week');
  const [from, setFrom] = useState(addDays(today(), -7));
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    if (preset === 'week') setFrom(addDays(today(), -7));
    if (preset === 'month') setFrom(addDays(today(), -30));
    if (preset !== 'custom') setTo(today());
  }, [preset]);

  useEffect(() => {
    fetchReportSummary(new Date(`${from}T00:00:00.000Z`), new Date(`${to}T23:59:59.999Z`)).then(setSummary);
  }, [from, to]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border-2 border-neutral-200 shadow-sm">
          {(['week', 'month', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={preset === p ? 'segment-active' : 'segment-inactive'}
            >
              {p === 'week' ? 'Ultima semana' : p === 'month' ? 'Ultimo mes' : 'Personalizado'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            <span className="text-neutral-400">a</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          </>
        )}
      </div>

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <StatCard label="Ingresos" value={`$${summary.totalIncome.toLocaleString('es-AR')}`} icon="💰" tone="income" />
            <StatCard label="Egresos" value={`$${summary.totalExpense.toLocaleString('es-AR')}`} icon="📉" tone="expense" />
            <StatCard label="Balance" value={`$${summary.balance.toLocaleString('es-AR')}`} icon="⚖️" tone="neutral" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-700">Por medio de pago</h3>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Medio</th>
                      <th className="px-4 py-2 font-medium">Bruto</th>
                      <th className="px-4 py-2 font-medium">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byPaymentMethod).map(([method, v]) => (
                      <tr key={method} className="border-t border-neutral-100">
                        <td className="px-4 py-2 text-neutral-700">{PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method}</td>
                        <td className="px-4 py-2 text-neutral-500">${v.gross.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-2 text-neutral-500">${v.net.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                    {Object.keys(summary.byPaymentMethod).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-neutral-400">
                          Sin datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-700">Por profesional</h3>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Profesional</th>
                      <th className="px-4 py-2 font-medium">Total servicios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byProfessional).map(([id, v]) => (
                      <tr key={id} className="border-t border-neutral-100">
                        <td className="px-4 py-2 text-neutral-700">{v.name}</td>
                        <td className="px-4 py-2 text-neutral-500">${v.totalServiceAmount.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                    {Object.keys(summary.byProfessional).length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-neutral-400">
                          Sin datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
