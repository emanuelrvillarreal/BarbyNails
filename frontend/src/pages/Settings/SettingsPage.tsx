import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { fetchSettings, updateSettings } from '../../api/settings';
import { fetchUsers, createUser, updateUser, resetUserPassword } from '../../api/users';
import { fetchProfessionals } from '../../api/staff';
import type { Professional, Role, UserAccount } from '../../api/types';
import { Select, SelectItem } from '../../components/ui/select';
import { Modal } from '../../components/ui/dialog';
import PaymentMethodFeesSection from './PaymentMethodFeesSection';

export default function SettingsPage() {
  const [tab, setTab] = useState<'branding' | 'users' | 'payments'>('branding');

  // Branding State
  const [salonName, setSalonName] = useState('Barby Nails & Spa');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modal Create User
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('PROFESSIONAL');
  const [newProfId, setNewProfId] = useState<string>('');
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Modal Reset Password
  const [resetUser, setResetUser] = useState<UserAccount | null>(null);
  const [resetPassInput, setResetPassInput] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  function loadSettings() {
    fetchSettings().then((s) => {
      setSalonName(s.salonName);
      setLogoUrl(s.logoUrl || '');
    });
  }

  function loadUsers() {
    setLoadingUsers(true);
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoadingUsers(false));
    fetchProfessionals().then(setProfessionals);
  }

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (!file.type.startsWith('image/')) {
      setLogoError('Elegí un archivo de imagen (jpg, png, webp).');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setLogoError('La imagen es muy pesada (máx. 1.5MB). Achicala e intentá de nuevo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.onerror = () => setLogoError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  }

  async function handleSaveBranding(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(null);
    try {
      await updateSettings({ salonName, logoUrl: logoUrl.trim() || null });
      setSettingsSuccess('Configuración de marca guardada con éxito.');
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la configuración de marca');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreateUserSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    try {
      await createUser({
        email: newEmail,
        password: newPassword,
        role: newRole,
        professionalId: newProfId || null,
      });
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewProfId('');
      loadUsers();
    } catch (err: any) {
      setCreateMsg(err?.message || 'Error al crear usuario');
    }
  }

  async function handleResetPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setResetMsg(null);
    try {
      await resetUserPassword(resetUser.id, resetPassInput);
      setResetMsg('Contraseña cambiada con éxito.');
      setTimeout(() => {
        setResetUser(null);
        setResetPassInput('');
        setResetMsg(null);
      }, 1500);
    } catch (err: any) {
      setResetMsg(err?.message || 'Error al restablecer la contraseña');
    }
  }

  async function handleRoleChange(userId: string, role: Role) {
    await updateUser(userId, { role });
    loadUsers();
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    await updateUser(userId, { active: !currentActive });
    loadUsers();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pink-50/40 p-3 sm:p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-neutral-800">Configuración &amp; SysAdmin</h1>
        <p className="text-sm text-neutral-500">Personalización de marca, usuarios y control de accesos del sistema</p>
      </header>

      {/* Selector de Pestañas */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-neutral-200">
        <button
          onClick={() => setTab('branding')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
            tab === 'branding' ? 'border-pink-500 text-pink-700 font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          💅 Marca &amp; Logo del Salón
        </button>
        <button
          onClick={() => setTab('users')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
            tab === 'users' ? 'border-pink-500 text-pink-700 font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          👥 Gestión de Usuarios ({users.length})
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
            tab === 'payments' ? 'border-pink-500 text-pink-700 font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          💳 Medios de Pago
        </button>
      </div>

      {/* Pestaña Marca & Logo */}
      {tab === 'branding' && (
        <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-neutral-800">Personalización Identidad Visual</h2>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">Nombre del Salón</label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-pink-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">Logo del Salón</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-pink-600"
              />
              <p className="mt-1 text-xs text-neutral-400">
                Subí el archivo de imagen directamente (jpg, png, webp — máx. 1.5MB). No pegues links de Instagram/Facebook: esos sitios
                bloquean que otras webs muestren sus fotos, así que nunca se van a ver.
              </p>
              {logoError && <p className="mt-1 text-xs font-medium text-red-600">{logoError}</p>}

              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-600">
                  Opción avanzada: usar una URL en vez de subir un archivo
                </summary>
                <input
                  type="url"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-pink-500 outline-none"
                />
              </details>
            </div>

            {/* Previsualización */}
            <div className="mt-4 rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50/50 to-purple-50/30 p-4">
              <span className="text-xs font-bold text-pink-700 uppercase">Previsualización de Cabecera:</span>
              <div className="mt-2 flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Prev" className="h-10 w-10 rounded-xl object-cover ring-2 ring-pink-300" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500 text-white text-lg font-bold">💅</span>
                )}
                <div>
                  <div className="font-bold text-neutral-800 text-sm">{salonName || 'Barby Nails & Spa'}</div>
                  <div className="text-xs text-neutral-500">Sistema de Gestión &amp; Agenda</div>
                </div>
              </div>
            </div>

            {settingsSuccess && (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                ✓ {settingsSuccess}
              </p>
            )}

            <button type="submit" disabled={savingSettings} className="btn-primary py-2.5 px-6 text-sm">
              {savingSettings ? 'Guardando...' : 'Guardar Cambios de Marca'}
            </button>
          </form>
        </div>
      )}

      {/* Pestaña Medios de Pago */}
      {tab === 'payments' && (
        <div className="max-w-2xl">
          <PaymentMethodFeesSection />
        </div>
      )}

      {/* Pestaña Gestión de Usuarios */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-neutral-800">
              Usuarios &amp; Credenciales
              {loadingUsers && <span className="ml-2 text-xs font-normal text-neutral-400">Cargando...</span>}
            </h2>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary py-2 px-4 text-xs">
              + Nuevo Usuario
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario (Email)</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Profesional Vinculada</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-800">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as Role)} className="px-2 py-1 text-xs">
                        <SelectItem value="SYSADMIN">SYSADMIN (Super Admin)</SelectItem>
                        <SelectItem value="OWNER">OWNER (Dueña / Admin)</SelectItem>
                        <SelectItem value="PROFESSIONAL">PROFESSIONAL</SelectItem>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {u.professional ? `${u.professional.firstName} ${u.professional.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u.id, u.active)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-500'
                        }`}
                      >
                        {u.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setResetUser(u);
                          setResetPassInput('');
                          setResetMsg(null);
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        🔑 Restablecer Clave
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <Modal open onClose={() => setShowCreateModal(false)} title="Crear Nuevo Usuario" maxWidth="md">
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Email de acceso</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">Contraseña Inicial</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">Rol</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)} className="mt-1 w-full">
                  <SelectItem value="PROFESSIONAL">PROFESSIONAL (Solo su propia agenda)</SelectItem>
                  <SelectItem value="OWNER">OWNER (Administradora / Dueña)</SelectItem>
                  <SelectItem value="SYSADMIN">SYSADMIN (Super Admin)</SelectItem>
                </Select>
              </div>

              {newRole === 'PROFESSIONAL' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Vincular a Profesional</label>
                  <Select
                    value={newProfId || '__none__'}
                    onValueChange={(v) => setNewProfId(v === '__none__' ? '' : v)}
                    className="mt-1 w-full"
                  >
                    <SelectItem value="__none__">-- Ninguna --</SelectItem>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              )}

              {createMsg && <p className="text-xs font-medium text-red-600">{createMsg}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">
                  Guardar Usuario
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Modal Restablecer Contraseña */}
      {resetUser && (
        <Modal open onClose={() => setResetUser(null)} title="Restablecer Contraseña" maxWidth="md">
            <p className="mb-3 text-xs text-neutral-600">
              Asigná una nueva contraseña para el usuario <strong className="text-neutral-800">{resetUser.email}</strong>:
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Nueva Contraseña</label>
                <input
                  type="text"
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  placeholder="Escribí la nueva clave..."
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500 font-mono"
                  required
                />
              </div>

              {resetMsg && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">{resetMsg}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">
                  Cambiar Contraseña
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
