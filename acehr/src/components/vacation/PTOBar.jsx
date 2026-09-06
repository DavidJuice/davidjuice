import ProgressBar from '../ui/ProgressBar.jsx'

const ANNUAL_ALLOWANCE = 15

/**
 * Shows remaining PTO against the standard annual allowance. Balances above
 * the allowance (carry-over) render as a full bar.
 */
export default function PTOBar({ remaining, allowance = ANNUAL_ALLOWANCE }) {
  const days = Number(remaining ?? 0)
  const tone = days <= 2 ? 'danger' : days <= 5 ? 'warn' : 'brand'
  return (
    <div className="w-full min-w-[140px]">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{days.toFixed(1)} d</span>
        <span className="text-xs text-gray-400">of {allowance}</span>
      </div>
      <ProgressBar value={Math.min(days, allowance)} max={allowance} tone={tone} />
    </div>
  )
}
