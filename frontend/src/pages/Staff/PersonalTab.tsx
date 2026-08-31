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

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Puesto</th>
              <th className="px-4 py-2 font-medium">Alias / CBU Transferencia</th>
              <th className="px-4 py-2 font-medium">Comision</th>
              <th className="px-4 py-2 font-medium">Dias</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-2 font-medium text-neutral-700">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: p.colorHex }} />
                  {p.firstName} {p.lastName}
                  {p.phone && <div className="text-xs text-neutral-400">📞 {p.phone}</div>}
                </td>
                <td className="px-4 py-2 text-neutral-500">{p.position || '—'}</td>
                <td className="px-4 py-2 text-xs">
                  {p.bankAlias || p.bankCbu ? (
                    <div className="flex items-center gap-1.5">
                      <div>
                        {p.bankAlias && <div className="font-bold text-emerald-800">{p.bankAlias}</div>}
                        {p.bankCbu && <div className="font-mono text-neutral-400 text-3xs">{p.bankCbu}</div>}
                        {p.bankName && <div className="text-neutral-400 text-3xs">{p.bankName}</div>}
                      </div>
                      {p.bankAlias && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(p.bankAlias!);
                            toast.success(`Alias "${p.bankAlias}" copiado al portapapeles`);
                          }}
                          className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title="Copiar Alias"
                        >
                          📋 Copiar Alias
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-300 font-mono">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500">{p.commissionPct}%</td>
                <td className="px-4 py-2 text-neutral-500">
                  {p.schedules.length > 0 ? (
                    p.schedules.map((s) => DAY_LABELS[s.dayOfWeek]).join(' ')
                  ) : (
                    <span className="font-medium text-amber-600">⚠ Sin horario — no va a aparecer en la Agenda</span>
                  )}
                </td>
                <td className="space-x-2 px-4 py-2 text-right">
                  <button onClick={() => setFormProfessional(p)} className="link-action">
                    Editar
                  </button>
                  <button onClick={() => setDeactivatingProf(p)} className="link-action-muted hover:text-red-600 transition-colors">
                    Dar de baja
                  </button>
                </td>
              </tr>
            ))}
            {professionals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  No hay profesionales cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
