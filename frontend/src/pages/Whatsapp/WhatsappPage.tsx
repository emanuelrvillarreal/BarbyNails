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
    <div className="app-bg min-h-screen p-3 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800">WhatsApp</h1>
        <p className="text-sm text-neutral-500">Recordatorios, campañas y plantillas — todo el envío es manual, sin API</p>
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

      {tab === 'reminders' && <RemindersTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  );
}
