'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { can, canManage, ROLES, type Role } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

interface UserProfile {
  id:          string
  email?:      string
  role:        string
  full_name?:  string
  phone?:      string
  status?:     string
  created_at?: string
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
  senior_therapist:     'bg-blue-100 text-blue-800',
  technician_therapist: 'bg-blue-100 text-blue-800',
  junior_therapist:     'bg-sky-100 text-sky-800',
}

export default function HeadStaffPage() {
  const supabase = createClient()
  const router = useRouter()
  const { role: myRole } = useRole()

  const [users, setUsers]       = useState<UserProfile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  // Edit modal state
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null)
  const [editName, setEditName]     = useState('')
  const [editPhone, setEditPhone]   = useState('')
  const [editRole, setEditRole]     = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, role, full_name, phone, status, created_at')
      .eq('status', 'active')
      .in('role', ['senior_therapist', 'technician_therapist', 'junior_therapist'])
      .order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  const manageable = useMemo(() =>
    myRole ? users.filter(u => canManage(myRole, u.role)) : [],
  [users, myRole])

  const filtered = useMemo(() => {
    if (!search.trim()) return manageable
    const q = search.trim().toLowerCase()
    return manageable.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }, [manageable, search])

  const assignableRoles = useMemo(() =>
    myRole ? ROLES.filter(r => canManage(myRole, r)) : [],
  [myRole])

  const canEdit = can(myRole, 'edit_user')

  function openEdit(u: UserProfile) {
    setEditTarget(u)
    setEditName(u.full_name || '')
    setEditPhone(u.phone || '')
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

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Edit modal */}
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
                <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]">
                  {assignableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
            </div>
            {editError && <div className="mt-3 text-sm text-[var(--red)]">{editError}</div>}
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
        <div className="flex items-center gap-5">
          <a href="/" className="font-serif font-bold text-white text-lg" style={{ textDecoration: 'none' }}>SPEDUMAP</a>
          <nav className="flex items-center gap-1">
            <button onClick={() => router.push('/head/children')}
              className="text-xs font-semibold text-white/50 hover:text-white/80 px-2 py-1">
              Trẻ &amp; Phụ huynh
            </button>
            <button onClick={() => router.push('/head/dashboard')}
              className="text-xs font-semibold text-white/50 hover:text-white/80 px-2 py-1">
              Dashboard
            </button>
            <span className="text-xs font-semibold text-white border-b-2 border-white px-2 py-1">Nhân sự</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a href="/profile" className="text-white/60 text-xs hover:text-white" style={{ textDecoration: 'none' }}>Hồ sơ</a>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-white/50 text-xs hover:text-white">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-[var(--navy)]">Nhân sự trị liệu</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">Quản lý thông tin therapist trong nhánh lâm sàng</p>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tên / email…"
          className="w-full max-w-sm h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
        />

        {/* List */}
        <div className="bg-white border border-[var(--rule)] rounded-xl divide-y divide-[var(--rule-2)]">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--ink-3)]">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-3)]">Không tìm thấy therapist nào.</div>
          ) : (
            filtered.map(u => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--ink)]">{u.full_name || '—'}</div>
                  <div className="text-xs text-[var(--ink-3)] mt-0.5">{u.email}{u.phone && ` · ${u.phone}`}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {canEdit && (
                    <button onClick={() => openEdit(u)}
                      className="text-xs text-[var(--navy)] hover:text-[var(--teal)] px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                      Sửa
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
