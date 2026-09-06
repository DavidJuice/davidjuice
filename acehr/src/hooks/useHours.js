import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, errorMessage } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { toISODate, weekdaysOf, weekStart } from '../lib/dates.js'

const SELECT = 'id, org_id, employee_id, log_date, check_in, check_out, hours_worked, is_overtime, notes'

/** A shift is recorded as a 09:00 start plus the entered duration. */
const SHIFT_START_HOUR = 9

export const DAILY_OT_THRESHOLD = 10
export const WEEKLY_OT_THRESHOLD = 40

function shiftTimestamps(logDateISO, hours) {
  const start = new Date(`${logDateISO}T00:00:00`)
  start.setHours(SHIFT_START_HOUR, 0, 0, 0)
  const end = new Date(start.getTime() + hours * 3600 * 1000)
  return { check_in: start.toISOString(), check_out: end.toISOString() }
}

/**
 * Work logs for one Mon-Fri week, keyed `${employeeId}|${isoDate}` for O(1)
 * cell lookups in the grid.
 */
export function useHours(anchorDate = new Date()) {
  const { orgId } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingCell, setSavingCell] = useState(null)
  const mounted = useRef(true)

  const days = useMemo(() => weekdaysOf(anchorDate), [anchorDate])
  const rangeStart = useMemo(() => toISODate(weekStart(anchorDate)), [anchorDate])
  const rangeEnd = useMemo(() => toISODate(days[days.length - 1]), [days])

  const fetchLogs = useCallback(async () => {
    if (!orgId) {
      setLogs([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('work_logs')
      .select(SELECT)
      .eq('org_id', orgId)
      .gte('log_date', rangeStart)
      .lte('log_date', rangeEnd)
      .order('log_date', { ascending: true })

    if (!mounted.current) return
    if (queryError) {
      setError(errorMessage(queryError))
      setLogs([])
    } else {
      setError(null)
      setLogs(data ?? [])
    }
    setLoading(false)
  }, [orgId, rangeStart, rangeEnd])

  useEffect(() => {
    mounted.current = true
    fetchLogs()
    return () => {
      mounted.current = false
    }
  }, [fetchLogs])

  const byCell = useMemo(() => {
    const map = new Map()
    for (const log of logs) map.set(`${log.employee_id}|${log.log_date}`, log)
    return map
  }, [logs])

  const hoursFor = useCallback(
    (employeeId, isoDate) => {
      const log = byCell.get(`${employeeId}|${isoDate}`)
      return log?.hours_worked == null ? null : Number(log.hours_worked)
    },
    [byCell]
  )

  const weeklyTotal = useCallback(
    (employeeId) =>
      logs
        .filter((l) => l.employee_id === employeeId)
        .reduce((sum, l) => sum + Number(l.hours_worked ?? 0), 0),
    [logs]
  )

  /** Upsert (or clear) a single day's hours for one employee. */
  const setHours = useCallback(
    async (employeeId, isoDate, rawHours) => {
      if (!orgId) throw new Error('No organization in session.')
      const cellKey = `${employeeId}|${isoDate}`
      const existing = byCell.get(cellKey)
      setSavingCell(cellKey)

      try {
        if (rawHours === null || rawHours === '') {
          if (!existing) return
          const { error: deleteError } = await supabase
            .from('work_logs')
            .delete()
            .eq('id', existing.id)
          if (deleteError) throw new Error(errorMessage(deleteError))
          setLogs((prev) => prev.filter((l) => l.id !== existing.id))
          return
        }

        const hours = Number(rawHours)
        if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
          throw new Error('Hours must be between 0 and 24.')
        }

        const payload = {
          org_id: orgId,
          employee_id: employeeId,
          log_date: isoDate,
          ...shiftTimestamps(isoDate, hours),
        }

        const { data, error: upsertError } = await supabase
          .from('work_logs')
          .upsert(payload, { onConflict: 'employee_id,log_date' })
          .select(SELECT)
          .single()
        if (upsertError) throw new Error(errorMessage(upsertError))

        setLogs((prev) => {
          const rest = prev.filter((l) => l.id !== data.id)
          return [...rest, data]
        })
      } catch (err) {
        toast.error(err.message)
        throw err
      } finally {
        setSavingCell(null)
      }
    },
    [orgId, byCell]
  )

  return {
    days,
    rangeStart,
    rangeEnd,
    logs,
    loading,
    error,
    savingCell,
    hoursFor,
    weeklyTotal,
    setHours,
    refetch: fetchLogs,
  }
}

/** Month-to-date overtime hours across the org, for the dashboard stat card. */
export function useMonthlyOvertime() {
  const { orgId } = useAuth()
  const [hours, setHours] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!orgId) {
        setLoading(false)
        return
      }
      const now = new Date()
      const first = toISODate(new Date(now.getFullYear(), now.getMonth(), 1))
      const last = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))

      const { data, error } = await supabase
        .from('work_logs')
        .select('hours_worked, log_date')
        .eq('org_id', orgId)
        .gte('log_date', first)
        .lte('log_date', last)

      if (!active) return
      if (error || !data) {
        setHours(0)
      } else {
        // Overtime is anything past 8h in a day, summed across the month.
        const total = data.reduce((sum, l) => {
          const worked = Number(l.hours_worked ?? 0)
          return sum + Math.max(worked - 8, 0)
        }, 0)
        setHours(Math.round(total * 10) / 10)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [orgId])

  return { hours, loading }
}
