'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ParentPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true)
        // TODO Phase 7D: redirect to /parent/[child_id]
      }
      setChecking(false)
    })
  }, [])

  if (checking) return null

  if (!authed) return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'Source Sans 3, sans-serif', background:'#F4F6F9'
    }}>
      <div style={{ fontSize:13, color:'#6B7280', marginBottom:16 }}>
        Cổng thông tin phụ huynh
      </div>
      <button
        onClick={() => router.push('/parent/auth')}
        style={{
          height:44, padding:'0 24px', borderRadius:8,
          background:'#0D2240', color:'#fff', border:'none',
          fontSize:14, fontWeight:700, cursor:'pointer'
        }}
      >
        Đăng nhập
      </button>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:'Source Sans 3, sans-serif'
    }}>
      <div style={{ fontSize:13, color:'#6B7280' }}>
        Đang tải thông tin...
      </div>
    </div>
  )
}
