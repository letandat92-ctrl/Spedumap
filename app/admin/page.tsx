'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'


interface UserProfile {
  id:          string
  email?:      string
  role:        string
  full_name?:  string
  created_at?: string
  status?:     string
}

const ROLE_LABELS: Record<string, string> = {
  admin:                'Admin',
  head_therapist:       'Head Therapist',
  senior_therapist:     'Senior Therapist',
  technician_therapist: 'Technician',
  junior_therapist:     'Junior Therapist',
  reception:            'Lễ tân',
  parent:               'Phụ huynh',
}

const ROLE_COLORS: Record<string, string> = {
  admin:                'bg-red-100 text-red-800',
  head_therapist:       'bg-purple-100 text-purple-800',
  senior_therapist:     'bg-blue-100 text-blue-800',
  technician_therapist: 'bg-blue-100 text-blue-800',
  junior_therapist:     'bg-sky-100 text-sky-800',
  reception:            'bg-orange-100 text-orange-800',
  parent:               'bg-green-100 text-green-800',
}

export default function AdminPage() {
  const supabase = createClient()

  const [users, setUsers]           = useState<UserProfile[]>([])
  const [loading, setLoading]       = useState(true)
  const [adminEmail, setAdminEmail] = useState('')

  // Create user form
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('senior_therapist')
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [createResult, setCreateResult] = useState<{
    success?: boolean
    message?: string
    temp_password?: string
    error?: string
  } | null>(null)

  // Delete + re-auth state
  const [deleteTarget, setDeleteTarget]     = useState<UserProfile | null>(null)
  const [reAuthPassword, setReAuthPassword] = useState('')
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? ''))
    loadUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, role, full_name, created_at, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateResult(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, role, full_name: fullName, phone }),
      })
      const data = await res.json()
      setCreateResult(data)
      if (data.success) {
        setEmail(''); setFullName(''); setPhone('')
        loadUsers()
      }
    } catch {
      setCreateResult({ error: 'Network error' })
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !reAuthPassword) return
    setDeleting(true)
    setDeleteError(null)

    // M3 re-auth: verify admin's own password before proceeding
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email:    adminEmail,
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
        loadUsers()
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
              Vô hiệu hoá <span className="font-medium text-[var(--ink)]">{deleteTarget.full_name || deleteTarget.email}</span>
              {' '}({ROLE_LABELS[deleteTarget.role] || deleteTarget.role}).
              {deleteTarget.role !== 'parent' && ' Tài khoản đăng nhập sẽ bị thu hồi ngay.'}
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

      {/* Header */}
      <div className="bg-[var(--navy)] px-8 py-4 flex items-center justify-between">
        <div>
          <span className="font-serif font-bold text-white text-lg">SPEDUMAP</span>
          <span className="text-white/50 text-sm ml-2">/ Admin Panel</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/auth/login')}
          className="text-white/60 text-xs hover:text-white"
        >
          Đăng xuất
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-8">

        {/* Create user form */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-6">
          <h2 className="font-serif text-lg font-bold text-[var(--navy)] mb-5">Tạo tài khoản mới</h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                  Họ tên *
                </label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nguyễn Thị Bình"
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="binh@spedumap.com"
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                >
                  <option value="senior_therapist">Senior Therapist</option>
                  <option value="junior_therapist">Junior Therapist</option>
                  <option value="technician_therapist">Technician Therapist</option>
                  <option value="head_therapist">Head Therapist</option>
                  <option value="reception">Lễ tân</option>
                  <option value="parent">Phụ huynh</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
                  SĐT {role === 'parent' ? <span className="text-[var(--red)]">*</span> : <span className="text-[var(--ink-3)] normal-case font-normal">(tùy chọn)</span>}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0909..."
                  className={`w-full h-9 px-3 text-sm border rounded-lg focus:outline-none ${
                    role === 'parent' && !phone.trim()
                      ? 'border-[var(--red)] focus:border-[var(--red)]'
                      : 'border-[var(--rule)] focus:border-[var(--navy)]'
                  }`}
                />
                {role === 'parent' && !phone.trim() && (
                  <div className="mt-1 text-[11px] text-[var(--red)]">SĐT bắt buộc cho phụ huynh</div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!email || (role === 'parent' && !phone.trim()) || creating}
              className="h-9 px-6 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40"
            >
              {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>

          {/* Result */}
          {createResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              createResult.success
                ? 'bg-[var(--green-bg)] border-[var(--green-bd)]'
                : 'bg-[var(--red-bg)] border-[var(--red-bd)]'
            }`}>
              {createResult.success ? (
                <div>
                  <div className="font-semibold text-[var(--green)] text-sm mb-2">
                    ✓ {createResult.temp_password ? 'Tài khoản đã tạo thành công' : 'Đã tạo hồ sơ phụ huynh'}
                  </div>
                  <div className="text-sm text-[var(--ink-2)] space-y-1">
                    {createResult.temp_password ? (
                      <>
                        <div>Email: <span className="font-mono font-bold">{createResult.message?.split(':')[0]?.split('.')[0] || email}</span></div>
                        <div className="flex items-center gap-2">
                          <span>Mật khẩu tạm:</span>
                          <code className="bg-white px-2 py-0.5 rounded border border-[var(--green-bd)] font-mono font-bold text-[var(--green)] text-base tracking-wider">
                            {createResult.temp_password}
                          </code>
                        </div>
                        <div className="text-xs text-[var(--ink-3)] mt-2">
                          Gửi mật khẩu này cho therapist. Họ sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
                        </div>
                      </>
                    ) : (
                      <div>{createResult.message || 'Đã tạo hồ sơ phụ huynh (không cấp đăng nhập).'}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[var(--red)] text-sm">
                  ✗ {createResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User list */}
        <div className="bg-white border border-[var(--rule)] rounded-xl">
          <div className="px-6 py-4 border-b border-[var(--rule)] flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[var(--navy)]">
              Danh sách tài khoản ({users.length})
            </h2>
            <button onClick={loadUsers} className="text-xs text-[var(--ink-3)] hover:text-[var(--navy)]">
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--ink-3)]">Đang tải...</div>
          ) : (
            <div className="divide-y divide-[var(--rule-2)]">
              {users.map(u => (
                <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)]">
                      {u.full_name || '—'}
                    </div>
                    <div className="text-xs text-[var(--ink-3)] mt-0.5">{u.email || u.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    {u.created_at && (
                      <span className="text-xs text-[var(--ink-3)]">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                    <button
                      onClick={() => { setDeleteTarget(u); setDeleteError(null) }}
                      className="text-xs text-[var(--ink-3)] hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Vô hiệu hoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
