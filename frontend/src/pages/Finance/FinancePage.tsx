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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800">Finanzas</h1>
          <p className="text-sm text-neutral-500">Ingresos, egresos, caja diaria y comisiones</p>
        </div>
      </header>

      <div className="mb-5 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'tab-item-active' : 'tab-item'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'movements' && <MovementsTab />}
      {tab === 'cash' && <CashRegisterTab />}
      {tab === 'commissions' && <CommissionsTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}
