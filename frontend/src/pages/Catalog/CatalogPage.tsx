import { useEffect, useState } from 'react';
import { fetchCategories, fetchServices, createCategory, updateCategory } from '../../api/catalog';
import type { Service, ServiceCategory } from '../../api/types';
import ServiceFormModal from './ServiceFormModal';
import { ApiError } from '../../api/client';

export default function CatalogPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formService, setFormService] = useState<Service | null | 'new'>(null);

  function load() {
    fetchCategories().then(setCategories);
    fetchServices().then(setServices);
  }

  useEffect(load, []);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ name: newCategoryName.trim(), displayOrder: categories.length + 1 });
      setNewCategoryName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la categoria');
    }
  }

  async function deactivateCategory(id: string) {
    const hasServices = services.some((s) => s.categoryId === id);
    if (hasServices) {
      setError('No podes dar de baja una categoria que todavia tiene servicios activos.');
      return;
    }
    await updateCategory(id, { active: false });
    load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800">Catalogo</h1>
        <p className="text-sm text-neutral-500">Categorias, servicios, precios y duraciones</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button onClick={() => setError(null)} className="underline">
            cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <h2 className="mb-2 text-sm font-medium text-neutral-700">Categorias</h2>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-3 flex gap-2">
              <input
                placeholder="Nueva categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <button
                onClick={addCategory}
                className="rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-pink-500/30 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                +
              </button>
            </div>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-50">
                  {c.name}
                  <button onClick={() => deactivateCategory(c.id)} className="link-action-muted">
                    Dar de baja
                  </button>
                </li>
              ))}
              {categories.length === 0 && <li className="px-2 py-1.5 text-sm text-neutral-400">Sin categorias todavia.</li>}
            </ul>
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-700">Servicios</h2>
            <button
              onClick={() => setFormService('new')}
              disabled={categories.length === 0}
              className="btn-primary"
            >
              + Nuevo servicio
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium">Precio</th>
                  <th className="px-4 py-2 font-medium">Duracion</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-medium text-neutral-700">{s.name}</td>
                    <td className="px-4 py-2 text-neutral-500">{s.category.name}</td>
                    <td className="px-4 py-2 text-neutral-500">${Number(s.price).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-2 text-neutral-500">
                      {s.durationMinutes}min{s.bufferMinutes > 0 && ` + ${s.bufferMinutes}min tolerancia`}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setFormService(s)} className="link-action">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                      No hay servicios cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {formService && (
        <ServiceFormModal
          service={formService === 'new' ? null : formService}
          categories={categories}
          onClose={() => setFormService(null)}
          onSaved={() => {
            setFormService(null);
            load();
          }}
        />
      )}
    </div>
  );
}
