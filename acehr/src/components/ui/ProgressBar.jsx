/** Horizontal meter used for PTO balances and plan seat usage. */
export default function ProgressBar({ value, max, tone = 'brand', className = '' }) {
  const safeMax = Number(max) > 0 ? Number(max) : 1
  const pct = Math.max(0, Math.min(100, (Number(value) / safeMax) * 100))
  const tones = { brand: 'bg-brand', warn: 'bg-warn', danger: 'bg-danger', indigo: 'bg-indigoish' }
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
