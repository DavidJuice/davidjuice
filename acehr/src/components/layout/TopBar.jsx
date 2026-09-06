import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Avatar from '../ui/Avatar.jsx'
import { IconLogout, IconMenu } from '../ui/Icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function TopBar({ title, subtitle, actions, onOpenNav }) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const name = profile?.full_name || user?.email || 'Account'

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b-[0.5px] border-hairline bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-gray-500">{subtitle}</p>}
        </div>

        {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100"
          >
            <Avatar name={name} size="md" />
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-gray-700 lg:block">
              {name}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-card border-[0.5px] border-hairline bg-white shadow-lg"
            >
              <div className="border-b-[0.5px] border-hairline px-4 py-3">
                <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
                <p className="mt-1 text-xs capitalize text-gray-400">{profile?.role ?? 'member'}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <IconLogout className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap gap-2 px-4 pb-3 sm:hidden">{actions}</div>}
    </header>
  )
}
