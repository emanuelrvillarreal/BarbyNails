import { useState } from 'react';
import PersonalTab from './PersonalTab';
import AttendanceTab from './AttendanceTab';

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'attendance', label: 'Asistencia' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function StaffPage() {
  const [tab, setTab] = useState<TabId>('personal');

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800">Personal</h1>
        <p className="text-sm text-neutral-500">Profesionales, horarios y asistencia</p>
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

      {tab === 'personal' && <PersonalTab />}
      {tab === 'attendance' && <AttendanceTab />}
    </div>
  );
}
