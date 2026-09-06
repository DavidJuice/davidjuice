import { NavLink } from 'react-router-dom'
import {
  IconCalendar,
  IconCard,
  IconClock,
  IconDashboard,
  IconSettings,
  IconTrend,
  IconUsers,
  IconX,
} from '../ui/Icons.jsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/employees', label: 'Employees', Icon: IconUsers },
  { to: '/vacation', label: 'Vacation', Icon: IconCalendar },
  { to: '/work-hours', label: 'Work Hours', Icon: IconClock },
  { to: '/overtime', label: 'Overtime', Icon: IconTrend },
]

const FOOTER_NAV = [
  { to: '/settings', label: 'Settings', Icon: IconSettings },
  { to: '/billing', label: 'Billing', Icon: IconCard },
]

function NavItem({ to, label, Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-light text-brand-text'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )
}

/**
 * Fixed 200px rail on desktop; slides in as an overlay drawer under 768px.
 */
export default function Sidebar({ open, onClose, orgName, planLabel }) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-gray-900/30 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r-[0.5px] border-hairline bg-white transition-transform duration-200 md:w-[200px] md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">AceHR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 md:hidden"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onClose} />
          ))}
          <div className="my-3 border-t-[0.5px] border-hairline" />
          {FOOTER_NAV.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onClose} />
          ))}
        </nav>

        <div className="m-3 rounded-lg border-[0.5px] border-hairline bg-[#FAFBFC] p-3">
          <p className="truncate text-[13px] font-medium text-gray-900" title={orgName}>
            {orgName || 'Your agency'}
          </p>
          <p className="mt-0.5 text-xs capitalize text-gray-500">{planLabel} plan</p>
        </div>
      </aside>
    </>
  )
}
