import { useState } from 'react';
import TemplatesTab from './TemplatesTab';
import RemindersTab from './RemindersTab';
import CampaignsTab from './CampaignsTab';

const TABS = [
  { id: 'reminders', label: 'Seguimiento de turnos' },
  { id: 'campaigns', label: 'Campañas' },
  { id: 'templates', label: 'Plantillas' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function WhatsappPage() {
  const [tab, setTab] = useState<TabId>('reminders');

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800">WhatsApp</h1>
        <p className="text-sm text-neutral-500">Recordatorios, campañas y plantillas — todo el envío es manual, sin API</p>
      </header>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200">
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

      {tab === 'reminders' && <RemindersTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  );
}
