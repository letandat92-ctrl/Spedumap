'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default function ReceptionPage() {
  const router = useRouter()
  const { role, roleLoading } = useRole()

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  if (roleLoading) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>
  if (!can(role, 'create_parent')) {
    router.replace('/auth/login')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'parent', email, full_name: fullName, phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Lỗi không xác định')
      } else {
        setSuccess(`Đã tạo hồ sơ phụ huynh: ${data.email}`)
        setFullName('')
        setEmail('')
        setPhone('')
      }
    } catch {
      setError('Không kết nối được server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-[var(--navy)]">Lễ tân</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Tạo hồ sơ phụ huynh — không cấp đăng nhập</p>
        </div>

        <div className="bg-white border border-[var(--rule)] rounded-xl p-8 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--ink)] mb-6">Hồ sơ phụ huynh mới</h2>

          {error && (
            <div className="mb-4 p-3 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-sm text-[var(--red)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-[var(--green-bg,#f0fdf4)] border border-[var(--green-bd,#bbf7d0)] rounded-lg text-sm text-[var(--green,#16a34a)]">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] transition-colors"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Email <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] transition-colors"
                placeholder="phu_huynh@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                Số điện thoại <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] transition-colors"
                placeholder="0901234567"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Đang lưu...' : 'Tạo hồ sơ phụ huynh'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
