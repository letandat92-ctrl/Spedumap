'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'


export default function ChangePasswordPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return }
    if (password.length < 8)  { setError('Mật khẩu phải có ít nhất 8 ký tự'); return }

    setLoading(true)
    setError(null)

    try {
      // Update password
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw pwErr

      // Clear must_change_password flag
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ must_change_password: false })
          .eq('id', user.id)
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">SPEDUMAP</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Đổi mật khẩu lần đầu đăng nhập</p>
        </div>

        <div className="bg-white border border-[var(--rule)] rounded-xl p-8 shadow-sm">
          <div className="mb-5 p-3 bg-[var(--gold-bg)] border border-[var(--gold-bd)] rounded-lg text-xs text-[var(--gold)]">
            Bạn cần đặt mật khẩu mới trước khi sử dụng hệ thống.
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-xs text-[var(--red)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)]"
                placeholder="Ít nhất 8 ký tự"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)]"
                placeholder="Nhập lại mật khẩu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40 mt-2"
            >
              {loading ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
