import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/** App shell: sidebar rail + top bar + scrollable content column. */
export default function PageWrapper({ title, subtitle, actions, children }) {
  const [navOpen, setNavOpen] = useState(false)
  const { org } = useAuth()

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        orgName={org?.name}
        planLabel={org?.plan ?? 'starter'}
      />
      <div className="md:pl-[200px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onOpenNav={() => setNavOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
