import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchAttendance, setAttendanceStatus, downloadAttendanceReport, type AttendanceEntry, type AttendanceStatus } from '../../api/staff';
import { today } from '../Agenda/dateUtils';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; className: string }[] = [
  { value: 'PRESENT', label: 'Presente', className: 'bg-emerald-500 text-white shadow-xs font-semibold' },
  { value: 'LATE', label: 'Llegó tarde', className: 'bg-amber-500 text-white shadow-xs font-semibold' },
  { value: 'EARLY_DEPARTURE', label: 'Salió antes', className: 'bg-orange-500 text-white shadow-xs font-semibold' },
  { value: 'ABSENT', label: 'Ausente', className: 'bg-rose-500 text-white shadow-xs font-semibold' },
  { value: 'JUSTIFIED_ABSENCE', label: 'Ausencia justificada', className: 'bg-slate-500 text-white shadow-xs font-semibold' },
];

export default function AttendanceTab() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Estado local para edicion de horas y notas por profesional
  const [editing, setEditing] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        checkInTime: string;
        checkOutTime: string;
        notes: string;
      }
    >
  >({});

  function load() {
    fetchAttendance(date).then((res) => {
      setEntries(res);
      const initialMap: Record<string, any> = {};
      res.forEach(({ professional, record }) => {
        initialMap[professional.id] = {
          status: record?.status || 'PRESENT',
          checkInTime: record?.checkInTime ? record.checkInTime.slice(11, 16) : '',
          checkOutTime: record?.checkOutTime ? record.checkOutTime.slice(11, 16) : '',
          notes: record?.notes || '',
        };
      });
      setEditing(initialMap);
    });
  }

  useEffect(load, [date]);

  async function handleSaveRow(professionalId: string) {
    const row = editing[professionalId];
    if (!row) return;
    await setAttendanceStatus({
      professionalId,
      date,
      status: row.status,
      checkInTime: row.checkInTime || null,
      checkOutTime: row.checkOutTime || null,
      notes: row.notes || null,
    });
    load();
  }

  async function handleQuickStatusChange(professionalId: string, status: AttendanceStatus) {
    const current = editing[professionalId] || {};
    const updatedRow = { ...current, status };
    setEditing((prev) => ({ ...prev, [professionalId]: updatedRow }));

    await setAttendanceStatus({
      professionalId,
      date,
      status,
      checkInTime: current.checkInTime || null,
      checkOutTime: current.checkOutTime || null,
      notes: current.notes || null,
    });
    load();
  }

  async function handleExportMonth() {
    setDownloading(true);
    try {
      const yearMonth = date.slice(0, 7);
      const from = `${yearMonth}-01`;
      // Obtener fin del mes seleccionado
      const [yearStr, monthStr] = yearMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      await downloadAttendanceReport(from, to);
    } catch (err) {
      toast.error('Ocurrió un error al descargar la planilla de asistencia.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Fecha:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-2xs focus:border-rose-400 focus:outline-hidden"
          />
        </div>

        <button
          onClick={handleExportMonth}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {downloading ? 'Descargando...' : '📊 Descargar Excel (Mes)'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">Profesional</th>
              <th className="px-4 py-3 font-semibold">Entrada</th>
              <th className="px-4 py-3 font-semibold">Salida</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Observaciones (Tardanza / Salida)</th>
              <th className="px-4 py-3 font-semibold text-right">Guardar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entries.map(({ professional, record }) => {
              const state = editing[professional.id] || {
                status: record?.status || 'PRESENT',
                checkInTime: record?.checkInTime ? record.checkInTime.slice(11, 16) : '',
                checkOutTime: record?.checkOutTime ? record.checkOutTime.slice(11, 16) : '',
                notes: record?.notes || '',
              };

              return (
                <tr key={professional.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-800">
                      {professional.firstName} {professional.lastName}
                    </div>
                    {professional.position && <div className="text-xs text-neutral-400">{professional.position}</div>}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={state.checkInTime}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [professional.id]: { ...state, checkInTime: e.target.value },
                        }))
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium focus:border-rose-400 focus:outline-hidden"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={state.checkOutTime}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [professional.id]: { ...state, checkOutTime: e.target.value },
                        }))
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium focus:border-rose-400 focus:outline-hidden"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleQuickStatusChange(professional.id, opt.value)}
                          className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                            state.status === opt.value
                              ? opt.className
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Ej: Llegó 15m tarde / Permiso médica..."
                      value={state.notes}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [professional.id]: { ...state, notes: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-neutral-300 px-2.5 py-1 text-xs focus:border-rose-400 focus:outline-hidden"
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSaveRow(professional.id)}
                      className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 active:scale-95 transition-all"
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No hay profesionales activas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
