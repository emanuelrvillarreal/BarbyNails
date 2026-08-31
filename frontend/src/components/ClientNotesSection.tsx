import { useState } from 'react';
import { AlertTriangle, StickyNote } from 'lucide-react';
import type { ClientNote } from '../api/clients';

interface Props {
  notes: ClientNote[];
  onAdd: (body: string) => Promise<void>;
  title?: string;
  emptyLabel?: string;
}

function authorLabel(note: ClientNote) {
  if (note.author.professional) return `${note.author.professional.firstName} ${note.author.professional.lastName}`;
  return note.author.role === 'OWNER' ? 'Dueña' : note.author.email;
}

export default function ClientNotesSection({ notes, onAdd, title = 'Notas y advertencias', emptyLabel = 'Sin notas todavía.' }: Props) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(draft.trim());
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-neutral-800">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>{title}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{notes.length}</span>
      </h3>

      <div className="mb-3 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ej: alergia a la acetona, hongo en el dedo gordo del pie, base especial..."
          rows={2}
          className="flex-1 rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm outline-none focus:border-pink-400"
        />
        <button onClick={handleAdd} disabled={submitting || !draft.trim()} className="btn-secondary self-end whitespace-nowrap text-xs">
          {submitting ? 'Guardando...' : '+ Agregar'}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-neutral-400">{emptyLabel}</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs shadow-2xs">
              <div className="mb-1 flex items-center justify-between text-neutral-500">
                <span className="flex items-center gap-1 font-semibold text-neutral-700">
                  <StickyNote className="h-3 w-3" />
                  {authorLabel(n)}
                </span>
                <span>
                  {n.createdAt.slice(0, 10)} {n.createdAt.slice(11, 16)}hs
                </span>
              </div>
              <p className="whitespace-pre-wrap text-neutral-700">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
