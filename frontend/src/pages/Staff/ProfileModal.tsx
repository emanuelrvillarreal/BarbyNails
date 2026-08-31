import { useEffect, useState, type FormEvent } from 'react';
import { fetchMyProfile, updateMyProfile } from '../../api/staff';
import type { Professional } from '../../api/types';
import { Modal } from '../../components/ui/dialog';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

export default function ProfileModal({ onClose, onSaved }: Props) {
  const [profile, setProfile] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Form states
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bankAlias, setBankAlias] = useState('');
  const [bankCbu, setBankCbu] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    fetchMyProfile()
      .then((p) => {
        setProfile(p);
        setPhone(p.phone || '');
        setEmail(p.email || '');
        setAddress(p.address || '');
        setBankAlias(p.bankAlias || '');
        setBankCbu(p.bankCbu || '');
        setBankName(p.bankName || '');
      })
      .catch(() => {
        setMsg('No se pudo cargar la información del perfil.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await updateMyProfile({
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        bankAlias: bankAlias.trim() || null,
        bankCbu: bankCbu.trim() || null,
        bankName: bankName.trim() || null,
      });
      setMsg('✓ Datos guardados con éxito');
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setMsg(err?.message || 'Error al guardar los datos.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = (
    <div>
      <div>👤 Mi Perfil Profesional</div>
      {profile && <p className="mt-0.5 text-xs font-normal text-neutral-500">{profile.firstName} {profile.lastName} — {profile.position || 'Profesional'}</p>}
    </div>
  );

  return (
    <Modal open onClose={onClose} title={title} maxWidth="lg">
        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-400">Cargando perfil...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5 space-y-3">
              <span className="text-xs font-bold text-pink-700 uppercase tracking-wider">📱 Datos de Contacto</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Número de Celular / Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 11 2345 6789"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500 bg-white"
                  />
                  <p className="mt-0.5 text-3xs text-neutral-400">Le servirá a la administración para contactarte.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Email Personal</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, Número, Localidad"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pink-500 bg-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">💳 Datos Bancarios para Transferencias</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Alias Bancario / Mercado Pago</label>
                  <input
                    type="text"
                    value={bankAlias}
                    onChange={(e) => setBankAlias(e.target.value)}
                    placeholder="ejemplo.mp / alias.banco"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:border-emerald-500 bg-white"
                  />
                  <p className="mt-0.5 text-3xs text-neutral-400">La dueña podrá copiar tu Alias con 1 clic para transferirte tu sueldo o comisiones.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">CBU / CVU</label>
                  <input
                    type="text"
                    value={bankCbu}
                    onChange={(e) => setBankCbu(e.target.value)}
                    placeholder="00000031000..."
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">Banco / Billetera Virtual</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: Mercado Pago, Banco Nación, Galicia..."
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white"
                />
              </div>
            </div>

            {msg && (
              <p className={`text-xs font-bold p-2.5 rounded-lg text-center ${msg.startsWith('✓') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600'}`}>
                {msg}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="btn-primary py-2 px-5 text-xs font-bold">
                {submitting ? 'Guardando...' : 'Guardar Perfil'}
              </button>
            </div>
          </form>
        )}
    </Modal>
  );
}
