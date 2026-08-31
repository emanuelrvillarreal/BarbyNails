import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Users, Tags, Wallet, UserCog, MessageCircle, Settings, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSettings } from '../api/settings';
import type { SystemSettings } from '../api/types';
import ProfileModal from '../pages/Staff/ProfileModal';

export default function NavBar() {
  const { session, logout } = useAuth();
  const isOwnerOrSysAdmin = session?.role === 'OWNER' || session?.role === 'SYSADMIN';
  const isSysAdmin = session?.role === 'SYSADMIN';
  const isProfessional = session?.role === 'PROFESSIONAL' || !!session?.professionalId;

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
  }, []);

  const salonName = settings?.salonName || 'Barby Nails & Spa';
  const logoUrl = settings?.logoUrl;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-md shadow-pink-500/30'
        : 'text-neutral-500 hover:bg-pink-50 hover:text-pink-600'
    }`;

  return (
    <>
      <nav className="flex items-center justify-between border-b border-neutral-200 bg-white/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={salonName} className="h-9 w-9 rounded-xl object-cover ring-1 ring-pink-200 shadow-sm" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-base shadow-md shadow-pink-500/30">
              💅
            </span>
          )}
          <span className="mr-2 hidden font-bold tracking-tight text-neutral-800 sm:inline">
            {salonName}
          </span>
          <div className="flex items-center gap-1.5">
            <NavLink to="/" end className={linkClass}>
              <Calendar className="h-4 w-4" />
              Agenda
            </NavLink>
            {session?.role === 'PROFESSIONAL' && (
              <NavLink to="/mis-clientas" className={linkClass}>
                <Users className="h-4 w-4" />
                Mis Clientas
              </NavLink>
            )}
            {isOwnerOrSysAdmin && (
              <>
                <NavLink to="/clientes" className={linkClass}>
                  <Users className="h-4 w-4" />
                  Clientas
                </NavLink>
                <NavLink to="/catalogo" className={linkClass}>
                  <Tags className="h-4 w-4" />
                  Catálogo
                </NavLink>
                <NavLink to="/finanzas" className={linkClass}>
                  <Wallet className="h-4 w-4" />
                  Finanzas
                </NavLink>
                <NavLink to="/personal" className={linkClass}>
                  <UserCog className="h-4 w-4" />
                  Personal
                </NavLink>
                <NavLink to="/whatsapp" className={linkClass}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </NavLink>
                <NavLink to="/configuracion" className={linkClass}>
                  <Settings className="h-4 w-4" />
                  {isSysAdmin ? 'Config / SysAdmin' : 'Configuración'}
                </NavLink>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isProfessional && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-pink-50 border border-pink-200 px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-100 transition-colors shadow-2xs"
            >
              <UserCircle className="h-3.5 w-3.5" />
              Mi Perfil
            </button>
          )}

          {session?.role && (
            <span className="hidden sm:inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 border border-neutral-200">
              Rol: {session.role}
            </span>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </nav>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </>
  );
}
