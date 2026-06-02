'use client'

// app/head/children/page.tsx — Head "Trẻ & Phụ huynh" management.
// Ported from ui_head_children.html. Lists parents (user_profiles role=parent)
// with their children (+ active/pending cycle), client-side search, and a
// 2-step "add parent & child" modal. Parent create/lookup + magic link go
// through /api/head/manage-parent (service role); the child INSERT is a direct
// authenticated write (children RLS allows it).

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

interface Parent { id: string; email: string | null; full_name: string | null; phone: string | null; status: string | null }
interface TeamMember { therapist_id: string; role_in_cycle: string }
interface Cycle { id: string; status: string; teacher_id: string | null; cycle_therapists?: TeamMember[] }
interface Child { id: string; name: string; dob: string | null; parent_id: string | null; parent_email: string | null; cycles: Cycle[] }
interface Therapist { id: string; full_name: string | null; role: string }

// Roles eligible to be picked as cycle team members.
const THERAPIST_ROLES = ['senior_therapist', 'technician_therapist', 'junior_therapist']
const ROLE_LABEL: Record<string, string> = {
  senior_therapist: 'Senior', technician_therapist: 'Technician',
  junior_therapist: 'Junior', head_therapist: 'Head', admin: 'Admin',
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase() || '?'
}
function ageYears(dob: string | null): string {
  if (!dob) return ''
  const b = new Date(dob); if (isNaN(b.getTime())) return ''
  const y = Math.floor((Date.now() - b.getTime()) / 31557600000)
  return `${y} tuổi`
}
function fmtDate(d: string | null): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

// active > pending > none
function childCycle(c: Child): { kind: 'active' | 'pending' | 'none'; cycle: Cycle | null } {
  const active = c.cycles?.find(x => x.status === 'active')
  if (active) return { kind: 'active', cycle: active }
  const pending = c.cycles?.find(x => x.status === 'pending')
  if (pending) return { kind: 'pending', cycle: pending }
  return { kind: 'none', cycle: null }
}

export default function HeadChildrenPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const { role } = useRole()
  const canAssign = can(role, 'assign_case')

  const [parents, setParents]   = useState<Parent[]>([])
  const [childrenByParent, setChildrenByParent] = useState<Record<string, Child[]>>({})
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [therapistMap, setTherapistMap] = useState<Record<string, Therapist>>({})
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [openCards, setOpenCards] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Assign-therapist modal state
  const [assignOpen, setAssignOpen]   = useState(false)
  const [assignChild, setAssignChild] = useState<Child | null>(null)
  const [assignCycle, setAssignCycle] = useState<Cycle | null>(null)
  const [assignSel, setAssignSel]     = useState<Record<string, 'lead' | 'member'>>({}) // therapist_id → role
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError]   = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep]           = useState<1 | 2>(1)
  const [pEmail, setPEmail] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pName, setPName]   = useState('')
  const [foundParentId, setFoundParentId] = useState<string | null>(null)
  const [lookup, setLookup] = useState<{ kind: 'found' | 'new'; label: string } | null>(null)
  const [cName, setCName] = useState('')
  const [cDob, setCDob]   = useState('')
  const [cGender, setCGender] = useState('')
  const [presetParentId, setPresetParentId] = useState<string | null>(null) // when "add child" for an existing parent
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const { data: ps } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, status')
      .eq('role', 'parent')
      .order('full_name')
    const parentList = (ps as Parent[]) || []
    setParents(parentList)

    const grouped: Record<string, Child[]> = {}
    if (parentList.length) {
      const { data: cs } = await supabase
        .from('children')
        .select('id, name, dob, parent_id, parent_email, cycles(id, status, teacher_id, cycle_therapists(therapist_id, role_in_cycle))')
        .in('parent_id', parentList.map(p => p.id))
        .order('name')
      for (const ch of (cs as Child[]) || []) {
        const pid = ch.parent_id || ''
        ;(grouped[pid] ||= []).push(ch)
      }
    }
    setChildrenByParent(grouped)
    setOpenCards(prev => (prev.size === 0 && parentList[0] ? new Set([parentList[0].id]) : prev))

    // Therapist directory — for team chips (name resolution) + assign picker.
    // Includes head/admin so a lead who locked baseline resolves to a name.
    const { data: ts } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .in('role', ['senior_therapist', 'technician_therapist', 'junior_therapist', 'head_therapist', 'admin'])
      .order('full_name')
    const tList = (ts as Therapist[]) || []
    setTherapists(tList)
    setTherapistMap(Object.fromEntries(tList.map(t => [t.id, t])))

    setLoading(false)
  }

  // ── Stats ──
  const allChildren = useMemo(() => Object.values(childrenByParent).flat(), [childrenByParent])
  const activeCount  = allChildren.filter(c => childCycle(c).kind === 'active').length
  const pendingCount = allChildren.filter(c => childCycle(c).kind === 'pending').length

  // ── Search (client-side over parent name/email/phone + child name) ──
  const term = search.trim().toLowerCase()
  const filteredParents = useMemo(() => {
    if (!term) return parents
    return parents.filter(p => {
      const hay = [p.full_name, p.email, p.phone].filter(Boolean).join(' ').toLowerCase()
      const kids = (childrenByParent[p.id] || []).map(c => c.name).join(' ').toLowerCase()
      return hay.includes(term) || kids.includes(term)
    })
  }, [parents, childrenByParent, term])

  function toggleCard(id: string) {
    setOpenCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Modal ──
  function openAddModal(parentId?: string) {
    setStep(1); setModalError(null); setLookup(null); setFoundParentId(null)
    setPEmail(''); setPPhone(''); setPName(''); setCName(''); setCDob(''); setCGender('')
    if (parentId) {
      // Add child for an existing parent → skip lookup, go to step 2.
      const p = parents.find(x => x.id === parentId)
      setPresetParentId(parentId)
      setFoundParentId(parentId)
      setPEmail(p?.email ?? ''); setPName(p?.full_name ?? '')
      setStep(2)
    } else {
      setPresetParentId(null)
    }
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false) }

  async function runLookup() {
    if (presetParentId) return
    if (!pEmail.includes('@') && pPhone.trim().length <= 8) { setLookup(null); setFoundParentId(null); return }
    try {
      const res = await fetch('/api/head/manage-parent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', email: pEmail, phone: pPhone }),
      })
      const data = await res.json()
      if (data.found && data.parent) {
        setFoundParentId(data.parent.id)
        setPName(data.parent.full_name ?? '')
        setLookup({ kind: 'found', label: `✓ Tìm thấy phụ huynh: ${data.parent.full_name ?? data.parent.email} — thêm trẻ mới cho phụ huynh này` })
      } else {
        setFoundParentId(null)
        setLookup({ kind: 'new', label: '✦ Phụ huynh mới — sẽ tạo tài khoản và gửi magic link qua email' })
      }
    } catch {
      setLookup(null)
    }
  }

  const step1Valid = !!(pEmail.includes('@') && pPhone.trim() && (foundParentId || pName.trim()))
  const step2Valid = !!(cName.trim() && cDob)

  async function handleSubmit() {
    if (step === 1) { setStep(2); setModalError(null); return }
    // step 2 → resolve parent then insert child
    setSubmitting(true); setModalError(null)
    try {
      let parentId = foundParentId
      let parentEmail = pEmail.trim()

      if (!parentId) {
        const res = await fetch('/api/head/manage-parent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', email: pEmail, phone: pPhone, full_name: pName }),
        })
        const data = await res.json()
        if (!res.ok || !data.parent) throw new Error(data.error || 'Lỗi tạo phụ huynh')
        parentId = data.parent.id
        parentEmail = data.parent.email
      }

      const { error: childErr } = await supabase.from('children').insert({
        name: cName.trim(),
        dob: cDob,
        gender: cGender || null,
        parent_id: parentId,
        parent_email: parentEmail,
        created_by: currentUserId,
      })
      if (childErr) {
        if (childErr.code === '23505') throw new Error('Trẻ này đã có hồ sơ (trùng tên + ngày sinh).')
        throw new Error('Lỗi tạo hồ sơ trẻ: ' + childErr.message)
      }

      setModalOpen(false)
      await load()
      if (parentId) setOpenCards(prev => new Set(prev).add(parentId!))
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Assign-therapist modal ──
  // Picker = therapist-role profiles, plus anyone already on the team (e.g. a
  // head/admin lead who locked baseline). lead defaults to the cycle.teacher_id.
  function openAssign(child: Child, cycle: Cycle) {
    if (!canAssign) return
    if (cycle.status !== 'pending') { setAssignError('Chỉ phân công khi cycle ở trạng thái Chờ assign.'); return }
    // Seed only from the cycle's existing team. Lead is NOT auto-assigned to
    // teacher_id — the person who locked baseline (Service 1) is usually not the
    // intervention lead (Service 2). Whoever assigns must pick the lead manually.
    const sel: Record<string, 'lead' | 'member'> = {}
    for (const m of cycle.cycle_therapists || []) sel[m.therapist_id] = m.role_in_cycle === 'lead' ? 'lead' : 'member'
    setAssignChild(child); setAssignCycle(cycle); setAssignSel(sel)
    setAssignError(null); setAssignOpen(true)
  }
  function closeAssign() { setAssignOpen(false) }

  function toggleTp(id: string) {
    setAssignSel(prev => {
      if (prev[id]) {
        if (prev[id] === 'lead') { setAssignError('Không thể bỏ lead trực tiếp — đổi lead trước.'); return prev }
        const next = { ...prev }; delete next[id]; return next
      }
      return { ...prev, [id]: 'member' }
    })
  }
  function setLead(id: string) {
    setAssignSel(prev => {
      const next: Record<string, 'lead' | 'member'> = {}
      for (const k of Object.keys(prev)) next[k] = prev[k] === 'lead' ? 'member' : prev[k]
      next[id] = 'lead'
      return next
    })
  }

  async function saveAssign() {
    if (!assignCycle || !assignChild) return
    const team = Object.entries(assignSel).map(([therapist_id, role_in_cycle]) => ({ therapist_id, role_in_cycle }))
    const leads = team.filter(m => m.role_in_cycle === 'lead')
    if (leads.length !== 1) { setAssignError('Cần đúng 1 lead.'); return }
    setAssignSaving(true); setAssignError(null)
    try {
      // Client mutation is RLS-guarded server-side: ct_insert/ct_delete require
      // is_staff() AND cycle.status='pending'; the one-lead is enforced by the
      // cycle_therapists_one_lead unique index. We don't trust the client checks.
      const { error: delErr } = await supabase.from('cycle_therapists').delete().eq('cycle_id', assignCycle.id)
      if (delErr) throw new Error('Lỗi xoá phân công cũ: ' + delErr.message)
      const { error: insErr } = await supabase.from('cycle_therapists').insert(
        team.map(m => ({ cycle_id: assignCycle.id, therapist_id: m.therapist_id, role_in_cycle: m.role_in_cycle, assigned_by: currentUserId }))
      )
      if (insErr) {
        if (insErr.code === '23505') throw new Error('Vi phạm ràng buộc: cycle chỉ được có 1 lead.')
        throw new Error('Lỗi lưu phân công: ' + insErr.message)
      }
      setAssignOpen(false)
      await load()
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setAssignSaving(false)
    }
  }

  return (
    <div className="hc-root">
      <style>{CSS}</style>

      <header className="hc-header">
        <div className="hc-hlogo">SPEDUMAP</div>
        <nav className="hc-hnav">
          <span className="hc-hnav-item active">Trẻ &amp; Phụ huynh</span>
          <a className="hc-hnav-item" onClick={() => router.push('/head/dashboard')}>Dashboard</a>
        </nav>
        <div className="hc-hright">
          <div className="hc-hrole">Head Therapist</div>
          <a className="hc-hnav-item" onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}>Đăng xuất</a>
        </div>
      </header>

      <div className="hc-page">
        <div className="hc-page-header">
          <div>
            <div className="hc-page-title">Trẻ &amp; Phụ huynh</div>
            <div className="hc-page-sub">Quản lý hồ sơ phụ huynh và trẻ can thiệp</div>
          </div>
          <button className="hc-btn-primary" onClick={() => openAddModal()}>
            <span className="hc-ico">+</span> Thêm phụ huynh &amp; trẻ
          </button>
        </div>

        {/* Stats */}
        <div className="hc-stats-strip">
          <Stat icon="👨‍👩‍👧" bg="#EEF8F8" val={parents.length} label="Phụ huynh" />
          <Stat icon="🧒" bg="#EEF8F2" val={allChildren.length} label="Trẻ can thiệp" />
          <Stat icon="🔄" bg="#EEF2FC" val={activeCount} label="Cycle đang active" />
          <Stat icon="⏳" bg="#FDF8EC" val={pendingCount} label="Chờ assign" />
        </div>

        {/* Search */}
        <div className="hc-search-wrap">
          <span className="hc-search-ico">🔍</span>
          <input className="hc-search-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên phụ huynh, tên trẻ, email, số điện thoại..." />
        </div>

        {loading ? (
          <div className="hc-empty"><div className="hc-empty-sub">Đang tải...</div></div>
        ) : filteredParents.length === 0 ? (
          <div className="hc-empty">
            <div className="hc-empty-icon">👶</div>
            <div className="hc-empty-title">{parents.length === 0 ? 'Chưa có hồ sơ nào' : 'Không tìm thấy kết quả'}</div>
            <div className="hc-empty-sub">{parents.length === 0 ? 'Bắt đầu bằng cách thêm phụ huynh và trẻ để quản lý chương trình can thiệp.' : 'Thử từ khoá khác.'}</div>
          </div>
        ) : (
          filteredParents.map(p => {
            const kids = childrenByParent[p.id] || []
            const open = openCards.has(p.id)
            return (
              <div className={`hc-parent-card${open ? ' open' : ''}`} key={p.id}>
                <div className="hc-parent-header" onClick={() => toggleCard(p.id)}>
                  <div className="hc-parent-avi">{initials(p.full_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="hc-parent-name">{p.full_name || '(chưa có tên)'}</div>
                    <div className="hc-parent-contact">
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.email && <span>✉️ {p.email}</span>}
                    </div>
                  </div>
                  <div className="hc-parent-badge">
                    <div className="hc-child-count">{kids.length} trẻ</div>
                    <span className="hc-expand-ico">▼</span>
                  </div>
                </div>
                {open && (
                  <div className="hc-children-list">
                    {kids.map(ch => {
                      const { kind, cycle } = childCycle(ch)
                      const dot = kind === 'active' ? '#1A6A3A' : kind === 'pending' ? '#8A6200' : '#6B7280'
                      const team = [...(cycle?.cycle_therapists || [])].sort(
                        (a, b) => (a.role_in_cycle === 'lead' ? -1 : 0) - (b.role_in_cycle === 'lead' ? -1 : 0)
                      )
                      return (
                        <div className="hc-child-row" key={ch.id}>
                          <div className="hc-child-dot" style={{ background: dot }} />
                          <div className="hc-child-info">
                            <div className="hc-child-name">{ch.name}</div>
                            <div className="hc-child-meta">
                              {[ageYears(ch.dob), fmtDate(ch.dob)].filter(Boolean).join(' · ')}
                            </div>
                            {cycle && (
                              <div className="hc-team-chips">
                                {team.length === 0 && <span className="hc-chip-empty">— chưa phân công —</span>}
                                {team.map(m => (
                                  <span key={m.therapist_id} className={`hc-chip${m.role_in_cycle === 'lead' ? ' lead' : ''}`}>
                                    {m.role_in_cycle === 'lead' ? '★ ' : ''}{therapistMap[m.therapist_id]?.full_name || '(?)'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="hc-child-status">
                            {kind === 'active' && <span className="hc-status-chip hc-status-active">Active</span>}
                            {kind === 'pending' && <span className="hc-status-chip hc-status-pending">Chờ assign</span>}
                            {kind === 'none' && <span className="hc-status-chip hc-status-none">Chưa có cycle</span>}
                          </div>
                          <div className="hc-child-actions">
                            <button className="hc-btn-xs" disabled title="Tính năng đang phát triển">Xem baseline</button>
                            {kind === 'active' && (
                              <button className="hc-btn-xs primary" disabled title="Tính năng đang phát triển">Vào cycle →</button>
                            )}
                            {kind === 'pending' && (
                              <button
                                className="hc-btn-xs primary"
                                disabled={!canAssign}
                                title={canAssign ? 'Phân công therapist cho cycle này' : 'Chỉ Head/Admin được phân công'}
                                onClick={() => cycle && openAssign(ch, cycle)}
                              >Assign therapist →</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="hc-add-child-row">
                      <button className="hc-btn-add-child" onClick={() => openAddModal(p.id)}>+ Thêm trẻ cho phụ huynh này</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="hc-modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="hc-modal">
            <div className="hc-modal-head">
              <div className="hc-modal-title">{step === 1 ? 'Bước 1 — Phụ huynh' : 'Bước 2 — Thông tin trẻ'}</div>
              <button className="hc-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="hc-modal-body">
              <div className="hc-steps">
                <div className={`hc-step ${step === 1 ? 'active' : 'done'}`}><span className="hc-step-num">Bước 1</span>Phụ huynh</div>
                <div className={`hc-step ${step === 2 ? 'active' : ''}`}><span className="hc-step-num">Bước 2</span>Thông tin trẻ</div>
              </div>

              {step === 1 ? (
                <>
                  <div className="hc-form-row">
                    <div className="hc-form-group">
                      <div className="hc-form-label">Email <span className="hc-req">*</span></div>
                      <input className="hc-form-input" type="email" value={pEmail}
                        onChange={e => setPEmail(e.target.value)} onBlur={runLookup} placeholder="parent@email.com" />
                    </div>
                    <div className="hc-form-group">
                      <div className="hc-form-label">Số điện thoại <span className="hc-req">*</span></div>
                      <input className="hc-form-input" value={pPhone}
                        onChange={e => setPPhone(e.target.value)} onBlur={runLookup} placeholder="09xx xxx xxx" />
                    </div>
                  </div>
                  {lookup && (
                    <div className={`hc-lookup-result ${lookup.kind === 'found' ? 'hc-lookup-found' : 'hc-lookup-new'}`} style={{ display: 'block' }}>
                      {lookup.label}
                    </div>
                  )}
                  <div className="hc-form-group" style={{ marginTop: 14 }}>
                    <div className="hc-form-label">Họ tên phụ huynh <span className="hc-req">*</span></div>
                    <input className="hc-form-input" value={pName} disabled={!!foundParentId}
                      onChange={e => setPName(e.target.value)} placeholder="Nguyễn Thị Mai" />
                  </div>
                </>
              ) : (
                <>
                  {presetParentId && (
                    <div className="hc-lookup-result hc-lookup-found" style={{ display: 'block', marginBottom: 14 }}>
                      Thêm trẻ cho: <strong>{pName || pEmail}</strong>
                    </div>
                  )}
                  <div className="hc-form-group">
                    <div className="hc-form-label">Họ tên trẻ <span className="hc-req">*</span></div>
                    <input className="hc-form-input" value={cName} onChange={e => setCName(e.target.value)} placeholder="Nguyễn Minh Tuấn" />
                  </div>
                  <div className="hc-form-row">
                    <div className="hc-form-group">
                      <div className="hc-form-label">Ngày sinh <span className="hc-req">*</span></div>
                      <input className="hc-form-input" type="date" value={cDob} onChange={e => setCDob(e.target.value)} />
                    </div>
                    <div className="hc-form-group">
                      <div className="hc-form-label">Giới tính</div>
                      <select className="hc-form-input" style={{ cursor: 'pointer' }} value={cGender} onChange={e => setCGender(e.target.value)}>
                        <option value="">— Chọn —</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal-bd)', borderRadius: 6, padding: '10px 12px', fontSize: 11.5, color: 'var(--teal)', marginTop: 4 }}>
                    {foundParentId
                      ? 'Phụ huynh đã có tài khoản — không gửi lại magic link.'
                      : 'Phụ huynh sẽ nhận email magic link để truy cập cổng thông tin sau khi tạo.'}
                  </div>
                </>
              )}

              {modalError && (
                <div className="hc-lookup-result hc-lookup-new" style={{ display: 'block', marginTop: 12, background: 'var(--red-bg)', borderColor: 'var(--red-bd)', color: 'var(--red)' }}>
                  {modalError}
                </div>
              )}
            </div>
            <div className="hc-modal-footer">
              <button className="hc-btn-cancel" onClick={() => { if (step === 2 && !presetParentId) { setStep(1); setModalError(null) } else closeModal() }}>
                {step === 2 && !presetParentId ? '← Quay lại' : 'Huỷ'}
              </button>
              <button className="hc-btn-next" disabled={submitting || (step === 1 ? !step1Valid : !step2Valid)} onClick={handleSubmit}>
                {submitting ? 'Đang lưu...' : step === 1 ? 'Tiếp theo →' : 'Tạo hồ sơ ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN THERAPIST MODAL */}
      {assignOpen && assignCycle && (
        <div className="hc-modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeAssign() }}>
          <div className="hc-modal">
            <div className="hc-modal-head">
              <div className="hc-modal-title">Phân công therapist</div>
              <button className="hc-modal-close" onClick={closeAssign}>×</button>
            </div>
            <div className="hc-modal-body">
              <div className="hc-assign-ctx">
                <strong>{assignChild?.name}</strong> · <span className="hc-status-chip hc-status-pending">Chờ assign</span>
                <div className="hc-assign-hint">★ Lead = therapist khoá baseline. Chọn thêm member cho team.</div>
              </div>
              {(() => {
                const avail = therapists.filter(t => THERAPIST_ROLES.includes(t.role) || assignSel[t.id])
                if (avail.length === 0) return <div className="hc-empty-sub" style={{ padding: '20px 0' }}>Không có therapist khả dụng. Tạo account qua /admin.</div>
                return (
                  <div className="hc-tp-list">
                    {avail.map(t => {
                      const sel = !!assignSel[t.id]
                      const isLead = assignSel[t.id] === 'lead'
                      const isCycleLead = assignCycle.teacher_id === t.id
                      return (
                        <div key={t.id} className={`hc-tp-row${sel ? ' sel' : ''}`} onClick={() => toggleTp(t.id)}>
                          <div className="hc-tp-check">{sel ? '✓' : ''}</div>
                          <div className="hc-tp-info">
                            <div className="hc-tp-name">{t.full_name || '(?)'}{isCycleLead && <span className="hc-tp-tag"> (khoá baseline)</span>}</div>
                            <div className="hc-tp-role">{ROLE_LABEL[t.role] || t.role}</div>
                          </div>
                          <label className={`hc-tp-lead${sel ? '' : ' hidden'}`} onClick={e => e.stopPropagation()}>
                            <input type="radio" name="leadPick" checked={isLead} onChange={() => setLead(t.id)} /> Lead
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {assignError && (
                <div className="hc-lookup-result hc-lookup-new" style={{ display: 'block', marginTop: 12, background: 'var(--red-bg)', borderColor: 'var(--red-bd)', color: 'var(--red)' }}>
                  {assignError}
                </div>
              )}
            </div>
            <div className="hc-modal-footer">
              <div className="hc-assign-count">
                {Object.keys(assignSel).length} đã chọn · {Object.values(assignSel).includes('lead')
                  ? <span style={{ color: '#1A6A3A' }}>★ đã có lead</span>
                  : <span style={{ color: '#B52020' }}>chọn 1 lead cho team</span>}
              </div>
              <button className="hc-btn-next" disabled={assignSaving || !Object.values(assignSel).includes('lead')} onClick={saveAssign}>
                {assignSaving ? 'Đang lưu...' : 'Lưu phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, bg, val, label }: { icon: string; bg: string; val: number; label: string }) {
  return (
    <div className="hc-stat-item">
      <div className="hc-stat-icon" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="hc-stat-val">{val}</div>
        <div className="hc-stat-label">{label}</div>
      </div>
    </div>
  )
}

const CSS = `
.hc-root{font-family:'Source Sans 3',sans-serif;background:#F4F6F9;color:#111827;min-height:100vh}
.hc-root *,.hc-root *::before,.hc-root *::after{box-sizing:border-box}
.hc-header{background:#0D2240;height:52px;display:flex;align-items:center;padding:0 20px;gap:10px;position:sticky;top:0;z-index:100}
.hc-hlogo{font-family:'Libre Baskerville',serif;font-size:14px;font-weight:700;color:#fff}
.hc-hnav{display:flex;gap:2px;margin-left:20px}
.hc-hnav-item{height:52px;padding:0 14px;display:flex;align-items:center;font-size:12px;font-weight:600;color:rgba(255,255,255,.5);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;text-decoration:none}
.hc-hnav-item:hover{color:rgba(255,255,255,.8)}
.hc-hnav-item.active{color:#fff;border-bottom-color:#fff}
.hc-hright{margin-left:auto;display:flex;align-items:center;gap:10px}
.hc-hrole{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:3px 8px;border-radius:3px}
.hc-page{max-width:900px;margin:0 auto;padding:28px 20px 64px}
.hc-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px}
.hc-page-title{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;color:#111827;margin-bottom:3px}
.hc-page-sub{font-size:12.5px;color:#6B7280}
.hc-btn-primary{height:40px;padding:0 18px;background:#0D2240;color:#fff;border:none;border-radius:7px;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap}
.hc-btn-primary:hover{background:#1A3A6A}
.hc-ico{font-size:16px;line-height:1}
.hc-search-wrap{position:relative;margin-bottom:20px}
.hc-search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#6B7280;font-size:14px}
.hc-search-input{width:100%;height:40px;border:1px solid #E5E7EB;border-radius:7px;padding:0 12px 0 36px;font-family:'Source Sans 3',sans-serif;font-size:13px;color:#111827;background:#fff;outline:none}
.hc-search-input:focus{border-color:#2A5A9A}
.hc-stats-strip{display:flex;gap:10px;margin-bottom:20px}
.hc-stat-item{flex:1;background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px}
.hc-stat-icon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.hc-stat-val{font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:#111827;line-height:1}
.hc-stat-label{font-size:10px;color:#6B7280;margin-top:1px}
.hc-parent-card{background:#fff;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.hc-parent-header{padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none}
.hc-parent-avi{width:38px;height:38px;border-radius:50%;background:#EEF8F8;border:2px solid #A0D0D0;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:#0A6060;flex-shrink:0}
.hc-parent-name{font-size:14px;font-weight:700;color:#111827}
.hc-parent-contact{font-size:11px;color:#6B7280;margin-top:1px;display:flex;gap:10px}
.hc-parent-contact span{display:flex;align-items:center;gap:3px}
.hc-parent-badge{margin-left:auto;display:flex;align-items:center;gap:6px}
.hc-child-count{font-size:10px;font-weight:700;color:#6B7280;background:#F3F4F6;border:1px solid #E5E7EB;padding:2px 8px;border-radius:10px}
.hc-expand-ico{color:#6B7280;font-size:12px;transition:transform .2s}
.hc-parent-card.open .hc-expand-ico{transform:rotate(180deg)}
.hc-children-list{border-top:1px solid #E5E7EB;padding:8px 16px 12px}
.hc-child-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px}
.hc-child-row:hover{background:#F3F4F6}
.hc-child-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.hc-child-info{flex:1;min-width:0}
.hc-child-name{font-size:12.5px;font-weight:600;color:#111827}
.hc-child-meta{font-size:10.5px;color:#6B7280;margin-top:1px}
.hc-child-status{display:flex;align-items:center;gap:6px}
.hc-child-actions{display:flex;gap:4px}
.hc-btn-xs{height:26px;padding:0 10px;border-radius:5px;font-size:10.5px;font-weight:600;cursor:pointer;font-family:'Source Sans 3',sans-serif;border:1px solid #E5E7EB;background:#fff;color:#374151;white-space:nowrap}
.hc-btn-xs:hover{background:#F3F4F6}
.hc-btn-xs.primary{background:#0D2240;color:#fff;border-color:#0D2240}
.hc-btn-xs.primary:hover{background:#1A3A6A}
.hc-btn-xs:disabled{opacity:.45;cursor:not-allowed;pointer-events:auto}
.hc-status-chip{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:10px;white-space:nowrap}
.hc-status-active{background:#EEF8F2;color:#1A6A3A;border:1px solid #B0D8C0}
.hc-status-pending{background:#FDF8EC;color:#8A6200;border:1px solid #E8C880}
.hc-status-none{background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB}
.hc-add-child-row{padding:6px 10px}
.hc-btn-add-child{height:30px;padding:0 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Source Sans 3',sans-serif;border:1px dashed #E5E7EB;background:transparent;color:#6B7280}
.hc-btn-add-child:hover{border-color:#2A5A9A;color:#1A3A6A;background:rgba(13,34,64,.03)}
.hc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.hc-modal{background:#fff;border-radius:12px;width:100%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.15);overflow:hidden}
.hc-modal-head{background:#0D2240;padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
.hc-modal-title{font-family:'Libre Baskerville',serif;font-size:16px;font-weight:700;color:#fff}
.hc-modal-close{background:none;border:none;color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;line-height:1;padding:2px}
.hc-modal-close:hover{color:#fff}
.hc-modal-body{padding:20px 18px}
.hc-steps{display:flex;gap:0;margin-bottom:20px;border:1px solid #E5E7EB;border-radius:7px;overflow:hidden}
.hc-step{flex:1;padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#6B7280;background:#F3F4F6;border-right:1px solid #E5E7EB}
.hc-step:last-child{border-right:none}
.hc-step.active{background:#0D2240;color:#fff}
.hc-step.done{background:#EEF8F2;color:#1A6A3A}
.hc-step-num{font-family:'DM Mono',monospace;font-size:10px;display:block;margin-bottom:1px}
.hc-form-group{margin-bottom:14px}
.hc-form-label{font-size:11px;font-weight:700;color:#374151;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px;display:flex;align-items:center;gap:4px}
.hc-req{color:#B52020;font-size:13px;line-height:1}
.hc-form-input{width:100%;height:40px;border:1px solid #E5E7EB;border-radius:6px;padding:0 12px;font-family:'Source Sans 3',sans-serif;font-size:13.5px;color:#111827;outline:none;background:#fff}
.hc-form-input:focus{border-color:#2A5A9A}
.hc-form-input:disabled{background:#F3F4F6;color:#6B7280}
.hc-form-row{display:flex;gap:10px}
.hc-form-row .hc-form-group{flex:1}
.hc-lookup-result{margin-top:8px;padding:10px 12px;border-radius:6px;font-size:12px}
.hc-lookup-found{background:#EEF8F2;border:1px solid #B0D8C0;color:#1A6A3A}
.hc-lookup-new{background:#FDF8EC;border:1px solid #E8C880;color:#8A6200}
.hc-modal-footer{padding:12px 18px;border-top:1px solid #E5E7EB;display:flex;gap:8px;justify-content:flex-end}
.hc-btn-cancel{height:36px;padding:0 16px;border-radius:6px;border:1px solid #E5E7EB;background:#fff;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:600;color:#6B7280;cursor:pointer}
.hc-btn-cancel:hover{background:#F3F4F6}
.hc-btn-next{height:36px;padding:0 20px;border-radius:6px;border:none;background:#0D2240;color:#fff;font-family:'Source Sans 3',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.hc-btn-next:hover{background:#1A3A6A}
.hc-btn-next:disabled{opacity:.4;pointer-events:none}
.hc-empty{text-align:center;padding:48px 20px;color:#6B7280}
.hc-empty-icon{font-size:40px;margin-bottom:12px}
.hc-empty-title{font-size:15px;font-weight:600;color:#374151;margin-bottom:6px}
.hc-empty-sub{font-size:12.5px;line-height:1.6}
.hc-team-chips{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px}
.hc-chip{display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;background:#EEF8F8;color:#0A6060;border:1px solid #A0D0D0}
.hc-chip.lead{background:#0D2240;color:#fff;border-color:#0D2240}
.hc-chip-empty{font-size:10px;color:#6B7280;font-style:italic}
.hc-assign-ctx{font-size:13px;color:#374151;margin-bottom:14px}
.hc-assign-hint{font-size:10.5px;color:#6B7280;margin-top:4px}
.hc-tp-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto}
.hc-tp-row{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid #E5E7EB;border-radius:6px;cursor:pointer}
.hc-tp-row:hover{border-color:#2A5A9A;background:#FAFBFD}
.hc-tp-row.sel{border-color:#0D2240;background:#EEF8F2}
.hc-tp-check{width:18px;height:18px;border:2px solid #E5E7EB;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.hc-tp-row.sel .hc-tp-check{background:#1A6A3A;border-color:#1A6A3A}
.hc-tp-info{flex:1;min-width:0}
.hc-tp-name{font-size:12.5px;font-weight:600;color:#111827}
.hc-tp-tag{font-size:9px;color:#6B7280;font-weight:400}
.hc-tp-role{font-size:10px;color:#6B7280;text-transform:capitalize}
.hc-tp-lead{display:flex;align-items:center;gap:4px;font-size:10.5px;color:#374151;cursor:pointer}
.hc-tp-lead.hidden{visibility:hidden}
.hc-tp-lead input{width:auto;height:auto}
.hc-assign-count{font-size:10.5px;color:#6B7280;margin-right:auto}
`
