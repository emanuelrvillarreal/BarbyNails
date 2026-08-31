import { useState } from 'react';
import type { Professional } from '../../api/types';
import { createProfessional, updateProfessional, createProfessionalLogin } from '../../api/staff';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';

const DAYS = [
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
];

interface Props {
  professional: Professional | null;
  onClose: () => void;
  onSaved: () => void;
}

function timeFromIso(iso?: string | null) {
  if (!iso || typeof iso !== 'string' || iso.length < 16) return '09:00';
  return iso.slice(11, 16);
}

export default function ProfessionalFormModal({ professional, onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState(professional?.firstName ?? '');
  const [lastName, setLastName] = useState(professional?.lastName ?? '');
  const [phone, setPhone] = useState(professional?.phone ?? '');
  const [email, setEmail] = useState(professional?.email ?? '');
  const [position, setPosition] = useState(professional?.position ?? '');
  const [colorHex, setColorHex] = useState(professional?.colorHex ?? '#f472b6');
  const [commissionPct, setCommissionPct] = useState(professional ? Number(professional.commissionPct) || 30 : 30);
  const [bankAlias, setBankAlias] = useState(professional?.bankAlias ?? '');
  const [bankCbu, setBankCbu] = useState(professional?.bankCbu ?? '');
  const [bankName, setBankName] = useState(professional?.bankName ?? '');

  // Si es alta nueva o sin horarios cargados, arrancamos con Martes a Sábado 9-18 ya tildado
  const schedulesList = Array.isArray(professional?.schedules) ? professional.schedules : [];
  const initialDays = new Set(
    schedulesList.length > 0 ? schedulesList.map((s) => s.dayOfWeek) : DAYS.map((d) => d.value),
  );
  const [activeDays, setActiveDays] = useState<Set<number>>(initialDays);
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>(
    schedulesList.length > 0
      ? Object.fromEntries(schedulesList.map((s) => [s.dayOfWeek, { start: timeFromIso(s.startTime), end: timeFromIso(s.endTime) }]))
      : Object.fromEntries(DAYS.map((d) => [d.value, { start: '09:00', end: '18:00' }])),
  );

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCreated, setLoginCreated] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(day: number) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
    setDayTimes((prev) => (prev[day] ? prev : { ...prev, [day]: { start: '09:00', end: '18:00' } }));
  }

  async function handleSubmit() {
    setError(null);
    if (!firstName || !lastName) return setError('Nombre y apellido son obligatorios');
    if (activeDays.size === 0) {
      return setError('Marcá al menos un día de atención — si no, no va a poder recibir turnos en la Agenda');
    }

    const schedules = Array.from(activeDays).map((day) => ({
      dayOfWeek: day,
      startTime: `1970-01-01T${dayTimes[day]?.start ?? '09:00'}:00.000Z`,
      endTime: `1970-01-01T${dayTimes[day]?.end ?? '18:00'}:00.000Z`,
    }));

    setSubmitting(true);
    try {
      const input = {
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
        position: position || undefined,
        bankAlias: bankAlias || undefined,
        bankCbu: bankCbu || undefined,
        bankName: bankName || undefined,
        colorHex,
        commissionPct,
        displayOrder: professional?.displayOrder ?? 99,
        schedules,
      };
      if (professional) {
        await updateProfessional(professional.id, input);
      } else {
        await createProfessional(input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateLogin() {
    if (!professional) return;
    setError(null);
    try {
      await createProfessionalLogin(professional.id, { email: loginEmail, password: loginPassword });
      setLoginCreated(loginEmail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el acceso');
    }
  }

  return (
    <Modal open onClose={onClose} title={professional ? 'Editar profesional' : 'Nueva profesional'} maxWidth="md">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
            <input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
            <input placeholder="Puesto (ej. Manicurista)" value={position} onChange={(e) => setPosition(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2" />
          </div>

          <div>
            <input placeholder="Email (ej. profesional@barbynails.com)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">💳 Datos Bancarios (para transferencias)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input placeholder="Alias (ej: barby.mp)" value={bankAlias} onChange={(e) => setBankAlias(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold bg-white" />
              <input placeholder="Banco (ej. Mercado Pago)" value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white" />
            </div>
            <input placeholder="CBU / CVU (22 dígitos)" value={bankCbu} onChange={(e) => setBankCbu(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs bg-white font-mono" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-neutral-500">
              Color en agenda
              <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-300" />
            </label>
            <label className="text-xs text-neutral-500">
              % Comision
              <input type="number" value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
            </label>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700">Horario de atencion</p>
            <div className="space-y-1.5 rounded-lg border border-neutral-200 p-2">
              {DAYS.map((d) => (
                <div key={d.value} className="flex items-center gap-2 text-sm">
                  <label className="flex w-24 items-center gap-1.5">
                    <input type="checkbox" checked={activeDays.has(d.value)} onChange={() => toggleDay(d.value)} />
                    {d.label}
                  </label>
                  {activeDays.has(d.value) && (
                    <>
                      <input
                        type="time"
                        value={dayTimes[d.value]?.start ?? '09:00'}
                        onChange={(e) => setDayTimes((prev) => ({ ...prev, [d.value]: { ...prev[d.value], start: e.target.value, end: prev[d.value]?.end ?? '18:00' } }))}
                        className="rounded border border-neutral-300 px-2 py-1"
                      />
                      <span className="text-neutral-400">a</span>
                      <input
                        type="time"
                        value={dayTimes[d.value]?.end ?? '18:00'}
                        onChange={(e) => setDayTimes((prev) => ({ ...prev, [d.value]: { ...prev[d.value], end: e.target.value, start: prev[d.value]?.start ?? '09:00' } }))}
                        className="rounded border border-neutral-300 px-2 py-1"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {professional && (
          <div className="mt-5 border-t border-neutral-200 pt-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Acceso al sistema</p>
            {loginCreated ? (
              <p className="text-sm text-emerald-600">Usuario creado: {loginCreated}</p>
            ) : (
              <div className="space-y-2">
                <input placeholder="Email de acceso" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                <input placeholder="Contraseña" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                <button onClick={handleCreateLogin} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                  Crear acceso
                </button>
              </div>
            )}
          </div>
        )}
    </Modal>
  );
}
