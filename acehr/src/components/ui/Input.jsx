import { forwardRef, useId } from 'react'

const base =
  'w-full rounded-lg border border-hairline bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus-ring disabled:bg-gray-50 disabled:text-gray-400'

const Input = forwardRef(function Input(
  { label, hint, error, className = '', id, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${base} h-10 ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
})

export default Input

export const Select = forwardRef(function Select(
  { label, hint, error, className = '', id, children, ...props },
  ref
) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`${base} h-10 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236B7280'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5z'/%3E%3C/svg%3E")] bg-[length:20px_20px] bg-[right_0.5rem_center] bg-no-repeat pr-9 ${
          error ? 'border-danger' : ''
        }`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, className = '', id, rows = 3, ...props },
  ref
) {
  const autoId = useId()
  const areaId = id ?? autoId
  return (
    <div className={className}>
      {label && (
        <label htmlFor={areaId} className="field-label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        className={`${base} resize-y py-2 ${error ? 'border-danger' : ''}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
})

/** Search box used at the top of every list. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${base} h-9 pl-9`}
      />
    </div>
  )
}
