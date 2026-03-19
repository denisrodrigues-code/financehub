type Props = {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'negative'
}

const toneClass: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'text-slate-100',
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
}

export function MetricCard({ label, value, tone = 'neutral' }: Props) {
  return (
    <article className="rounded-xl border border-indigo-300/20 bg-[#0f1740]/52 p-3 lg:p-2.5 xl:p-3">
      <p className="text-xs uppercase tracking-widest text-slate-300/80">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold lg:text-lg xl:text-xl ${toneClass[tone]}`}>{value}</p>
    </article>
  )
}
