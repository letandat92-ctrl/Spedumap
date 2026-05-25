'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'


export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if must change password
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()
      if (profile?.must_change_password) {
        router.push('/auth/change-password')
        return
      }
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">SPEDUMAP</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Hệ thống đánh giá phát triển toàn diện</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-6">Đăng nhập</h2>

          {error && (
            <div className="mb-4 p-3 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-sm text-[var(--red)]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] transition-colors"
                placeholder="therapist@spedumap.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--ink-3)] mt-6">
          spedumax.com · SPEDUMAP v1.1
        </p>
      </div>
    </div>
  )
}
