import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

/** Blocks every route except /login and /signup until a session exists. */
export default function AuthGuard({ children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Signed in but no tenant row: the org provisioning step did not complete.
  if (!profile) return <UnprovisionedNotice />

  return children
}

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
          A
        </span>
        <p className="text-[13px] text-gray-500">Loading your workspace…</p>
      </div>
    </div>
  )
}

function UnprovisionedNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <h1 className="text-base font-semibold text-gray-900">Account not linked to an agency</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your sign-in worked, but this account has no agency profile yet. Ask an admin at your
          agency to re-send your invite, or create a new agency.
        </p>
        <a
          href="/signup"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Create an agency
        </a>
      </div>
    </div>
  )
}
