import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'acehr.auth',
  },
})

/** Normalises a PostgREST/Auth error into a message safe to show in a toast. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback
  const msg = error.message || error.error_description || fallback
  if (msg.includes('duplicate key')) return 'That record already exists.'
  if (msg.includes('row-level security')) return 'You do not have access to that record.'
  return msg
}
