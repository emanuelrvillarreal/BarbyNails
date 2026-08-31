import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Users, Tags, Wallet, UserCog, MessageCircle, Settings, UserCircle, LogOut, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
      isActive ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-md shadow-pink-500/30' : 'text-neutral-600 hover:bg-pink-50'
    }`;

  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setMobileMenuOpen(false)}>
        <Calendar className="h-4 w-4" />
        Agenda
      </NavLink>
      {session?.role === 'PROFESSIONAL' && (
        <NavLink to="/mis-clientas" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
          <Users className="h-4 w-4" />
          Mis Clientas
        </NavLink>
      )}
      {isOwnerOrSysAdmin && (
        <>
          <NavLink to="/clientes" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <Users className="h-4 w-4" />
            Clientas
          </NavLink>
          <NavLink to="/catalogo" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <Tags className="h-4 w-4" />
            Catálogo
          </NavLink>
          <NavLink to="/finanzas" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <Wallet className="h-4 w-4" />
            Finanzas
          </NavLink>
          <NavLink to="/personal" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <UserCog className="h-4 w-4" />
            Personal
          </NavLink>
          <NavLink to="/whatsapp" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </NavLink>
          <NavLink to="/configuracion" className={linkClass} onClick={() => setMobileMenuOpen(false)}>
            <Settings className="h-4 w-4" />
            {isSysAdmin ? 'Config / SysAdmin' : 'Configuración'}
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className="border-b border-neutral-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={salonName} className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-pink-200 shadow-sm" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-base shadow-md shadow-pink-500/30">
                💅
              </span>
            )}
            <span className="hidden truncate font-bold tracking-tight text-neutral-800 sm:inline sm:max-w-[140px] xl:max-w-[220px]">{salonName}</span>

            <div className="hidden items-center gap-1.5 xl:flex">{navLinks}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isProfessional && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="hidden items-center gap-1.5 rounded-xl bg-pink-50 border border-pink-200 px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-100 transition-colors shadow-2xs sm:flex"
              >
                <UserCircle className="h-3.5 w-3.5" />
                Mi Perfil
              </button>
            )}

            {session?.role && (
              <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 border border-neutral-200 xl:inline-block">
                Rol: {session.role}
              </span>
            )}

            <button
              onClick={logout}
              className="hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 xl:flex"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 xl:hidden"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="max-h-[75vh] overflow-y-auto border-t border-neutral-200 bg-white px-3 pb-3 pt-2 xl:hidden">
            <div className="flex flex-col gap-1">{navLinks}</div>

            <div className="mt-2 flex flex-col gap-1 border-t border-neutral-100 pt-2">
              {isProfessional && (
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className={mobileLinkClass({ isActive: false })}
                >
                  <UserCircle className="h-4 w-4" />
                  Mi Perfil
                </button>
              )}
              {session?.role && (
                <span className="mx-4 my-1 w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 border border-neutral-200">
                  Rol: {session.role}
                </span>
              )}
              <button onClick={logout} className={`${mobileLinkClass({ isActive: false })} text-red-500`}>
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>
        )}
      </nav>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </>
  );
}
