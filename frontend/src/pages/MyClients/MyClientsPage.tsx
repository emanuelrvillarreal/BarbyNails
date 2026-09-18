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
    <div className="app-bg min-h-screen p-3 sm:p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-neutral-800">Mis Clientas</h1>
        <p className="text-sm text-neutral-500">Clientas que tuvieron al menos un turno con vos.</p>
      </header>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="mb-4 w-full max-w-sm rounded-full border-2 border-fuchsia-200 bg-white px-4 py-2 text-sm outline-none focus:border-fuchsia-400"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="card-pop relative overflow-hidden p-4 pt-5">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-neon-500 via-fuchsia-500 to-pink-500" />

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 font-display text-sm font-bold text-white shadow-md shadow-fuchsia-500/30 ring-2 ring-white">
                {c.firstName.charAt(0).toUpperCase()}
                {c.lastName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <button onClick={() => setSelectedClientId(c.id)} className="block max-w-full truncate text-left font-display text-base font-bold text-neutral-800 hover:text-fuchsia-700">
                  {c.firstName} {c.lastName}
                  {c.internalNotes && <span className="ml-1.5 text-amber-500" title="Tiene alergias / advertencias cargadas">⚠️</span>}
                </button>
                <p className="text-xs text-neutral-500">📞 {c.phone}</p>
              </div>
              <span className="shrink-0 rounded-full border border-fuchsia-300 bg-fuchsia-100 px-2.5 py-1 text-3xs font-bold text-fuchsia-700">
                {c.visitCount} turnos
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {c.birthday && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                  🎂 {c.birthday.slice(8, 10)}/{c.birthday.slice(5, 7)}
                </span>
              )}
              <span className="rounded-full border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-1 font-medium text-fuchsia-800">
                🗓️ Última vez con vos: {c.lastVisit.slice(0, 10)}
              </span>
            </div>

            <div className="mt-4 border-t border-fuchsia-100 pt-3">
              <button
                onClick={() => setSelectedClientId(c.id)}
                className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
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
