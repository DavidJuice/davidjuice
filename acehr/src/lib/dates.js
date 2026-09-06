import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isWeekend,
  parseISO,
  startOfWeek,
} from 'date-fns'

/** Weeks run Monday -> Sunday; the hours grid shows Mon-Fri. */
export const WEEK_OPTIONS = { weekStartsOn: 1 }

export function toISODate(date) {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODate(value) {
  return typeof value === 'string' ? parseISO(value) : value
}

export function weekStart(date = new Date()) {
  return startOfWeek(date, WEEK_OPTIONS)
}

export function weekEnd(date = new Date()) {
  return endOfWeek(date, WEEK_OPTIONS)
}

export function weekdaysOf(date = new Date()) {
  const start = weekStart(date)
  return [0, 1, 2, 3, 4].map((offset) => addDays(start, offset))
}

export function shiftWeek(date, weeks) {
  return addDays(weekStart(date), weeks * 7)
}

export function formatDate(value, pattern = 'MMM d, yyyy') {
  if (!value) return '—'
  try {
    return format(fromISODate(value), pattern)
  } catch {
    return '—'
  }
}

export function formatRange(start, end) {
  if (!start) return '—'
  if (!end || start === end) return formatDate(start)
  return `${formatDate(start, 'MMM d')} – ${formatDate(end, 'MMM d, yyyy')}`
}

/** Business days between two ISO dates, inclusive. Weekends excluded. */
export function businessDaysBetween(startISO, endISO) {
  if (!startISO || !endISO) return 0
  const start = fromISODate(startISO)
  const end = fromISODate(endISO)
  if (end < start) return 0
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length
}

/** True when today falls inside an inclusive ISO date range. */
export function isTodayWithin(startISO, endISO) {
  const today = toISODate(new Date())
  return startISO <= today && today <= endISO
}

/** True when two inclusive ISO ranges overlap. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}
