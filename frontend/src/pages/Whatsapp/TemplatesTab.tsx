import { useEffect, useState } from 'react';
import { fetchTemplates, createTemplate, updateTemplate, type WhatsappTemplate, type WhatsappTemplateType } from '../../api/whatsapp';
import { ApiError } from '../../api/client';
import { Select, SelectItem } from '../../components/ui/select';
import { Modal } from '../../components/ui/dialog';

const TYPE_LABELS: Record<WhatsappTemplateType, string> = {
  APPOINTMENT_REMINDER: 'Recordatorio de turno',
  PAYMENT_PENDING: 'Pago pendiente',
  PROMOTION: 'Promocion',
};

const TYPE_PLACEHOLDERS: Record<WhatsappTemplateType, string> = {
  APPOINTMENT_REMINDER: '{nombre}, {fecha}, {hora}, {profesional}, {servicios}',
  PAYMENT_PENDING: '{nombre}, {apellido}',
  PROMOTION: '{nombre}, {apellido}',
};

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [editing, setEditing] = useState<WhatsappTemplate | 'new' | null>(null);
  const [type, setType] = useState<WhatsappTemplateType>('APPOINTMENT_REMINDER');
  const [name, setName] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetchTemplates().then(setTemplates);
  }

  useEffect(load, []);

  function openNew() {
    setType('APPOINTMENT_REMINDER');
    setName('');
    setBodyText('');
    setEditing('new');
  }

  function openEdit(t: WhatsappTemplate) {
    setType(t.type);
    setName(t.name);
    setBodyText(t.bodyText);
    setEditing(t);
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !bodyText.trim()) return setError('Completa nombre y texto');
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createTemplate({ type, name, bodyText });
      } else if (editing) {
        await updateTemplate(editing.id, { name, bodyText });
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(t: WhatsappTemplate) {
    if (!confirm(`¿Dar de baja la plantilla "${t.name}"?`)) return;
    await updateTemplate(t.id, { active: false });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="btn-primary">
          + Nueva plantilla
        </button>
      </div>

      {(['APPOINTMENT_REMINDER', 'PAYMENT_PENDING', 'PROMOTION'] as const).map((t) => (
        <div key={t} className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-neutral-700">{TYPE_LABELS[t]}</h3>
          <div className="space-y-2">
            {templates
              .filter((tpl) => tpl.type === t)
              .map((tpl) => (
                <div key={tpl.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700">{tpl.name}</p>
                    <div className="space-x-2">
                      <button onClick={() => openEdit(tpl)} className="link-action">
                        Editar
                      </button>
                      <button onClick={() => deactivate(tpl)} className="link-action-muted">
                        Dar de baja
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-neutral-500">{tpl.bodyText}</p>
                </div>
              ))}
            {templates.filter((tpl) => tpl.type === t).length === 0 && (
              <p className="text-sm text-neutral-400">Sin plantillas todavia.</p>
            )}
          </div>
        </div>
      ))}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva plantilla' : 'Editar plantilla'} maxWidth="md">
            <div className="space-y-3">
              {editing === 'new' && (
                <Select value={type} onValueChange={(v) => setType(v as WhatsappTemplateType)} className="w-full">
                  {(Object.keys(TYPE_LABELS) as WhatsappTemplateType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </Select>
              )}
              <input placeholder="Nombre de la plantilla" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
              <textarea
                placeholder="Texto del mensaje"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-neutral-400">Variables disponibles: {TYPE_PLACEHOLDERS[type]}</p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                Guardar
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
