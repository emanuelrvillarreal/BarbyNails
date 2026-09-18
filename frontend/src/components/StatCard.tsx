const TONES = {
  income: {
    bg: 'bg-gradient-to-br from-neon-500 to-emerald-400',
    ring: 'shadow-neon-500/40',
    text: 'text-ink',
    label: 'text-ink/70',
  },
  expense: {
    bg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    ring: 'shadow-pink-500/35',
    text: 'text-white',
    label: 'text-white/80',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-fuchsia-500 to-indigo-500',
    ring: 'shadow-fuchsia-500/35',
    text: 'text-white',
    label: 'text-white/80',
  },
  accent: {
    bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-500',
    ring: 'shadow-pink-500/35',
    text: 'text-white',
    label: 'text-white/80',
  },
} as const;

interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  tone?: keyof typeof TONES;
}

export default function StatCard({ label, value, icon, tone = 'neutral' }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-lg ${t.text} ${t.bg} ${t.ring}`}>
      <div className="pointer-events-none absolute -right-3 -top-3 text-4xl opacity-25">{icon}</div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${t.label}`}>{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
