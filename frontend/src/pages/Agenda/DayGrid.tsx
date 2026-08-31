import type { Appointment, GapSlot, Professional } from '../../api/types';
import { minutesFromMidnight } from './dateUtils';
import { STATUS_STYLES } from './statusColors';

const SLOT_MINUTES = 30;
const ROW_HEIGHT = 32;

function scheduleMinutes(iso: string): number {
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  return h * 60 + m;
}

interface DayGridProps {
  dateKey: string;
  professionals: Professional[];
  appointments: Appointment[];
  gapsByProfessional: Record<string, GapSlot[]>;
  absentProfessionalIds?: Set<string>;
  canCreateAppointments: boolean;
  onSlotClick: (professionalId: string, iso: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function DayGrid({
  dateKey,
  professionals,
  appointments,
  gapsByProfessional,
  absentProfessionalIds,
  canCreateAppointments,
  onSlotClick,
  onAppointmentClick,
}: DayGridProps) {
  const dow = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

  const activeAppointmentsByProfessional = new Map<string, Appointment[]>();
  for (const a of appointments) {
    if (a.status === 'CANCELLED') continue;
    const list = activeAppointmentsByProfessional.get(a.professionalId) ?? [];
    list.push(a);
    activeAppointmentsByProfessional.set(a.professionalId, list);
  }

  // Si no hay horario semanal cargado para este dia pero la profesional tiene
  // turnos igual (ej. quedaron de un horario anterior, o se cargaron a mano),
  // los turnos NUNCA deben desaparecer: se arma un rango "virtual" a partir de
  // esos turnos para que la grilla los siga mostrando.
  const working = professionals.map((p) => {
    const schedule = p.schedules.find((s) => s.dayOfWeek === dow && s.active);
    if (schedule) {
      return { professional: p, schedule, start: scheduleMinutes(schedule.startTime), end: scheduleMinutes(schedule.endTime) };
    }
    const apptsForProf = activeAppointmentsByProfessional.get(p.id) ?? [];
    if (apptsForProf.length > 0) {
      const start = Math.min(...apptsForProf.map((a) => minutesFromMidnight(a.startDatetime)));
      const end = Math.max(...apptsForProf.map((a) => minutesFromMidnight(a.endDatetime)));
      return { professional: p, schedule: undefined, start, end };
    }
    return { professional: p, schedule: undefined, start: null, end: null };
  });

  const activeRanges = working.filter((w) => w.start !== null);
  if (activeRanges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
        Sin atencion este dia
      </div>
    );
  }

  const globalStart = Math.min(...activeRanges.map((w) => w.start!));
  const globalEnd = Math.max(...activeRanges.map((w) => w.end!));
  const slots = Array.from({ length: (globalEnd - globalStart) / SLOT_MINUTES }, (_, i) => globalStart + i * SLOT_MINUTES);

  const activeAppointments = appointments.filter((a) => a.status !== 'CANCELLED');
  const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED');

  function minutesToIso(minutes: number) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${dateKey}T${h}:${m}:00.000Z`;
  }

  return (
    <div>
      <div
        className="grid overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm"
        style={{
          gridTemplateColumns: `56px repeat(${professionals.length}, minmax(140px, 1fr))`,
          gridTemplateRows: `36px repeat(${slots.length}, ${ROW_HEIGHT}px)`,
        }}
      >
        <div className="border-b border-r border-neutral-200 bg-neutral-50" style={{ gridColumn: 1, gridRow: 1 }} />
        {professionals.map((p, colIdx) => {
          const isAbsent = absentProfessionalIds?.has(p.id);
          return (
            <div
              key={p.id}
              className={`flex items-center justify-center gap-1.5 border-b border-r px-2 font-medium ${
                isAbsent ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-200 bg-neutral-50 text-neutral-700'
              }`}
              style={{ gridColumn: colIdx + 2, gridRow: 1 }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.colorHex }} />
              <span className="truncate">{p.firstName}</span>
              {isAbsent && <span className="ml-1 shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold">AUSENTE</span>}
            </div>
          );
        })}

        {slots.map((minutes, rowIdx) => (
          <div
            key={`label-${minutes}`}
            className={`border-b border-r border-neutral-200 px-1 text-right text-[11px] ${
              minutes % 60 === 0 ? 'font-semibold text-neutral-500' : 'text-neutral-400'
            }`}
            style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
          >
            {String(Math.floor(minutes / 60)).padStart(2, '0')}:{String(minutes % 60).padStart(2, '0')}
          </div>
        ))}

        {professionals.map((p, colIdx) => {
          const entry = working.find((w) => w.professional.id === p.id)!;
          const gaps = gapsByProfessional[p.id] ?? [];
          const gapStarts = new Set(gaps.map((g) => minutesFromMidnight(g.start)));
          const isAbsent = absentProfessionalIds?.has(p.id);

          const occupied = new Set<number>();
          activeAppointments
            .filter((a) => a.professionalId === p.id)
            .forEach((a) => {
              const start = minutesFromMidnight(a.startDatetime);
              const end = minutesFromMidnight(a.endDatetime);
              for (let m = start; m < end; m += SLOT_MINUTES) occupied.add(m);
            });

          return slots.map((minutes, rowIdx) => {
            if (occupied.has(minutes)) return null;

            const isClosed = entry.start === null || minutes < entry.start || minutes >= entry.end!;
            const style = { gridColumn: colIdx + 2, gridRow: rowIdx + 2 };

            if (isAbsent) {
              return (
                <div
                  key={`${p.id}-${minutes}`}
                  className="border-b border-r border-neutral-700 bg-neutral-800"
                  style={style}
                  title="Ausente hoy - no se pueden asignar turnos"
                />
              );
            }

            if (isClosed) {
              return <div key={`${p.id}-${minutes}`} className="border-b border-r border-neutral-100 bg-neutral-50" style={style} />;
            }

            if (gapStarts.has(minutes)) {
              if (!canCreateAppointments) {
                return (
                  <div
                    key={`${p.id}-${minutes}`}
                    className="border-b border-r border-dashed border-emerald-300 bg-emerald-50"
                    style={style}
                    title="Hueco libre"
                  />
                );
              }
              return (
                <button
                  key={`${p.id}-${minutes}`}
                  type="button"
                  onClick={() => onSlotClick(p.id, minutesToIso(minutes))}
                  className="group border-b border-r border-dashed border-emerald-300 bg-emerald-50 transition-colors hover:bg-gradient-to-r hover:from-emerald-400 hover:to-teal-400"
                  style={style}
                  title="Hueco libre - click para agendar"
                >
                  <span className="hidden text-xs font-bold text-white group-hover:block">+ Agendar</span>
                </button>
              );
            }

            return <div key={`${p.id}-${minutes}`} className="border-b border-r border-neutral-100" style={style} />;
          });
        })}

        {activeAppointments.map((appt) => {
          const colIdx = professionals.findIndex((p) => p.id === appt.professionalId);
          if (colIdx === -1) return null;

          const startMin = Math.max(minutesFromMidnight(appt.startDatetime), globalStart);
          const endMin = Math.min(minutesFromMidnight(appt.endDatetime), globalEnd);
          const rowStart = Math.round((startMin - globalStart) / SLOT_MINUTES) + 2;
          const rowSpan = Math.max(1, Math.round((endMin - startMin) / SLOT_MINUTES));
          const style = STATUS_STYLES[appt.status];

          return (
            <button
              key={appt.id}
              type="button"
              onClick={() => onAppointmentClick(appt)}
              className={`m-0.5 overflow-hidden rounded-lg px-2 py-1 text-left text-xs leading-tight text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${style.solid}`}
              style={{ gridColumn: colIdx + 2, gridRow: `${rowStart} / span ${rowSpan}` }}
            >
              <div className="truncate font-bold">
                {appt.client.firstName} {appt.client.lastName}
              </div>
              <div className="truncate opacity-90">{appt.services.map((s) => s.service.name).join(', ')}</div>
            </button>
          );
        })}

        {working.map((w, colIdx) => {
          if (w.start !== null) return null;
          return (
            <div
              key={`closed-${w.professional.id}`}
              className="flex items-center justify-center bg-neutral-50/80 px-2 text-center text-xs font-medium text-neutral-400"
              style={{ gridColumn: colIdx + 2, gridRow: `2 / span ${slots.length}` }}
            >
              Sin horario cargado este día
            </div>
          );
        })}
      </div>

      {cancelledAppointments.length > 0 && (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
          <p className="mb-1 font-medium text-neutral-600">Cancelados hoy (el horario ya quedo libre en la grilla):</p>
          <ul className="space-y-0.5">
            {cancelledAppointments.map((appt) => (
              <li key={appt.id}>
                {appt.client.firstName} {appt.client.lastName} — {appt.professional.firstName} —{' '}
                {appt.startDatetime.slice(11, 16)}hs
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
