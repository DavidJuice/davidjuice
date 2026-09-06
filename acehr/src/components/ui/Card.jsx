export default function Card({ title, subtitle, action, className = '', bodyClassName = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-hairline px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName || 'p-5'}>{children}</div>
    </section>
  )
}

export function StatCard({ label, value, hint, tone = 'brand', icon }) {
  const tones = {
    brand: 'bg-[#E8F8F1] text-[#2E9E6D]',
    warn: 'bg-[#FFF7ED] text-[#E8833A]',
    danger: 'bg-[#FEF2F2] text-[#E24B4A]',
    indigo: 'bg-[#EEF2FF] text-[#4F46E5]',
  }
  return (
    <div className="card flex items-center gap-4 p-5">
      {icon && (
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}
