'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  admin:                'Admin',
  head_therapist:       'Head Therapist',
  senior_therapist:     'Senior Therapist',
  technician_therapist: 'Technician',
  junior_therapist:     'Junior Therapist',
  reception:            'Lễ tân',
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId]       = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [role, setRole]           = useState('')
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(true)

  // Info edit
  const [saving, setSaving]       = useState(false)
  const [infoMsg, setInfoMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Password change
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      setAuthEmail(user.email || '')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, phone, email')
        .eq('id', user.id)
        .single()
      if (profile) {
        setRole(profile.role)
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
        setEmail(profile.email || user.email || '')
      }
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setInfoMsg(null)
    try {
      const updates: Record<string, string | null> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      }

      const trimmedEmail = email.trim().toLowerCase()
      if (trimmedEmail !== authEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (emailErr) throw emailErr
        updates.email = trimmedEmail
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
      if (error) throw error

      setInfoMsg({ ok: true, text: 'Đã lưu thay đổi.' })
    } catch (err) {
      setInfoMsg({ ok: false, text: err instanceof Error ? err.message : 'Lỗi không xác định' })
    } finally {
      setSaving(false)
    }
  }

  async function handlePwSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Mật khẩu xác nhận không khớp' }); return }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Mật khẩu phải có ít nhất 8 ký tự' }); return }

    setPwSaving(true)
    setPwMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error

      await supabase.from('user_profiles').update({ must_change_password: false }).eq('id', userId)

      setNewPw('')
      setConfirmPw('')
      setPwMsg({ ok: true, text: 'Đã đổi mật khẩu thành công.' })
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Lỗi không xác định' })
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--ink-3)]">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--navy)] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="font-serif font-bold text-white text-lg" style={{ textDecoration: 'none' }}>SPEDUMAP</a>
          <span className="text-white/50 text-sm">/ Hồ sơ cá nhân</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-white/60 text-xs hover:text-white" style={{ textDecoration: 'none' }}>← Hub</a>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-white/60 text-xs hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-8 space-y-8">

        {/* Info section */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-6">
          <h2 className="font-serif text-lg font-bold text-[var(--navy)] mb-1">Thông tin cá nhân</h2>
          <p className="text-xs text-[var(--ink-3)] mb-5">
            Vai trò: <span className="font-semibold">{ROLE_LABELS[role] || role}</span>
            <span className="text-[var(--ink-3)] ml-2">(không thể tự đổi)</span>
          </p>

          <form onSubmit={handleInfoSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Họ tên</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
              {email.trim().toLowerCase() !== authEmail && (
                <div className="text-[11px] text-[var(--gold)] mt-1">Thay đổi email sẽ gửi xác nhận đến địa chỉ mới.</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">SĐT</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
            </div>

            {infoMsg && (
              <div className={`text-sm ${infoMsg.ok ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{infoMsg.text}</div>
            )}

            <button type="submit" disabled={saving}
              className="h-9 px-6 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40">
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Password section */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-6">
          <h2 className="font-serif text-lg font-bold text-[var(--navy)] mb-5">Đổi mật khẩu</h2>

          <form onSubmit={handlePwSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Mật khẩu mới</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Ít nhất 8 ký tự" minLength={8}
                className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Xác nhận mật khẩu</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
            </div>

            {pwMsg && (
              <div className={`text-sm ${pwMsg.ok ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{pwMsg.text}</div>
            )}

            <button type="submit" disabled={pwSaving || !newPw}
              className="h-9 px-6 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40">
              {pwSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
