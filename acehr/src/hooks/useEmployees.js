import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, errorMessage } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const SELECT =
  'id, org_id, user_id, full_name, email, branch, position, hire_date, pto_balance_days, hourly_rate, is_active, created_at'

/**
 * Employee directory for the caller's org. org_id is always taken from the
 * session; RLS enforces the same boundary server-side.
 */
export function useEmployees({ includeInactive = true } = {}) {
  const { orgId } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const fetchEmployees = useCallback(async () => {
    if (!orgId) {
      setEmployees([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('employees')
      .select(SELECT)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (!includeInactive) query = query.eq('is_active', true)

    const { data, error: queryError } = await query
    if (!mounted.current) return
    if (queryError) {
      setError(errorMessage(queryError))
      setEmployees([])
    } else {
      setError(null)
      setEmployees(data ?? [])
    }
    setLoading(false)
  }, [orgId, includeInactive])

  useEffect(() => {
    mounted.current = true
    fetchEmployees()
    return () => {
      mounted.current = false
    }
  }, [fetchEmployees])

  const createEmployee = useCallback(
    async (values) => {
      if (!orgId) throw new Error('No organization in session.')
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert({ ...values, org_id: orgId })
        .select(SELECT)
        .single()
      if (insertError) throw new Error(errorMessage(insertError))
      setEmployees((prev) => [data, ...prev])
      toast.success(`${data.full_name} added.`)
      return data
    },
    [orgId]
  )

  const updateEmployee = useCallback(
    async (id, patch) => {
      const { data, error: updateError } = await supabase
        .from('employees')
        .update(patch)
        .eq('id', id)
        .select(SELECT)
        .single()
      if (updateError) throw new Error(errorMessage(updateError))
      setEmployees((prev) => prev.map((e) => (e.id === id ? data : e)))
      return data
    },
    []
  )

  const setActive = useCallback(
    async (id, isActive) => {
      const data = await updateEmployee(id, { is_active: isActive })
      toast.success(`${data.full_name} ${isActive ? 'reactivated' : 'deactivated'}.`)
      return data
    },
    [updateEmployee]
  )

  const activeEmployees = useMemo(() => employees.filter((e) => e.is_active), [employees])

  return {
    employees,
    activeEmployees,
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee,
    updateEmployee,
    setActive,
  }
}
