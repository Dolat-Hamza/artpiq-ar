'use client'
import { useEffect, useState } from 'react'
import { supabase } from './client'
import { useAuth } from './auth'

export type FeatureKey = 'visualise' | 'crm' | 'marketing' | 'ar'

const ALL_FEATURES: FeatureKey[] = ['visualise', 'crm', 'marketing', 'ar']

interface FeaturesState {
  features: FeatureKey[]
  plan: string
  isSuperAdmin: boolean
  loading: boolean
}

const DEFAULT: FeaturesState = {
  features: ALL_FEATURES,
  plan: 'full',
  isSuperAdmin: false,
  loading: true,
}

/**
 * Loads per-user feature flags and super-admin status from Supabase.
 * Defaults to all features enabled when no row exists — keeps the UX
 * permissive for early users / unmigrated accounts.
 */
export function useFeatures(): FeaturesState & { has: (k: FeatureKey) => boolean } {
  const { user } = useAuth()
  const [state, setState] = useState<FeaturesState>(DEFAULT)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setState({ ...DEFAULT, loading: false })
      return
    }
    async function load(uid: string) {
      const [feat, admin] = await Promise.all([
        supabase()
          .from('user_features')
          .select('features, plan')
          .eq('owner_id', uid)
          .maybeSingle(),
        supabase()
          .from('app_admins')
          .select('email')
          .limit(1)
          .maybeSingle(),
      ])
      if (cancelled) return
      const features = (feat.data?.features as FeatureKey[] | undefined) ?? ALL_FEATURES
      const plan = feat.data?.plan ?? 'full'
      const isSuperAdmin = !!admin.data
      setState({ features, plan, isSuperAdmin, loading: false })
    }
    load(user.id).catch(() => {
      if (!cancelled) setState({ ...DEFAULT, loading: false })
    })
    return () => { cancelled = true }
  }, [user])

  return {
    ...state,
    has: (k: FeatureKey) => state.features.includes(k),
  }
}

/**
 * Server-friendly: just the keys, no React.
 */
export function allFeatureKeys(): FeatureKey[] {
  return [...ALL_FEATURES]
}
