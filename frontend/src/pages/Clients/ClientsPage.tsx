import { useEffect, useState } from 'react';
import { fetchClients, unblacklistClient } from '../../api/clients';
import { fetchServices } from '../../api/catalog';
import type { Client, Service } from '../../api/types';
import ClientFormModal from './ClientFormModal';
import ClientDetailModal from './ClientDetailModal';
import BlacklistModal from './BlacklistModal';

const DEFAULT_PROMO_MESSAGE = 'Hola! Desde Barby Nails & Spa te extrañamos. Tenemos promos esta semana, ¿te gustaria agendar un turno?';

function calculateAge(birthday: string): number {
  const birthDate = new Date(`${birthday.slice(0, 10)}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > birthDate.getUTCMonth() + 1 ||
    (today.getMonth() + 1 === birthDate.getUTCMonth() + 1 && today.getDate() >= birthDate.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVA' | 'INACTIVA'>('ALL');
  const [mainTab, setMainTab] = useState<'active' | 'blacklist'>('active');
  const [loading, setLoading] = useState(false);

  const [formClient, setFormClient] = useState<Client | null | 'new'>(null);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [blacklistTarget, setBlacklistTarget] = useState<Client | null>(null);

  function load() {
    setLoading(true);
    fetchClients({
      search: search || undefined,
      status: mainTab === 'active' && statusFilter !== 'ALL' ? statusFilter : undefined,
      blacklisted: mainTab === 'blacklist',
    })
      .then(setClients)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchServices().then(setServices);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, mainTab]);

  function sendPromo(client: Client) {
    const url = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(DEFAULT_PROMO_MESSAGE)}`;
    window.open(url, '_blank');
  }

  async function handleUnblacklist(client: Client) {
    if (!confirm(`¿Desea reincorporar a ${client.firstName} ${client.lastName} retirándola de la Lista Negra?`)) return;
    await unblacklistClient(client.id);
    load();
  }

  return (
    <div className="app-bg min-h-screen p-3 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800">Clientas</h1>
          <p className="text-sm text-neutral-500">CRM del salón & Gestión de Lista Negra</p>
        </div>
        <button
          onClick={() => setFormClient('new')}
          className="btn-primary"
        >
          + Nueva clienta
        </button>
      </header>

      {/* Pestañas Principales: Activas vs Lista Negra */}
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-neutral-200">
        <button
          onClick={() => setMainTab('active')}
          className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors ${
            mainTab === 'active'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          👥 Clientas Activas
        </button>
        <button
          onClick={() => setMainTab('blacklist')}
          className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            mainTab === 'blacklist'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <span>🚫 Lista Negra (Blacklist)</span>
        </button>
      </div>

      {mainTab === 'active' && (
        <p className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-neutral-200 bg-white/60 px-3 py-2 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activa
          </span>
          <span>= tuvo un turno en los últimos 3 meses.</span>
          <span className="inline-flex items-center gap-1 font-semibold text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Inactiva
          </span>
          <span>= sin turnos hace más de 3 meses — ahí aparece el botón "Enviar promo" para reengancharla por WhatsApp.</span>
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-full border-2 border-fuchsia-200 bg-white px-4 py-2 text-sm shadow-xs focus:border-pink-400 focus:outline-none"
        />
        {mainTab === 'active' && (
          <div className="flex overflow-hidden rounded-full border-2 border-fuchsia-200 shadow-xs">
            {(['ALL', 'ACTIVA', 'INACTIVA'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'segment-active' : 'segment-inactive'}
              >
                {s === 'ALL' ? 'Todas' : s === 'ACTIVA' ? 'Activas' : 'Inactivas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="mb-2 text-sm text-neutral-400">Cargando clientas...</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => (
          <div key={c.id} className="card-pop relative overflow-hidden p-4 pt-5">
            <div
              className={`absolute inset-x-0 top-0 h-1.5 ${
                mainTab === 'blacklist'
                  ? 'bg-gradient-to-r from-red-500 to-rose-400'
                  : c.status === 'ACTIVA'
                    ? 'bg-gradient-to-r from-neon-500 to-emerald-400'
                    : 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
              }`}
            />

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 font-display text-sm font-bold text-white shadow-md shadow-fuchsia-500/30 ring-2 ring-white">
                {c.firstName.charAt(0).toUpperCase()}
                {c.lastName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <button onClick={() => setDetailClientId(c.id)} className="block max-w-full truncate text-left font-display text-base font-bold text-neutral-800 hover:text-fuchsia-700">
                  {c.firstName} {c.lastName}
                </button>
                <p className="text-xs text-neutral-500">📞 {c.phone}</p>
              </div>
              {mainTab === 'active' ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-3xs font-bold ${
                    c.status === 'ACTIVA'
                      ? 'border-neon-500/50 bg-neon-500/15 text-emerald-700'
                      : 'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'ACTIVA' ? 'bg-neon-600' : 'bg-fuchsia-500'}`} />
                  {c.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-3xs font-bold text-red-700">🚫 Lista Negra</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {c.birthday && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                  🎂 {c.birthday.slice(8, 10)}/{c.birthday.slice(5, 7)}/{c.birthday.slice(0, 4)} · {calculateAge(c.birthday)} años
                </span>
              )}
              {mainTab === 'blacklist' ? (
                <>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-medium text-neutral-600">
                    Baja: {c.blacklistedAt ? c.blacklistedAt.slice(0, 10) : '—'}
                  </span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-medium text-red-700">
                    Motivo: {c.blacklistedReason || 'Sin motivo especificado'}
                  </span>
                </>
              ) : (
                <span className="rounded-full border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-1 font-medium text-fuchsia-800">
                  🗓️ Última visita: {c.lastVisit ? c.lastVisit.slice(0, 10) : '—'}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-fuchsia-100 pt-3">
              <button
                onClick={() => setDetailClientId(c.id)}
                className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                🔍 Historial
              </button>
              {mainTab === 'blacklist' ? (
                <button
                  onClick={() => handleUnblacklist(c)}
                  className="rounded-full border border-neon-500/60 bg-neon-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-neon-500/30"
                >
                  🔄 Quitar de Lista Negra
                </button>
              ) : (
                <>
                  {c.status === 'INACTIVA' && (
                    <button
                      onClick={() => sendPromo(c)}
                      className="rounded-full bg-neon-500 px-3.5 py-1.5 text-xs font-bold text-ink shadow-md shadow-neon-500/40 transition-all hover:-translate-y-0.5 hover:bg-neon-400"
                    >
                      💬 Enviar promo
                    </button>
                  )}
                  <button
                    onClick={() => setFormClient(c)}
                    className="rounded-full border-2 border-fuchsia-200 bg-white px-3.5 py-1 text-xs font-semibold text-fuchsia-700 transition-colors hover:border-fuchsia-400 hover:bg-fuchsia-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setBlacklistTarget(c)}
                    className="ml-auto rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    🚫 Lista Negra
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {clients.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            {mainTab === 'blacklist' ? 'No hay clientas en la Lista Negra.' : 'No hay clientas para mostrar.'}
          </p>
        )}
      </div>

      {formClient && (
        <ClientFormModal
          client={formClient === 'new' ? null : formClient}
          services={services}
          onClose={() => setFormClient(null)}
          onSaved={() => {
            setFormClient(null);
            load();
          }}
        />
      )}

      {detailClientId && <ClientDetailModal clientId={detailClientId} onClose={() => setDetailClientId(null)} />}

      {blacklistTarget && (
        <BlacklistModal
          client={blacklistTarget}
          onClose={() => setBlacklistTarget(null)}
          onSuccess={() => {
            setBlacklistTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
