import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchProfessionals, updateProfessional } from '../../api/staff';
import type { Professional } from '../../api/types';
import ProfessionalFormModal from './ProfessionalFormModal';
import { Modal } from '../../components/ui/dialog';

const DAY_LABELS: Record<number, string> = { 2: 'Ma', 3: 'Mi', 4: 'Ju', 5: 'Vi', 6: 'Sa' };

export default function PersonalTab() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [formProfessional, setFormProfessional] = useState<Professional | null | 'new'>(null);
  const [deactivatingProf, setDeactivatingProf] = useState<Professional | null>(null);
  const [submittingDeactivate, setSubmittingDeactivate] = useState(false);

  function load() {
    fetchProfessionals().then(setProfessionals);
  }

  useEffect(load, []);

  async function handleConfirmDeactivate() {
    if (!deactivatingProf) return;
    setSubmittingDeactivate(true);
    try {
      await updateProfessional(deactivatingProf.id, { active: false });
      setDeactivatingProf(null);
      load();
    } catch (err) {
      toast.error('Ocurrió un error al dar de baja a la profesional');
    } finally {
      setSubmittingDeactivate(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setFormProfessional('new')} className="btn-primary">
          + Nueva profesional
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {professionals.map((p) => (
          <div key={p.id} className="card-pop relative flex flex-col overflow-hidden p-4 pt-5">
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${p.colorHex}, ${p.colorHex}99)` }} />

            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white shadow-md ring-2 ring-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]"
                style={{ background: `linear-gradient(135deg, ${p.colorHex}, ${p.colorHex}bb)`, boxShadow: `0 6px 14px -4px ${p.colorHex}88` }}
              >
                {p.firstName.charAt(0).toUpperCase()}
                {p.lastName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-neutral-800">
                  {p.firstName} {p.lastName}
                </p>
                <p className="truncate text-xs font-medium text-fuchsia-700">{p.position || 'Sin puesto'}</p>
                {p.phone && <p className="text-xs text-neutral-500">📞 {p.phone}</p>}
              </div>
              <span className="shrink-0 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-3xs font-bold text-pink-700">
                {p.commissionPct}% comisión
              </span>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-3xs font-bold uppercase tracking-wider text-neutral-400">Días de atención</p>
              {p.schedules.length > 0 ? (
                <div className="flex gap-1">
                  {Object.entries(DAY_LABELS).map(([dow, label]) => {
                    const works = p.schedules.some((s) => s.dayOfWeek === Number(dow));
                    return (
                      <span
                        key={dow}
                        className={`flex h-7 w-8 items-center justify-center rounded-full text-3xs font-bold ${
                          works
                            ? 'bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/30'
                            : 'bg-neutral-100 text-neutral-300'
                        }`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  ⚠ Sin horario — no va a aparecer en la Agenda
                </span>
              )}
            </div>

            <div className="mb-4 mt-3 rounded-2xl border border-neon-500/40 bg-neon-500/10 px-3 py-2">
              <p className="text-3xs font-bold uppercase tracking-wider text-emerald-700">💳 Transferencia</p>
              {p.bankAlias || p.bankCbu ? (
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {p.bankAlias && <p className="truncate text-sm font-bold text-emerald-900">{p.bankAlias}</p>}
                    {p.bankCbu && <p className="truncate font-mono text-3xs text-neutral-500">{p.bankCbu}</p>}
                    {p.bankName && <p className="truncate text-3xs text-neutral-500">{p.bankName}</p>}
                  </div>
                  {p.bankAlias && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(p.bankAlias!);
                        toast.success(`Alias "${p.bankAlias}" copiado al portapapeles`);
                      }}
                      className="shrink-0 rounded-full bg-neon-500 px-3 py-1 text-xs font-bold text-ink shadow-sm shadow-neon-500/40 transition-all hover:-translate-y-0.5 hover:bg-neon-400"
                      title="Copiar Alias"
                    >
                      📋 Copiar
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-neutral-400">Sin datos bancarios cargados</p>
              )}
            </div>

            <div className="mt-auto flex items-center gap-1.5 border-t border-fuchsia-100 pt-3">
              <button
                onClick={() => setFormProfessional(p)}
                className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => setDeactivatingProf(p)}
                className="ml-auto rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                Dar de baja
              </button>
            </div>
          </div>
        ))}
        {professionals.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            No hay profesionales cargadas.
          </p>
        )}
      </div>

      {formProfessional && (
        <ProfessionalFormModal
          professional={formProfessional === 'new' ? null : formProfessional}
          onClose={() => setFormProfessional(null)}
          onSaved={() => {
            setFormProfessional(null);
            load();
          }}
        />
      )}

      {/* Modal de confirmacion para Dar de Baja */}
      {deactivatingProf && (
        <Modal open onClose={() => setDeactivatingProf(null)} title="Confirmar baja de profesional" maxWidth="md">
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-600 shadow-xs">⚠️</span>
            <p className="text-sm font-semibold text-neutral-700">
              ¿Desea dar de baja a la Profesional{' '}
              <span className="font-bold text-red-700">
                {deactivatingProf.firstName} {deactivatingProf.lastName}
              </span>
              ?
            </p>
            <p className="mt-1 text-xs text-neutral-500">Deja de aparecer en la agenda, pero se conserva su historial.</p>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={() => setDeactivatingProf(null)}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              disabled={submittingDeactivate}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {submittingDeactivate ? 'Dando de baja...' : 'Sí, dar de baja'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
