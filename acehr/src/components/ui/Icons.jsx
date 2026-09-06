/** Single stroke-based icon set, so no icon package is needed. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

export const IconDashboard = (p) => (
  <svg {...base} {...p}><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></svg>
)
export const IconUsers = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0-1.6-5.5M17 19a4.8 4.8 0 0 0-1.6-3.6" /></svg>
)
export const IconCalendar = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></svg>
)
export const IconClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>
)
export const IconTrend = (p) => (
  <svg {...base} {...p}><path d="M4 16.5 9.5 11l3.5 3.5L20 7" /><path d="M20 12V7h-5" /></svg>
)
export const IconSettings = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>
)
export const IconCard = (p) => (
  <svg {...base} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></svg>
)
export const IconPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconCheck = (p) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
)
export const IconX = (p) => (
  <svg {...base} {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>
)
export const IconDownload = (p) => (
  <svg {...base} {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M4.5 19h15" /></svg>
)
export const IconChevronLeft = (p) => (
  <svg {...base} {...p}><path d="m14 6-6 6 6 6" /></svg>
)
export const IconChevronRight = (p) => (
  <svg {...base} {...p}><path d="m10 6 6 6-6 6" /></svg>
)
export const IconMenu = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9" /></svg>
)
export const IconMail = (p) => (
  <svg {...base} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m3.8 7 8.2 6 8.2-6" /></svg>
)
export const IconBuilding = (p) => (
  <svg {...base} {...p}><path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M14 20v-9h4a2 2 0 0 1 2 2v7M3 20h18M7.5 8h3M7.5 12h3M7.5 16h3" /></svg>
)
export const IconAlert = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.4v.2" /></svg>
)
