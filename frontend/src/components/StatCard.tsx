const TONES = {
  income: {
    bg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    ring: 'shadow-emerald-500/25',
  },
  expense: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-500',
    ring: 'shadow-red-500/25',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-neutral-700 to-neutral-900',
    ring: 'shadow-neutral-500/20',
  },
  accent: {
    bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-500',
    ring: 'shadow-pink-500/25',
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
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ${t.bg} ${t.ring}`}>
      <div className="pointer-events-none absolute -right-3 -top-3 text-4xl opacity-20">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
