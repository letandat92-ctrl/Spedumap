'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ParentAuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true); setError(null)
    const sb = createClient()
    const { error: e } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/parent` }
    })
    if (e) { setError(e.message); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  if (sent) return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'Source Sans 3, sans-serif', background:'#F4F6F9',
      gap:12
    }}>
      <div style={{ fontSize:32 }}>📬</div>
      <div style={{
        fontFamily:'Libre Baskerville, serif', fontSize:20,
        fontWeight:700, color:'#111827'
      }}>Kiểm tra email của bạn</div>
      <div style={{ fontSize:13, color:'#6B7280', textAlign:'center',
        maxWidth:320, lineHeight:1.6 }}>
        Chúng tôi đã gửi link đăng nhập đến<br/>
        <strong style={{ color:'#111827' }}>{email}</strong>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'Source Sans 3, sans-serif', background:'#F4F6F9',
      gap:16
    }}>
      <div style={{
        background:'#fff', border:'1px solid #E5E7EB',
        borderRadius:12, padding:'32px 28px', width:'100%',
        maxWidth:380, boxShadow:'0 1px 4px rgba(0,0,0,.05)'
      }}>
        <div style={{
          fontFamily:'Libre Baskerville, serif', fontSize:20,
          fontWeight:700, color:'#111827', marginBottom:6
        }}>Cổng thông tin phụ huynh</div>
        <div style={{ fontSize:12.5, color:'#6B7280', marginBottom:24, lineHeight:1.6 }}>
          Nhập email đã đăng ký để nhận link đăng nhập.
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key==='Enter' && handleSubmit()}
          placeholder="Email của bạn"
          style={{
            width:'100%', height:42, border:'1px solid #E5E7EB',
            borderRadius:6, padding:'0 12px', fontSize:14,
            fontFamily:'Source Sans 3, sans-serif', outline:'none',
            marginBottom: error ? 6 : 16
          }}
        />
        {error && (
          <div style={{ fontSize:11.5, color:'#B52020', marginBottom:12 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
          style={{
            width:'100%', height:44, borderRadius:8,
            background:'#0D2240', color:'#fff', border:'none',
            fontSize:14, fontWeight:700, cursor:'pointer',
            opacity: (loading || !email.trim()) ? .5 : 1
          }}
        >
          {loading ? 'Đang gửi...' : 'Gửi link đăng nhập'}
        </button>
      </div>
    </div>
  )
}
