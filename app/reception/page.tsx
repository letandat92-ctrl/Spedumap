'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

interface Parent {
  id:        string
  email:     string
  full_name: string | null
  phone:     string | null
}

export default function ReceptionPage() {
  const router  = useRouter()
  const supabase = createClient()
  const { role, roleLoading } = useRole()

  // Create form
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  // Parent list
  const [parents, setParents]         = useState<Parent[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [callerEmail, setCallerEmail] = useState('')

  // Delete modal (re-auth M3)
  const [deleteTarget, setDeleteTarget]     = useState<Parent | null>(null)
  const [reAuthPassword, setReAuthPassword] = useState('')
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCallerEmail(data.user?.email ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!roleLoading && can(role, 'create_parent')) loadParents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, role])

  async function loadParents() {
    setListLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, phone')
      .eq('role', 'parent')
      .eq('status', 'active')
      .order('full_name')
    setParents((data as Parent[]) || [])
    setListLoading(false)
  }

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
        loadParents()
      }
    } catch {
      setError('Không kết nối được server')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !reAuthPassword) return
    setDeleting(true)
    setDeleteError(null)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email:    callerEmail,
      password: reAuthPassword,
    })
    if (authErr) {
      setDeleteError('Mật khẩu không đúng. Vui lòng thử lại.')
      setDeleting(false)
      return
    }

    try {
      const res = await fetch('/api/admin/delete-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: deleteTarget.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Lỗi không xác định')
      } else {
        setDeleteTarget(null)
        setReAuthPassword('')
        loadParents()
      }
    } catch {
      setDeleteError('Không kết nối được server')
    } finally {
      setDeleting(false)
    }
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setReAuthPassword('')
    setDeleteError(null)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Re-auth / confirm delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-[var(--ink)] text-base mb-1">Xác nhận vô hiệu hoá</h3>
            <p className="text-sm text-[var(--ink-3)] mb-4">
              Vô hiệu hoá hồ sơ phụ huynh{' '}
              <span className="font-medium text-[var(--ink)]">
                {deleteTarget.full_name || deleteTarget.email}
              </span>.
            </p>
            <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
              Nhập mật khẩu của bạn để xác nhận
            </label>
            <input
              type="password"
              value={reAuthPassword}
              onChange={e => { setReAuthPassword(e.target.value); setDeleteError(null) }}
              placeholder="Mật khẩu hiện tại của bạn"
              className="w-full h-10 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)] mb-3"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && reAuthPassword) handleDeleteConfirm() }}
            />
            {deleteError && (
              <div className="mb-3 text-sm text-[var(--red)]">{deleteError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 h-9 border border-[var(--rule)] rounded-lg text-sm text-[var(--ink-3)] hover:bg-[var(--rule-2)] disabled:opacity-40"
              >
                Huỷ
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!reAuthPassword || deleting}
                className="px-4 h-9 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? 'Đang xử lý...' : 'Vô hiệu hoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-12 pb-12 space-y-8">

        {/* Header */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-[var(--navy)]">Lễ tân</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Quản lý hồ sơ phụ huynh — không cấp đăng nhập</p>
        </div>

        {/* Create form */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--ink)] mb-5">Hồ sơ phụ huynh mới</h2>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full h-9 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)]"
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
                  className="w-full h-9 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)]"
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
                  className="w-full h-9 px-3 border border-[var(--rule)] rounded-lg text-sm focus:outline-none focus:border-[var(--navy)]"
                  placeholder="0901234567"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || !email || !phone.trim()}
              className="h-9 px-6 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              {saving ? 'Đang lưu...' : 'Tạo hồ sơ'}
            </button>
          </form>
        </div>

        {/* Parent list */}
        <div className="bg-white border border-[var(--rule)] rounded-xl">
          <div className="px-6 py-4 border-b border-[var(--rule)] flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-[var(--navy)]">
              Danh sách phụ huynh ({parents.length})
            </h2>
            <button onClick={loadParents} className="text-xs text-[var(--ink-3)] hover:text-[var(--navy)]">
              Làm mới
            </button>
          </div>

          {listLoading ? (
            <div className="p-6 text-center text-sm text-[var(--ink-3)]">Đang tải...</div>
          ) : parents.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--ink-3)]">Chưa có hồ sơ phụ huynh</div>
          ) : (
            <div className="divide-y divide-[var(--rule-2)]">
              {parents.map(p => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)]">{p.full_name || '—'}</div>
                    <div className="text-xs text-[var(--ink-3)] mt-0.5">
                      {p.email}{p.phone ? ` · ${p.phone}` : ''}
                    </div>
                  </div>
                  {can(role, 'delete_parent') && (
                    <button
                      onClick={() => { setDeleteTarget(p); setDeleteError(null) }}
                      className="text-xs text-[var(--ink-3)] hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Vô hiệu hoá
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
