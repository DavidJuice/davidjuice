/**
 * Thin, styled table primitives. Callers own the rows so each page can render
 * its own cell content; these keep spacing, borders and scroll behaviour
 * consistent across the app.
 */
export function Table({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }) {
  return (
    <thead className="bg-[#FAFBFC] text-left text-[12px] font-medium uppercase tracking-wide text-gray-500">
      {children}
    </thead>
  )
}

export function TH({ children, className = '', align = 'left' }) {
  const aligns = { left: 'text-left', right: 'text-right', center: 'text-center' }
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b-[0.5px] border-hairline px-4 py-3 font-medium ${aligns[align]} ${className}`}
    >
      {children}
    </th>
  )
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-hairline">{children}</tbody>
}

export function TR({ children, className = '', ...props }) {
  return (
    <tr className={`transition-colors hover:bg-[#FAFBFC] ${className}`} {...props}>
      {children}
    </tr>
  )
}

export function TD({ children, className = '', align = 'left', ...props }) {
  const aligns = { left: 'text-left', right: 'text-right', center: 'text-center' }
  return (
    <td className={`px-4 py-3 align-middle text-gray-700 ${aligns[align]} ${className}`} {...props}>
      {children}
    </td>
  )
}

/** Skeleton rows shown while a table's data is loading. */
export function TableSkeleton({ columns = 5, rows = 5 }) {
  return (
    <Table>
      <THead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <TH key={i}>
              <span className="skeleton block h-3 w-20" />
            </TH>
          ))}
        </tr>
      </THead>
      <TBody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <TD key={c}>
                <span className="skeleton block h-3.5" style={{ width: `${45 + ((r + c) % 4) * 12}%` }} />
              </TD>
            ))}
          </tr>
        ))}
      </TBody>
    </Table>
  )
}

/** Every table renders this instead of an empty <tbody>. */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-gray-400">
        {icon ?? <DefaultEmptyIcon />}
      </span>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function DefaultEmptyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 10h17M9 5v14" strokeLinecap="round" />
    </svg>
  )
}

/** Inline error panel for failed fetches. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <h3 className="text-sm font-semibold text-gray-900">Could not load this data</h3>
      <p className="mt-1 max-w-sm text-[13px] text-gray-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-hairline bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      )}
    </div>
  )
}
