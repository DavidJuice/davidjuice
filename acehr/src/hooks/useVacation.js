import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, errorMessage } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { isTodayWithin, rangesOverlap, toISODate, weekEnd, weekStart } from '../lib/dates.js'

const SELECT = `
  id, org_id, employee_id, type, start_date, end_date, days_requested,
  status, reviewed_by, reviewed_at, notes, created_at,
  employees ( id, full_name, email, branch, position )
`

/** Vacation requests for the caller's org, newest first. */
export function useVacation() {
  const { orgId, profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const fetchRequests = useCallback(async () => {
    if (!orgId) {
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('vacation_requests')
      .select(SELECT)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (!mounted.current) return
    if (queryError) {
      setError(errorMessage(queryError))
      setRequests([])
    } else {
      setError(null)
      setRequests(data ?? [])
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    mounted.current = true
    fetchRequests()
    return () => {
      mounted.current = false
    }
  }, [fetchRequests])

  const createRequest = useCallback(
    async (values) => {
      if (!orgId) throw new Error('No organization in session.')
      const { error: insertError } = await supabase
        .from('vacation_requests')
        .insert({ ...values, org_id: orgId })
      if (insertError) throw new Error(errorMessage(insertError))
      await fetchRequests()
      toast.success('Request submitted.')
    },
    [orgId, fetchRequests]
  )

  const setStatus = useCallback(
    async (id, status) => {
      const { error: updateError } = await supabase
        .from('vacation_requests')
        .update({
          status,
          reviewed_by: profile?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (updateError) throw new Error(errorMessage(updateError))
      // The PTO trigger changes employee balances, so refetch rather than patch.
      await fetchRequests()
      toast.success(status === 'approved' ? 'Request approved.' : 'Request rejected.')
    },
    [profile?.id, fetchRequests]
  )

  const deleteRequest = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from('vacation_requests').delete().eq('id', id)
      if (deleteError) throw new Error(errorMessage(deleteError))
      await fetchRequests()
      toast.success('Request deleted.')
    },
    [fetchRequests]
  )

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])

  const onLeaveToday = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'approved' && isTodayWithin(r.start_date, r.end_date)
      ),
    [requests]
  )

  const onLeaveThisWeek = useMemo(() => {
    const start = toISODate(weekStart())
    const end = toISODate(weekEnd())
    return requests.filter(
      (r) => r.status === 'approved' && rangesOverlap(r.start_date, r.end_date, start, end)
    )
  }, [requests])

  return {
    requests,
    pending,
    onLeaveToday,
    onLeaveThisWeek,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    setStatus,
    deleteRequest,
  }
}
