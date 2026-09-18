import { useState } from 'react';
import MovementsTab from './MovementsTab';
import CashRegisterTab from './CashRegisterTab';
import CommissionsTab from './CommissionsTab';
import ReportsTab from './ReportsTab';

const TABS = [
  { id: 'movements', label: 'Movimientos' },
  { id: 'cash', label: 'Caja diaria' },
  { id: 'commissions', label: 'Comisiones' },
  { id: 'reports', label: 'Reportes' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function FinancePage() {
  const [tab, setTab] = useState<TabId>('movements');

  return (
    <div className="app-bg min-h-screen p-3 sm:p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800">Finanzas</h1>
          <p className="text-sm text-neutral-500">Ingresos, egresos, caja diaria y comisiones</p>
        </div>
      </header>

      <div className="mb-5 max-w-full overflow-x-auto pb-1">
      <div className="inline-flex overflow-hidden rounded-full border-2 border-fuchsia-200 bg-white shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'segment-active whitespace-nowrap' : 'segment-inactive whitespace-nowrap'}
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>

      {tab === 'movements' && <MovementsTab />}
      {tab === 'cash' && <CashRegisterTab />}
      {tab === 'commissions' && <CommissionsTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}
