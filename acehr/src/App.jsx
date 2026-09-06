import { Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './components/layout/AuthGuard.jsx'
import Billing from './pages/Billing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Login from './pages/Login.jsx'
import Overtime from './pages/Overtime.jsx'
import Settings from './pages/Settings.jsx'
import Signup from './pages/Signup.jsx'
import Vacation from './pages/Vacation.jsx'
import WorkHours from './pages/WorkHours.jsx'

/** Everything except /login and /signup sits behind <AuthGuard>. */
function Protected({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/employees"
        element={
          <Protected>
            <Employees />
          </Protected>
        }
      />
      <Route
        path="/vacation"
        element={
          <Protected>
            <Vacation />
          </Protected>
        }
      />
      <Route
        path="/work-hours"
        element={
          <Protected>
            <WorkHours />
          </Protected>
        }
      />
      <Route
        path="/overtime"
        element={
          <Protected>
            <Overtime />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/billing"
        element={
          <Protected>
            <Billing />
          </Protected>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="card max-w-md p-8 text-center">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          That page does not exist. Head back to your dashboard.
        </p>
        <a
          href="/dashboard"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
