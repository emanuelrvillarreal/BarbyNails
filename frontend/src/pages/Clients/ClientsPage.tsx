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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
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
          className="flex-1 min-w-[200px] rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm shadow-xs focus:border-pink-400 focus:outline-none"
        />
        {mainTab === 'active' && (
          <div className="flex overflow-hidden rounded-xl border-2 border-neutral-200 shadow-xs">
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
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setDetailClientId(c.id)} className="text-left font-semibold text-neutral-800">
                {c.firstName} {c.lastName}
              </button>
              {mainTab === 'active' ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-3xs font-bold shadow-2xs ${
                    c.status === 'ACTIVA' ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                  {c.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-3xs font-bold text-red-700">🚫 Lista Negra</span>
              )}
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs text-neutral-500">
              <div>📞 {c.phone}</div>
              {c.birthday && (
                <div>
                  🎂 {c.birthday.slice(8, 10)}/{c.birthday.slice(5, 7)}/{c.birthday.slice(0, 4)} ({calculateAge(c.birthday)} años)
                </div>
              )}
              {mainTab === 'blacklist' ? (
                <>
                  <div>Baja: {c.blacklistedAt ? c.blacklistedAt.slice(0, 10) : '—'}</div>
                  <div className="font-medium text-red-700">Motivo: {c.blacklistedReason || 'Sin motivo especificado'}</div>
                </>
              ) : (
                <div>Última visita: {c.lastVisit ? c.lastVisit.slice(0, 10) : '—'}</div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-2.5">
              <button onClick={() => setDetailClientId(c.id)} className="rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700 hover:bg-pink-100 transition-colors">
                🔍 Historial
              </button>
              {mainTab === 'blacklist' ? (
                <button
                  onClick={() => handleUnblacklist(c)}
                  className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  🔄 Quitar de Lista Negra
                </button>
              ) : (
                <>
                  {c.status === 'INACTIVA' && (
                    <button onClick={() => sendPromo(c)} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                      Enviar promo
                    </button>
                  )}
                  <button onClick={() => setFormClient(c)} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition-colors">
                    Editar
                  </button>
                  <button
                    onClick={() => setBlacklistTarget(c)}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
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
