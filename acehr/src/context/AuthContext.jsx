import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { provisionOrg, signIn as signInRequest, signOut as signOutRequest } from '../lib/auth.js'

const AuthContext = createContext(null)

/**
 * Holds the Supabase session plus the caller's profile (users row) and
 * organization. Every tenant-scoped query derives org_id from here, never
 * from the URL or user input.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const loadProfile = useCallback(async (activeSession) => {
    if (!activeSession?.user) {
      if (mounted.current) {
        setProfile(null)
        setOrg(null)
      }
      return
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, org_id, full_name, email, role, organizations(*)')
      .eq('id', activeSession.user.id)
      .maybeSingle()

    if (!mounted.current) return

    if (error || !data) {
      // A confirmed-by-email admin logs in before their org exists; finish
      // provisioning from the metadata captured at signup.
      const meta = activeSession.user.user_metadata ?? {}
      if (!error && meta.agency_name) {
        try {
          await provisionOrg({
            userId: activeSession.user.id,
            fullName: meta.full_name || activeSession.user.email,
            email: activeSession.user.email,
            agencyName: meta.agency_name,
          })
          await loadProfile(activeSession)
          return
        } catch {
          // Fall through to the signed-in-but-unprovisioned state below.
        }
      }
      setProfile(null)
      setOrg(null)
      return
    }

    const { organizations, ...user } = data
    setProfile(user)
    setOrg(organizations ?? null)
  }, [])

  useEffect(() => {
    mounted.current = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted.current) return
      setSession(data.session)
      await loadProfile(data.session)
      if (mounted.current) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted.current) return
      setSession(nextSession)
      await loadProfile(nextSession)
      if (mounted.current) setLoading(false)
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await loadProfile(data.session)
  }, [loadProfile])

  const signIn = useCallback(async (credentials) => {
    const result = await signInRequest(credentials)
    return result
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
    setProfile(null)
    setOrg(null)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      org,
      orgId: profile?.org_id ?? null,
      role: profile?.role ?? null,
      isAdmin: profile?.role === 'admin',
      isManager: profile?.role === 'admin' || profile?.role === 'manager',
      loading,
      signIn,
      signOut,
      refreshProfile,
      setOrg,
    }),
    [session, profile, org, loading, signIn, signOut, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
