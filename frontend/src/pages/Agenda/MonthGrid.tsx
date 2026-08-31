import type { Appointment } from '../../api/types';
import { getMonthMatrix, today } from './dateUtils';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface MonthGridProps {
  monthDateKey: string;
  appointmentsByDate: Record<string, Appointment[]>;
  birthdaysByDate?: Record<string, string[]>;
  onDayClick: (dateKey: string) => void;
}

export default function MonthGrid({ monthDateKey, appointmentsByDate, birthdaysByDate, onDayClick }: MonthGridProps) {
  const weeks = getMonthMatrix(monthDateKey);
  const currentMonth = monthDateKey.slice(0, 7);
  const todayKey = today();

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-semibold text-neutral-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((dateKey) => {
          const inMonth = dateKey.slice(0, 7) === currentMonth;
          const dow = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
          const isClosedDay = dow === 0 || dow === 1; // domingo y lunes: el salon no atiende
          const isToday = dateKey === todayKey;
          const dayNumber = Number(dateKey.slice(8, 10));

          const appts = (appointmentsByDate[dateKey] ?? []).filter((a) => a.status !== 'CANCELLED');
          const pendingCount = appts.filter((a) => a.status === 'PENDING').length;
          const confirmedCount = appts.filter((a) => a.status === 'CONFIRMED').length;
          const birthdayNames = birthdaysByDate?.[dateKey] ?? [];

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDayClick(dateKey)}
              className={`flex min-h-24 flex-col items-start gap-1 border-b border-r border-neutral-100 p-2 text-left transition-colors last:border-r-0 ${
                inMonth ? (isClosedDay ? 'bg-neutral-50/60' : 'bg-white hover:bg-pink-50') : 'bg-neutral-50/40 text-neutral-300 hover:bg-neutral-100'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-sm'
                    : inMonth
                      ? 'text-neutral-600'
                      : 'text-neutral-300'
                }`}
              >
                {dayNumber}
              </span>

              {inMonth && birthdayNames.length > 0 && (
                <span
                  className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 shadow-sm"
                  title={birthdayNames.join(', ')}
                >
                  🎂 {birthdayNames.length === 1 ? birthdayNames[0].split(' ')[0] : `${birthdayNames.length} cumples`}
                </span>
              )}

              {inMonth && isClosedDay && <span className="text-[10px] text-neutral-300">Cerrado</span>}

              {inMonth && !isClosedDay && (pendingCount > 0 || confirmedCount > 0) && (
                <div className="flex flex-wrap gap-1">
                  {pendingCount > 0 && (
                    <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {pendingCount} pend.
                    </span>
                  )}
                  {confirmedCount > 0 && (
                    <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {confirmedCount} conf.
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
