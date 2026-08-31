import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { fetchSettings } from '../../api/settings';
import { requestForgotPassword } from '../../api/users';
import type { SystemSettings } from '../../api/types';
import { Modal } from '../../components/ui/dialog';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Modal Olvidé mi contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    }
  }

  async function handleForgotPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setForgotSubmitting(true);
    setForgotMsg(null);
    try {
      const res = await requestForgotPassword(forgotEmail);
      setForgotMsg(res.message);
    } catch (err) {
      setForgotMsg('Ocurrió un error. Por favor intentá nuevamente o comunicate con el administrador.');
    } finally {
      setForgotSubmitting(false);
    }
  }

  const salonName = settings?.salonName || 'Barby Nails & Spa';
  const logoUrl = settings?.logoUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-fuchsia-50 to-violet-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl shadow-pink-500/10 ring-1 ring-black/5">
        <div className="mb-6 flex flex-col items-center text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={salonName} className="mb-3 h-16 w-16 rounded-2xl object-cover shadow-lg shadow-pink-500/20 ring-2 ring-pink-100" />
          ) : (
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-2xl shadow-lg shadow-pink-500/30">
              💅
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-neutral-800">{salonName}</h1>
          <p className="mt-1 text-sm text-neutral-500">Ingresá con tu usuario</p>
        </div>

        <label className="mb-1 block text-sm font-semibold text-neutral-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border-2 border-neutral-200 px-3 py-2.5 outline-none transition-colors focus:border-pink-400"
          required
        />

        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-semibold text-neutral-700">Contraseña</label>
          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotMsg(null);
              setShowForgotModal(true);
            }}
            className="text-xs font-semibold text-pink-600 hover:text-pink-800 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-neutral-200 px-3 py-2.5 pr-10 outline-none transition-colors focus:border-pink-400"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors text-base"
            title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      {/* Modal Olvidé mi contraseña */}
      {showForgotModal && (
        <Modal open onClose={() => setShowForgotModal(false)} title="Recuperar Contraseña" maxWidth="md">
            <p className="mb-4 text-xs text-neutral-600">
              Ingresá tu email para solicitar el blanqueo de tu clave. La administración o el SysAdmin podrán restablecerla de forma directa.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Email registrado</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="ejemplo@barbynails.com"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-400"
                  required
                />
              </div>

              {forgotMsg && (
                <div className="rounded-xl bg-pink-50 p-3 text-xs font-medium text-pink-800 border border-pink-200">
                  {forgotMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="btn-primary py-2 px-4 text-xs"
                >
                  {forgotSubmitting ? 'Enviando...' : 'Solicitar Blanqueo'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
