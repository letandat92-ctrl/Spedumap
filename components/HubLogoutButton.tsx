'use client'

import { createClient } from '@/lib/supabase/client'

export function HubLogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,.28)',
        color: '#D6E2F0',
        fontFamily: "'Source Sans 3',sans-serif",
        fontSize: 12,
        fontWeight: 600,
        padding: '5px 12px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
      Đăng xuất
    </button>
  )
}
