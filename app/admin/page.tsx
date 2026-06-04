'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLES, can, canManage, type Role } from '@/lib/permissions'
import { useRole } from '@/hooks/useRole'

export const dynamic = 'force-dynamic'


interface UserProfile {
  id:          string
  email?:      string
  role:        string
  full_name?:  string
  created_at?: string
  status?:     string
  phone?:      string
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
  const { role: myRole } = useRole()

  const [users, setUsers]           = useState<UserProfile[]>([])
  const [loading, setLoading]       = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [myUserId, setMyUserId]     = useState('')

  // Create user form
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('senior_therapist')
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [pwCopied, setPwCopied]   = useState(false)
  const [createResult, setCreateResult] = useState<{
    success?: boolean
    message?: string
    email?: string
    temp_password?: string
    error?: string
  } | null>(null)

  // Filter + search state (client-side, no refetch)
  const [filterRole, setFilterRole]   = useState<string>('all')
  const [searchText, setSearchText]   = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Reactivate
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  // Delete + re-auth state
  const [deleteTarget, setDeleteTarget]     = useState<UserProfile | null>(null)
  const [reAuthPassword, setReAuthPassword] = useState('')
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  // Edit modal state
  const [editTarget, setEditTarget]         = useState<UserProfile | null>(null)
  const [editName, setEditName]             = useState('')
  const [editPhone, setEditPhone]           = useState('')
  const [editStatus, setEditStatus]         = useState('active')
  const [editRole, setEditRole]             = useState('')
  const [editSaving, setEditSaving]         = useState(false)
  const [editError, setEditError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email ?? '')
      setMyUserId(data.user?.id ?? '')
    })
    loadUsers(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stats always on full active set; filter/search narrow the list display only
  const manageable = useMemo(() =>
    myRole ? users.filter(u => canManage(myRole, u.role)) : [],
  [users, myRole])

  // UI guards — mirror server-side rules (server still enforces; this is UX-only)
  const activeAdminCount = useMemo(() =>
    users.filter(u => u.role === 'admin' && (u.status ?? 'active') === 'active').length,
  [users])

  function isDeactivatable(u: UserProfile): boolean {
    if (u.id === myUserId) return false                              // self
    if (u.role === 'admin' && activeAdminCount === 1) return false  // last active admin
    return true
  }

  const roleCounts = useMemo(() =>
    Object.fromEntries(ROLES.map(r => [r, manageable.filter(u => u.role === r).length])),
  [manageable])

  const filteredUsers = useMemo(() => {
    let list = manageable
    if (filterRole !== 'all') list = list.filter(u => u.role === filterRole)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [manageable, filterRole, searchText])

  // Roles that this caller can assign via edit
  const assignableRoles = useMemo(() =>
    myRole ? ROLES.filter(r => canManage(myRole, r)) : [],
  [myRole])

  async function loadUsers(inactive = showInactive) {
    setLoading(true)
    let q = supabase
      .from('user_profiles')
      .select('id, email, role, full_name, created_at, status, phone')
      .order('created_at', { ascending: false })
    if (!inactive) q = q.eq('status', 'active')
    const { data } = await q
    setUsers(data || [])
    setLoading(false)
  }

  async function handleReactivate(u: UserProfile) {
    if (!canManage(myRole, u.role)) return
    setReactivatingId(u.id)
    try {
      await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: u.id, patch: { status: 'active' } }),
      })
      loadUsers(showInactive)
    } finally {
      setReactivatingId(null)
    }
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

  // ── Edit modal handlers ──
  function openEdit(u: UserProfile) {
    setEditTarget(u)
    setEditName(u.full_name || '')
    setEditPhone(u.phone || '')
    setEditStatus(u.status || 'active')
    setEditRole(u.role)
    setEditError(null)
  }
  function closeEdit() { setEditTarget(null); setEditError(null) }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    setEditError(null)
    try {
      const patch: Record<string, string> = {}
      if (editName !== (editTarget.full_name || '')) patch.full_name = editName
      if (editPhone !== (editTarget.phone || '')) patch.phone = editPhone
      if (editStatus !== (editTarget.status || 'active')) patch.status = editStatus
      if (editRole !== editTarget.role) patch.role = editRole

      if (Object.keys(patch).length === 0) { closeEdit(); return }

      const res = await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: editTarget.id, patch }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error ?? 'Lỗi không xác định')
      } else {
        closeEdit()
        loadUsers()
      }
    } catch {
      setEditError('Không kết nối được server')
    } finally {
      setEditSaving(false)
    }
  }

  const canEdit = can(myRole, 'edit_user')

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

      {/* Edit user modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-[var(--ink)] text-base mb-4">
              Chỉnh sửa — {editTarget.full_name || editTarget.email}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Họ tên</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">SĐT</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Trạng thái</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]">
                  {assignableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
            </div>

            {editError && (
              <div className="mt-3 text-sm text-[var(--red)]">{editError}</div>
            )}

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={closeEdit} disabled={editSaving}
                className="px-4 h-9 border border-[var(--rule)] rounded-lg text-sm text-[var(--ink-3)] hover:bg-[var(--rule-2)] disabled:opacity-40">
                Huỷ
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="px-4 h-9 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40">
                {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[var(--navy)] px-8 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="font-serif font-bold text-white text-lg" style={{ textDecoration: 'none' }}>SPEDUMAP</a>
          <span className="text-white/50 text-sm ml-2">/ Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/profile" className="text-white/60 text-xs hover:text-white" style={{ textDecoration: 'none' }}>Hồ sơ</a>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/auth/login')}
            className="text-white/60 text-xs hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
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
              disabled={!email || !fullName.trim() || (role === 'parent' && !phone.trim()) || creating}
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
                        <div>Email: <span className="font-mono font-bold">{createResult.email || email}</span></div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Mật khẩu tạm:</span>
                          <code className="bg-white px-2 py-0.5 rounded border border-[var(--green-bd)] font-mono font-bold text-[var(--green)] text-base tracking-wider">
                            {createResult.temp_password}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(createResult.temp_password ?? '').then(() => {
                                setPwCopied(true)
                                setTimeout(() => setPwCopied(false), 2000)
                              })
                            }}
                            className="px-2 py-0.5 text-xs font-semibold bg-[var(--green)] text-white rounded hover:opacity-80"
                          >
                            {pwCopied ? '✓ Đã copy' : 'Copy'}
                          </button>
                        </div>
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800 font-semibold">
                          ⚠ Lưu mật khẩu ngay — chỉ hiện một lần, không thể khôi phục sau khi đóng thông báo này.
                        </div>
                        <div className="text-xs text-[var(--ink-3)] mt-1">
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

          {/* Header row */}
          <div className="px-6 py-4 border-b border-[var(--rule)] flex items-center justify-between gap-4">
            <h2 className="font-serif text-lg font-bold text-[var(--navy)] shrink-0">
              Danh sách tài khoản ({manageable.length})
            </h2>
            {/* Search */}
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Tìm tên / email…"
              className="flex-1 max-w-xs h-8 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
            />
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-3)] cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => {
                  setShowInactive(e.target.checked)
                  loadUsers(e.target.checked)
                }}
                className="w-3.5 h-3.5"
              />
              Hiện đã vô hiệu
            </label>
            <button onClick={() => loadUsers(showInactive)} className="text-xs text-[var(--ink-3)] hover:text-[var(--navy)] shrink-0">
              Làm mới
            </button>
          </div>

          {/* Stats row — always reflects full active set */}
          <div className="px-6 py-3 border-b border-[var(--rule-2)] flex items-center gap-3 flex-wrap">
            {ROLES.filter(r => roleCounts[r] > 0).map(r => (
              <span key={r} className="flex items-center gap-1.5 text-xs">
                <span className={`font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[r] || 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[r] || r}
                </span>
                <span className="text-[var(--ink-3)]">{roleCounts[r]}</span>
              </span>
            ))}
            <span className="ml-auto text-xs text-[var(--ink-3)]">
              Tổng: {manageable.length}
            </span>
          </div>

          {/* Filter chips */}
          <div className="px-6 py-2.5 border-b border-[var(--rule-2)] flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--ink-3)] mr-1">Lọc:</span>
            <button
              onClick={() => setFilterRole('all')}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterRole === 'all'
                  ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                  : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
              }`}
            >
              Tất cả
            </button>
            {ROLES.filter(r => roleCounts[r] > 0).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(filterRole === r ? 'all' : r)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterRole === r
                    ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                    : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
                }`}
              >
                {ROLE_LABELS[r] || r}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--ink-3)]">Đang tải...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-3)]">Không tìm thấy tài khoản nào.</div>
          ) : (
            <div className="divide-y divide-[var(--rule-2)]">
              {filteredUsers.map(u => {
                const inactive = (u.status ?? 'active') === 'inactive'
                const canDeactivate = isDeactivatable(u)
                const deactivateTitle = !canDeactivate
                  ? u.id === myUserId
                    ? 'Không thể vô hiệu hoá tài khoản của chính mình'
                    : 'Không thể vô hiệu hoá admin active cuối cùng'
                  : undefined
                return (
                  <div key={u.id} className={`px-6 py-4 flex items-center justify-between ${inactive ? 'opacity-50 bg-[var(--rule-2)]' : ''}`}>
                    <div>
                      <div className="text-sm font-medium text-[var(--ink)]">
                        {u.full_name || '—'}
                        {inactive && <span className="ml-2 text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Inactive</span>}
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
                      {canEdit && !inactive && (
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs text-[var(--navy)] hover:text-[var(--teal)] px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Sửa
                        </button>
                      )}
                      {inactive && canManage(myRole, u.role) && (
                        <div className="flex flex-col items-end gap-0.5">
                          <button
                            onClick={() => handleReactivate(u)}
                            disabled={reactivatingId === u.id}
                            className="text-xs text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-40"
                          >
                            {reactivatingId === u.id ? 'Đang xử lý...' : 'Kích hoạt lại'}
                          </button>
                          {u.role !== 'parent' && (
                            <span className="text-[10px] text-orange-600 max-w-[160px] text-right leading-tight">
                              ⚠ Login đã bị thu hồi — cần tạo lại tài khoản để đăng nhập
                            </span>
                          )}
                        </div>
                      )}
                      {!inactive && (
                        <button
                          onClick={() => { if (canDeactivate) { setDeleteTarget(u); setDeleteError(null) } }}
                          disabled={!canDeactivate}
                          title={deactivateTitle}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            canDeactivate
                              ? 'text-[var(--ink-3)] hover:text-red-600 hover:bg-red-50 cursor-pointer'
                              : 'text-[var(--ink-3)] opacity-30 cursor-not-allowed'
                          }`}
                        >
                          Vô hiệu hoá
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
