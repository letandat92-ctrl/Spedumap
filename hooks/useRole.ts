'use client'

// hooks/useRole.ts — fetch the current user's role once on mount (client-side).
// Pages use this with lib/permissions.can() to gate UI. roleLoading lets pages
// avoid acting on an empty role before the fetch resolves (no premature
// redirects / flashes). role is '' when unauthenticated or no profile row.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRole() {
  const [role, setRole] = useState<string>('')
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    let active = true
    ;(async () => {
      try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (active) { setRole(''); setRoleLoading(false) } return }
        const { data: profile } = await sb
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (active) { setRole(profile?.role ?? ''); setRoleLoading(false) }
      } catch {
        if (active) { setRole(''); setRoleLoading(false) }
      }
    })()
    return () => { active = false }
  }, [])

  return { role, roleLoading }
}
