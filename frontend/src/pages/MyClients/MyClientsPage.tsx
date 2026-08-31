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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-6">
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

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">🎂 Cumpleaños</th>
              <th className="px-4 py-2 font-medium">Última vez con vos</th>
              <th className="px-4 py-2 font-medium">Turnos</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 transition-colors hover:bg-neutral-50">
                <td className="px-4 py-2 font-medium text-neutral-700">
                  {c.firstName} {c.lastName}
                  {c.internalNotes && <span className="ml-1.5 text-amber-500" title="Tiene alergias / advertencias cargadas">⚠️</span>}
                </td>
                <td className="px-4 py-2 text-neutral-500">{c.phone}</td>
                <td className="px-4 py-2 text-neutral-500">
                  {c.birthday ? `${c.birthday.slice(8, 10)}/${c.birthday.slice(5, 7)}` : <span className="text-neutral-300">—</span>}
                </td>
                <td className="px-4 py-2 text-neutral-500">{c.lastVisit.slice(0, 10)}</td>
                <td className="px-4 py-2 text-neutral-500">{c.visitCount}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setSelectedClientId(c.id)} className="link-action">
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Todavía no tenés clientas con turnos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClientId && <MyClientDetailModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />}
    </div>
  );
}
