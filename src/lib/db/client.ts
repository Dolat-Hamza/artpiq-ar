'use client'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let _client: SupabaseClient<Database> | null = null

export function supabase(): SupabaseClient<Database> {
  if (_client) return _client
  if (!url || !key) {
    throw new Error(
      'Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  _client = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return _client
}

export function hasSupabase() {
  return Boolean(url && key)
}
