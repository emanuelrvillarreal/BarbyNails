import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { fetchCommissionRates, setCommissionRate, deleteCommissionRate, type CommissionRate } from '../../api/finance';
import { fetchCategories } from '../../api/catalog';
import { fetchProfessionals } from '../../api/staff';
import type { Professional, ServiceCategory } from '../../api/types';
import { ApiError } from '../../api/client';
import { Modal } from '../../components/ui/dialog';

interface Props {
  onClose: () => void;
}

export default function CommissionRatesMatrix({ onClose }: Props) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchProfessionals().then(setProfessionals);
    fetchCategories().then(setCategories);
    fetchCommissionRates().then(setRates);
  }

  useEffect(load, []);

  function cellKey(professionalId: string, categoryId: string) {
    return `${professionalId}:${categoryId}`;
  }

  function getRate(professionalId: string, categoryId: string) {
    return rates.find((r) => r.professionalId === professionalId && r.categoryId === categoryId);
  }

  function getDraftValue(professionalId: string, categoryId: string) {
    const key = cellKey(professionalId, categoryId);
    if (key in drafts) return drafts[key];
    const existing = getRate(professionalId, categoryId);
    return existing ? existing.commissionPct : '';
  }

  async function saveCell(professional: Professional, category: ServiceCategory) {
    const key = cellKey(professional.id, category.id);
    if (!(key in drafts)) return;

    const raw = drafts[key].trim();
    setError(null);
    setSavingKey(key);
    try {
      if (raw === '') {
        await deleteCommissionRate(professional.id, category.id);
      } else {
        const pct = Number(raw);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          setError('El % tiene que ser un numero entre 0 y 100');
          return;
        }
        await setCommissionRate({ professionalId: professional.id, categoryId: category.id, commissionPct: pct });
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      load();
      toast.success(`% de ${professional.firstName} en ${category.name} actualizado`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Modal open onClose={onClose} title="Comisiones por categoría" maxWidth="4xl">
        <p className="mb-4 text-sm text-neutral-500">
          Dejá el casillero vacío para usar el % general de cada profesional. Cargá un número solo donde quieras una excepción (ej. Cejas y
          Pestañas con otro %). Se guarda solo al salir del campo, o tocá el ✓ para guardar sin salir del casillero — en ambos casos te
          quedás acá mismo, en esta pantalla.
        </p>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="sticky left-0 bg-neutral-50 px-4 py-2 font-medium">Profesional</th>
                <th className="px-3 py-2 font-medium text-center">% General</th>
                {categories.map((c) => (
                  <th key={c.id} className="px-3 py-2 font-medium text-center">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="sticky left-0 bg-white px-4 py-2 font-medium text-neutral-700">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-3 py-2 text-center text-neutral-400">{p.commissionPct}%</td>
                  {categories.map((c) => {
                    const key = cellKey(p.id, c.id);
                    const isDirty = key in drafts;
                    return (
                      <td key={c.id} className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder={`${p.commissionPct}`}
                            value={getDraftValue(p.id, c.id)}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={() => saveCell(p, c)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            disabled={savingKey === key}
                            className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-center text-sm focus:border-pink-400 disabled:opacity-50"
                          />
                          {isDirty && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => saveCell(p, c)}
                              disabled={savingKey === key}
                              title="Guardar"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs transition-colors hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {professionals.length === 0 && (
                <tr>
                  <td colSpan={2 + categories.length} className="px-4 py-6 text-center text-neutral-400">
                    No hay profesionales cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </Modal>
  );
}
