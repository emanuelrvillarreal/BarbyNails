import { useEffect, useState } from 'react';
import { fetchMyClients, type MyClient } from '../../api/agenda';
import MyClientDetailModal from './MyClientDetailModal';

export default function MyClientsPage() {
  const [clients, setClients] = useState<MyClient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyClients().then(setClients);
  }, []);

  const filtered = clients.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-neutral-800">Mis Clientas</h1>
        <p className="text-sm text-neutral-500">Clientas que tuvieron al menos un turno con vos.</p>
      </header>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="mb-4 w-full max-w-sm rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setSelectedClientId(c.id)} className="text-left font-semibold text-neutral-700">
                {c.firstName} {c.lastName}
                {c.internalNotes && <span className="ml-1.5 text-amber-500" title="Tiene alergias / advertencias cargadas">⚠️</span>}
              </button>
              <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-3xs font-bold text-neutral-600">{c.visitCount} turnos</span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs text-neutral-500">
              <div>📞 {c.phone}</div>
              {c.birthday && (
                <div>
                  🎂 {c.birthday.slice(8, 10)}/{c.birthday.slice(5, 7)}
                </div>
              )}
              <div>Última vez con vos: {c.lastVisit.slice(0, 10)}</div>
            </div>

            <div className="mt-3 border-t border-neutral-100 pt-2.5">
              <button onClick={() => setSelectedClientId(c.id)} className="rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700 hover:bg-pink-100 transition-colors">
                Ver detalle
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            Todavía no tenés clientas con turnos registrados.
          </p>
        )}
      </div>

      {selectedClientId && <MyClientDetailModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />}
    </div>
  );
}
