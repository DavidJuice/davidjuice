import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, errorMessage } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export const DEFAULT_BRANCHES = [
  'Federal Way',
  'Lynnwood',
  'Tacoma',
  'Los Angeles',
  'HQ',
]

/** Current organization plus admin mutations for its name and branch list. */
export function useOrg() {
  const { org, orgId, isAdmin, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  const branches = org?.branches?.length ? org.branches : DEFAULT_BRANCHES

  const updateOrg = useCallback(
    async (patch) => {
      if (!orgId) throw new Error('No organization in session.')
      setSaving(true)
      try {
        const { error } = await supabase.from('organizations').update(patch).eq('id', orgId)
        if (error) throw new Error(errorMessage(error))
        await refreshProfile()
      } finally {
        setSaving(false)
      }
    },
    [orgId, refreshProfile]
  )

  const renameOrg = useCallback(
    async (name) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Company name cannot be empty.')
      await updateOrg({ name: trimmed })
      toast.success('Company name updated.')
    },
    [updateOrg]
  )

  const addBranch = useCallback(
    async (branch) => {
      const trimmed = branch.trim()
      if (!trimmed) throw new Error('Branch name cannot be empty.')
      if (branches.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('That branch already exists.')
      }
      await updateOrg({ branches: [...branches, trimmed] })
      toast.success(`Added ${trimmed}.`)
    },
    [branches, updateOrg]
  )

  const removeBranch = useCallback(
    async (branch) => {
      await updateOrg({ branches: branches.filter((b) => b !== branch) })
      toast.success(`Removed ${branch}.`)
    },
    [branches, updateOrg]
  )

  return { org, orgId, branches, isAdmin, saving, renameOrg, addBranch, removeBranch }
}
