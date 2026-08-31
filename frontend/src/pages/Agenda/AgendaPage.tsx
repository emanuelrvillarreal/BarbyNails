import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchProfessionals, fetchServices } from '../../api/catalog';
import { fetchAppointments, fetchGaps } from '../../api/agenda';
import { fetchAbsences } from '../../api/staff';
import { fetchClients } from '../../api/clients';
import type { Appointment, Client, GapSlot, Professional, Service } from '../../api/types';
import { addDays, addMonths, dayRange, formatDayLabel, formatMonthLabel, getWeekDays, monthRange, today } from './dateUtils';
import DayGrid from './DayGrid';
import MonthGrid from './MonthGrid';
import AppointmentModal from './AppointmentModal';
import AppointmentDetailModal from './AppointmentDetailModal';
import SelfAttendanceWidget from './SelfAttendanceWidget';

type ViewMode = 'day' | 'week' | 'month';

interface DayData {
  appointments: Appointment[];
  gapsByProfessional: Record<string, GapSlot[]>;
}

export default function AgendaPage() {
  const { session } = useAuth();
  const isOwner = session?.role === 'OWNER' || session?.role === 'SYSADMIN';

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [anchorDate, setAnchorDate] = useState(today());

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dataByDay, setDataByDay] = useState<Record<string, DayData>>({});
  const [absentByDate, setAbsentByDate] = useState<Record<string, Set<string>>>({});
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [birthdayClients, setBirthdayClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const [createModal, setCreateModal] = useState<{ professionalId: string; iso: string } | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const todaySectionRef = useRef<HTMLElement | null>(null);

  const days = useMemo(() => (viewMode === 'day' ? [anchorDate] : getWeekDays(anchorDate)), [viewMode, anchorDate]);

  useEffect(() => {
    if (viewMode === 'week') {
      todaySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [viewMode]);

  const visibleProfessionals = useMemo(() => {
    if (!isOwner && session?.professionalId) {
      return professionals.filter((p) => p.id === session.professionalId);
    }
    return professionals;
  }, [professionals, isOwner, session]);

  useEffect(() => {
    fetchProfessionals().then(setProfessionals).catch(() => setProfessionals([]));
    fetchServices().then(setServices).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (viewMode === 'month' || visibleProfessionals.length === 0) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const entries = await Promise.all(
        days.map(async (dateKey) => {
          const { from, to } = dayRange(dateKey);
          const [appointments, gapsList] = await Promise.all([
            fetchAppointments({ from, to }),
            Promise.all(visibleProfessionals.map((p) => fetchGaps({ from, to, professionalId: p.id }).then((g) => [p.id, g[dateKey] ?? []] as const))),
          ]);
          const gapsByProfessional = Object.fromEntries(gapsList);
          return [dateKey, { appointments, gapsByProfessional }] as const;
        }),
      );
      if (!cancelled) setDataByDay(Object.fromEntries(entries));
    }

    load()
      .catch(() => setDataByDay({}))
      .finally(() => !cancelled && setLoading(false));

    fetchAbsences(days[0], days[days.length - 1])
      .then((absences) => {
        if (cancelled) return;
        const map: Record<string, Set<string>> = {};
        for (const a of absences) {
          (map[a.date] ??= new Set()).add(a.professionalId);
        }
        setAbsentByDate(map);
      })
      .catch(() => !cancelled && setAbsentByDate({}));

    return () => {
      cancelled = true;
    };
  }, [days, visibleProfessionals, viewMode, reloadKey]);

  useEffect(() => {
    if (viewMode !== 'month' || visibleProfessionals.length === 0) return;
    let cancelled = false;
    setLoading(true);

    const { from, to } = monthRange(anchorDate);
    fetchAppointments({ from, to })
      .then((appointments) => !cancelled && setMonthAppointments(appointments))
      .catch(() => !cancelled && setMonthAppointments([]))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [viewMode, anchorDate, visibleProfessionals, reloadKey]);

  useEffect(() => {
    if (!isOwner || viewMode !== 'month') return;
    fetchClients()
      .then((list) => setBirthdayClients(list.filter((c) => c.birthday)))
      .catch(() => setBirthdayClients([]));
  }, [isOwner, viewMode]);

  // Cumpleaños del mes visible: se compara solo mes/dia del nacimiento (el
  // anio de nacimiento no importa), armando la fecha real de este mes para
  // poder marcarla en la celda correspondiente del calendario.
  const birthdaysByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!isOwner || viewMode !== 'month') return map;
    const year = anchorDate.slice(0, 4);
    for (const c of birthdayClients) {
      if (!c.birthday) continue;
      const key = `${year}-${c.birthday.slice(5, 7)}-${c.birthday.slice(8, 10)}`;
      (map[key] ??= []).push(`${c.firstName} ${c.lastName}`);
    }
    return map;
  }, [birthdayClients, anchorDate, isOwner, viewMode]);

  const monthAppointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of monthAppointments) {
      const key = appt.startDatetime.slice(0, 10);
      (map[key] ??= []).push(appt);
    }
    return map;
  }, [monthAppointments]);

  function refresh() {
    setCreateModal(null);
    setDetailAppointment(null);
    setReloadKey((k) => k + 1);
  }

  function navigate(direction: -1 | 1) {
    if (viewMode === 'day') setAnchorDate((d) => addDays(d, direction));
    else if (viewMode === 'week') setAnchorDate((d) => addDays(d, direction * 5));
    else setAnchorDate((d) => addMonths(d, direction));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800">Agenda</h1>
          <p className="text-sm text-neutral-500">{isOwner ? 'Vista general del salon' : 'Tu agenda'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isOwner && <SelfAttendanceWidget />}
          <div className="flex overflow-hidden rounded-xl border-2 border-neutral-200 shadow-sm">
            <button onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'segment-active' : 'segment-inactive'}>
              Día
            </button>
            <button onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'segment-active' : 'segment-inactive'}>
              Semana
            </button>
            <button onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'segment-active' : 'segment-inactive'}>
              Mes
            </button>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border-2 border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-500 shadow-sm transition hover:border-pink-300 hover:text-pink-600"
          >
            ←
          </button>

          {viewMode === 'month' ? (
            <span className="min-w-[160px] rounded-xl border-2 border-neutral-200 px-3 py-1.5 text-center text-sm font-semibold text-neutral-700 shadow-sm">
              {formatMonthLabel(anchorDate)}
            </span>
          ) : (
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="rounded-xl border-2 border-neutral-200 px-3 py-1.5 text-sm font-medium shadow-sm"
            />
          )}

          <button
            onClick={() => navigate(1)}
            className="rounded-xl border-2 border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-500 shadow-sm transition hover:border-pink-300 hover:text-pink-600"
          >
            →
          </button>
        </div>
      </header>

      {loading && <p className="mb-3 text-sm text-neutral-400">Cargando...</p>}

      {viewMode === 'month' ? (
        <MonthGrid
          monthDateKey={anchorDate}
          appointmentsByDate={monthAppointmentsByDate}
          birthdaysByDate={birthdaysByDate}
          onDayClick={(dateKey) => {
            setAnchorDate(dateKey);
            setViewMode('day');
          }}
        />
      ) : (
        <div className="space-y-8">
          {days.map((dateKey) => {
            const data = dataByDay[dateKey] ?? { appointments: [], gapsByProfessional: {} };
            const isToday = dateKey === today();
            return (
              <section key={dateKey} ref={isToday ? todaySectionRef : undefined}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-600">
                  {formatDayLabel(dateKey)}
                  {isToday && (
                    <span className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-2 py-0.5 text-3xs font-bold text-white shadow-sm">
                      HOY
                    </span>
                  )}
                </h2>
                <DayGrid
                  dateKey={dateKey}
                  professionals={visibleProfessionals}
                  appointments={data.appointments}
                  gapsByProfessional={data.gapsByProfessional}
                  absentProfessionalIds={absentByDate[dateKey] ?? new Set()}
                  canCreateAppointments={isOwner}
                  onSlotClick={(professionalId, iso) => {
                    if (!isOwner) return;
                    setCreateModal({ professionalId, iso });
                  }}
                  onAppointmentClick={(appt) => setDetailAppointment(appt)}
                />
              </section>
            );
          })}
        </div>
      )}

      {createModal && (
        <AppointmentModal
          professional={professionals.find((p) => p.id === createModal.professionalId)!}
          services={services}
          startIso={createModal.iso}
          onClose={() => setCreateModal(null)}
          onCreated={refresh}
        />
      )}

      {detailAppointment && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          canEdit={isOwner || detailAppointment.professionalId === session?.professionalId}
          isOwner={isOwner}
          services={services}
          onClose={() => setDetailAppointment(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  );
}
