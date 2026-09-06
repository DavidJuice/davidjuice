const PALETTE = ['#4CAF87', '#E8833A', '#4F46E5', '#0EA5E9', '#D946EF', '#F59E0B']

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return PALETTE[hash % PALETTE.length]
}

const SIZES = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }

export default function Avatar({ name, size = 'md', className = '', title }) {
  return (
    <span
      title={title ?? name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${SIZES[size]} ${className}`}
      style={{ backgroundColor: colorFor(name || '') }}
    >
      {initials(name)}
    </span>
  )
}
