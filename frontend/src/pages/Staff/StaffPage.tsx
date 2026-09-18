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
    <div className="app-bg min-h-screen p-3 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800">Personal</h1>
        <p className="text-sm text-neutral-500">Profesionales, horarios y asistencia</p>
      </header>

      <div className="mb-5 inline-flex overflow-hidden rounded-full border-2 border-fuchsia-200 bg-white shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'segment-active' : 'segment-inactive'}
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
