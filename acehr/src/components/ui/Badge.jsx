const TONES = {
  approved: 'bg-[#E8F8F1] text-[#2E9E6D]',
  normal: 'bg-[#E8F8F1] text-[#2E9E6D]',
  paid: 'bg-[#E8F8F1] text-[#2E9E6D]',
  active: 'bg-[#E8F8F1] text-[#2E9E6D]',
  pending: 'bg-[#FFF7ED] text-[#E8833A]',
  rejected: 'bg-[#FEF2F2] text-[#E24B4A]',
  flagged: 'bg-[#FEF2F2] text-[#E24B4A]',
  inactive: 'bg-[#FEF2F2] text-[#E24B4A]',
  overtime: 'bg-[#EEF2FF] text-[#4F46E5]',
  neutral: 'bg-gray-100 text-gray-600',
}

/** Maps a domain status string onto a badge tone. */
export function toneFor(status) {
  if (!status) return 'neutral'
  const key = String(status).toLowerCase()
  return TONES[key] ? key : 'neutral'
}

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
    >
      {children}
    </span>
  )
}
