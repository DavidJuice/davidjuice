import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, errorMessage } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const SELECT = `
  id, org_id, employee_id, week_start, regular_hours, overtime_hours,
  ot_pay_estimate, status, created_at,
  employees ( id, full_name, branch, position, hourly_rate )
`

/**
 * Weekly overtime rollups. Rows are maintained by the work_logs trigger; this
 * hook reads them and advances their approval status.
 */
export function useOvertime() {
  const { orgId } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const fetchRecords = useCallback(async () => {
    if (!orgId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('overtime_records')
      .select(SELECT)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (!mounted.current) return
    if (queryError) {
      setError(errorMessage(queryError))
      setRecords([])
    } else {
      setError(null)
      setRecords(data ?? [])
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    mounted.current = true
    fetchRecords()
    return () => {
      mounted.current = false
    }
  }, [fetchRecords])

  const setStatus = useCallback(
    async (id, status) => {
      const { data, error: updateError } = await supabase
        .from('overtime_records')
        .update({ status })
        .eq('id', id)
        .select(SELECT)
        .single()
      if (updateError) throw new Error(errorMessage(updateError))
      setRecords((prev) => prev.map((r) => (r.id === id ? data : r)))
      toast.success(`Marked ${status}.`)
    },
    []
  )

  const weeks = useMemo(
    () => [...new Set(records.map((r) => r.week_start))].sort().reverse(),
    [records]
  )

  return { records, weeks, loading, error, refetch: fetchRecords, setStatus }
}
