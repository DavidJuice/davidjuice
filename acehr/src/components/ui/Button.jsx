const VARIANTS = {
  primary:
    'bg-brand text-white border-brand hover:bg-brand-dark disabled:bg-brand/50 disabled:border-brand/50',
  secondary:
    'bg-white text-gray-700 border-hairline hover:bg-gray-50 disabled:text-gray-400',
  danger:
    'bg-danger text-white border-danger hover:bg-[#c93f3e] disabled:bg-danger/50 disabled:border-danger/50',
  warn: 'bg-warn text-white border-warn hover:bg-[#d1732f] disabled:bg-warn/50',
  ghost: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
}

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
