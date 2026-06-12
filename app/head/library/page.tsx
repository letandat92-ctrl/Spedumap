'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'
import { B2L, NEARME_DOMAINS } from '@/lib/ontology'
import { validateSolutionDomains } from './actions'

export const dynamic = 'force-dynamic'

// ── Block display names (39 blocks) ──────────────────────────────────────────
const BN: Record<string, string> = {
  sleep:'Sleep', microbiome:'Microbiome', nutrition:'Nutrition', immune:'Immune', metabolic:'Metabolic',
  arousal:'Arousal', reflex_survival:'Reflex Survival', reflex_postural:'Reflex Postural',
  reflex_cortical:'Reflex Cortical', tone:'Muscle Tone', ns_stability:'Neural Stability',
  vestibular:'Vestibular', proprioception:'Proprioception', auditory:'Auditory', visual:'Visual',
  tactile:'Tactile', taste:'Taste', smell:'Smell',
  motor_planning:'Motor Planning', gross_motor:'Gross Motor', fine_motor:'Fine Motor',
  postural_control:'Postural Control', bilateral_coord:'Bilateral Coord.',
  attention:'Attention Focus', auditory_processing:'Auditory Processing',
  visual_processing:'Visual Processing', wm_link:'Working Memory Link',
  oral_language:'Oral Language', word_finding:'Word Finding',
  phonemic_awareness:'Phonemic Awareness', auditory_memory:'Auditory Memory',
  visual_memory:'Visual Memory', self_control:'Self-Control', behavior:'Behavior',
  social_skills:'Social Skills', daily_living:'Daily Living',
  math:'Math', writing:'Writing', reading:'Reading',
}

const ALL_BLOCKS = Object.keys(B2L)

const CATEGORIES = ['environmental', 'exercise', 'parent_coaching', 'protocol'] as const
type Category = (typeof CATEGORIES)[number]

const CAT_LABELS: Record<Category, string> = {
  environmental:  'Environmental',
  exercise:       'Exercise',
  parent_coaching:'Parent Coaching',
  protocol:       'Protocol',
}

const LAYER_NAMES: Record<string, string> = {
  L0:'L0', L1:'L1', L2:'L2', L3:'L3', L4:'L4', L5:'L5', L6:'L6', L7:'L7',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LibraryItem {
  id:            string
  code:          string
  title:         string
  description:   string | null
  category:      string | null
  target_blocks: string[] | null
  nearme_domain: string[] | null
  is_active:     boolean
  created_at:    string | null
}

type FormState = {
  code:          string
  title:         string
  description:   string
  category:      string
  target_blocks: string[]
  nearme_domain: string[]
  is_active:     boolean
}

const EMPTY_FORM: FormState = {
  code: '', title: '', description: '', category: '',
  target_blocks: [], nearme_domain: [], is_active: true,
}

// ── Validation (server action — proprietary nearmeMix stays server-only) ─────

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { role } = useRole()

  const [items, setItems]       = useState<LibraryItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Block picker accordion by layer
  const [blockLayerOpen, setBlockLayerOpen] = useState<string | null>(null)

  const canWrite = role ? can(role, 'manage_library') : false

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('solution_library')
      .select('id, code, title, description, category, target_blocks, nearme_domain, is_active, created_at')
      .order('code')
    if (error) console.warn('load error:', error.message)
    setItems((data as LibraryItem[]) ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (!showInactive && !it.is_active) return false
      if (catFilter !== 'all' && it.category !== catFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return it.title.toLowerCase().includes(q) || it.code.toLowerCase().includes(q)
      }
      return true
    })
  }, [items, search, catFilter, showInactive])

  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(it: LibraryItem) {
    setEditId(it.id)
    setForm({
      code:          it.code,
      title:         it.title,
      description:   it.description ?? '',
      category:      it.category ?? '',
      target_blocks: it.target_blocks ?? [],
      nearme_domain: it.nearme_domain ?? [],
      is_active:     it.is_active,
    })
    setSaveError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.code.trim() || !form.title.trim()) {
      setSaveError('Code và Title là bắt buộc.')
      return
    }
    const bad = await validateSolutionDomains(form.target_blocks, form.nearme_domain)
    if (bad.length) {
      setSaveError(`Domain ${bad.join(', ')} không khớp block nào được chọn.`)
      return
    }
    setSaving(true)
    setSaveError(null)
    const payload = {
      code:          form.code.trim(),
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      category:      form.category || null,
      target_blocks: form.target_blocks.length ? form.target_blocks : null,
      nearme_domain: form.nearme_domain.length ? form.nearme_domain : null,
      is_active:     form.is_active,
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('solution_library').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('solution_library').insert(payload))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setModalOpen(false)
    loadItems()
  }

  async function handleToggleActive(it: LibraryItem) {
    await supabase.from('solution_library').update({ is_active: !it.is_active }).eq('id', it.id)
    loadItems()
  }

  function toggleBlock(block: string) {
    setForm(f => ({
      ...f,
      target_blocks: f.target_blocks.includes(block)
        ? f.target_blocks.filter(b => b !== block)
        : [...f.target_blocks, block],
    }))
  }

  function toggleDomain(d: string) {
    setForm(f => ({
      ...f,
      nearme_domain: f.nearme_domain.includes(d)
        ? f.nearme_domain.filter(x => x !== d)
        : [...f.nearme_domain, d],
    }))
  }

  const [badDomains, setBadDomains] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    validateSolutionDomains(form.target_blocks, form.nearme_domain)
      .then(bad => { if (!cancelled) setBadDomains(bad) })
    return () => { cancelled = true }
  }, [form.target_blocks, form.nearme_domain])

  // Blocks grouped by layer for picker
  const blocksByLayer = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const b of ALL_BLOCKS) {
      const l = B2L[b] ?? 'L0'
      ;(out[l] ||= []).push(b)
    }
    return out
  }, [])

  // ── Styles ────────────────────────────────────────────────────────────────
  const TH = 'px-3 py-2 text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wider text-left bg-[var(--rule-2)] border-b border-[var(--rule)]'
  const TD = 'px-3 py-2.5 text-sm border-b border-[var(--rule-2)]'

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Header — same nav pattern as head/dashboard */}
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
            <button onClick={() => router.push('/head/staff')}
              className="text-xs font-semibold text-white/50 hover:text-white/80 px-2 py-1">
              Nhân sự
            </button>
            <span className="text-xs font-semibold text-white border-b-2 border-white px-2 py-1">
              Thư viện bài tập
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a href="/profile" className="text-white/60 text-xs hover:text-white" style={{ textDecoration: 'none' }}>Hồ sơ</a>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-white/50 text-xs hover:text-white">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-lg font-bold text-[var(--navy)] mr-2">Thư viện bài tập</h1>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm code / tiêu đề..."
            className="h-8 px-3 text-sm border border-[var(--rule)] rounded-lg bg-white focus:outline-none focus:border-[var(--navy)] w-52"
          />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="h-8 px-2 text-sm border border-[var(--rule)] rounded-lg bg-white focus:outline-none"
          >
            <option value="all">Tất cả category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[var(--ink-3)] cursor-pointer select-none">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="w-3.5 h-3.5" />
            Hiện inactive
          </label>
          <div className="flex-1" />
          {canWrite && (
            <button
              onClick={openAdd}
              className="h-8 px-4 bg-[var(--navy)] text-white text-xs font-semibold rounded-lg hover:opacity-90"
            >
              + Thêm bài tập
            </button>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Tổng', val: items.length },
            { label: 'Active', val: items.filter(i => i.is_active).length },
            { label: 'Có taxonomy', val: items.filter(i => (i.target_blocks?.length ?? 0) > 0).length },
          ].map(c => (
            <div key={c.label} className="px-3 py-1.5 bg-white border border-[var(--rule)] rounded-lg text-center min-w-[80px]">
              <div className="text-xs text-[var(--ink-3)]">{c.label}</div>
              <div className="text-lg font-mono font-bold text-[var(--navy)]">{c.val}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[var(--ink-3)]">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--ink-3)]">Không có bài tập nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Tiêu đề</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Target Blocks</th>
                  <th className={TH}>NEARMe Domains</th>
                  <th className={TH}>Status</th>
                  {canWrite && <th className={TH}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => (
                  <tr key={it.id} className={`hover:bg-[var(--rule-2)] transition-colors ${!it.is_active ? 'opacity-50' : ''}`}>
                    <td className={`${TD} font-mono font-semibold text-[var(--navy)] text-xs`}>{it.code}</td>
                    <td className={TD}>
                      <div className="font-medium text-[var(--ink)]">{it.title}</div>
                      {it.description && <div className="text-xs text-[var(--ink-3)] mt-0.5 line-clamp-1">{it.description}</div>}
                    </td>
                    <td className={TD}>
                      {it.category ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold uppercase tracking-wide">
                          {CAT_LABELS[it.category as Category] ?? it.category}
                        </span>
                      ) : <span className="text-[var(--ink-3)] text-xs">—</span>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(it.target_blocks ?? []).slice(0, 5).map(b => (
                          <span key={b} className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[9px] font-semibold">
                            {BN[b] ?? b}
                          </span>
                        ))}
                        {(it.target_blocks ?? []).length > 5 && (
                          <span className="text-[9px] text-[var(--ink-3)]">+{(it.target_blocks ?? []).length - 5}</span>
                        )}
                        {!(it.target_blocks ?? []).length && <span className="text-[var(--ink-3)] text-xs">—</span>}
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(it.nearme_domain ?? []).map(d => (
                          <span key={d} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                            {d}
                          </span>
                        ))}
                        {!(it.nearme_domain ?? []).length && <span className="text-[var(--ink-3)] text-xs">—</span>}
                      </div>
                    </td>
                    <td className={TD}>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${it.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {it.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canWrite && (
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(it)}
                            className="text-xs text-[var(--navy)] hover:underline font-medium"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleToggleActive(it)}
                            className={`text-xs font-medium hover:underline ${it.is_active ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {it.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 px-4"
          style={{ background: 'rgba(0,0,0,.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            {/* Modal header */}
            <div className="bg-[var(--navy)] px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-white font-bold text-base">
                {editId ? 'Sửa bài tập' : 'Thêm bài tập mới'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5">

              {/* Code + Title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">Code <span className="text-red-500">*</span></label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="VD: EX-001"
                    className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none bg-white"
                  >
                    <option value="">— chọn category —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Tên bài tập / hoạt động"
                  className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Hướng dẫn thực hiện, lưu ý lâm sàng..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)] resize-none"
                />
              </div>

              {/* Target blocks — grouped by layer */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">
                  Target Blocks
                  {form.target_blocks.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
                      {form.target_blocks.length} đã chọn
                    </span>
                  )}
                </label>
                <div className="border border-[var(--rule)] rounded-lg overflow-hidden">
                  {['L0','L1','L2','L3','L4','L5','L6','L7'].map(layer => {
                    const blocksInLayer = blocksByLayer[layer] ?? []
                    const selectedInLayer = blocksInLayer.filter(b => form.target_blocks.includes(b)).length
                    const isOpen = blockLayerOpen === layer
                    return (
                      <div key={layer} className="border-b border-[var(--rule)] last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setBlockLayerOpen(isOpen ? null : layer)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--rule-2)] transition-colors text-left"
                        >
                          <span className="text-xs font-semibold text-[var(--ink-2)]">
                            {layer} — {LAYER_NAMES[layer]}
                            <span className="ml-2 text-[var(--ink-3)] font-normal">{blocksInLayer.length} blocks</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedInLayer > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">{selectedInLayer}</span>
                            )}
                            <span className="text-[var(--ink-3)] text-xs">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5 bg-[var(--bg)]">
                            {blocksInLayer.map(b => {
                              const sel = form.target_blocks.includes(b)
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => toggleBlock(b)}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                    sel
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-white text-[var(--ink-2)] border-[var(--rule)] hover:border-green-400'
                                  }`}
                                >
                                  {BN[b] ?? b}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {form.target_blocks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.target_blocks.map(b => (
                      <span key={b} className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-semibold">
                        {BN[b] ?? b}
                        <button type="button" onClick={() => toggleBlock(b)} className="hover:text-red-500 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* NEARMe domains */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">
                  NEARMe Domains
                  <span className="ml-1 text-[var(--ink-3)] font-normal text-[10px]">
                    (chỉ chọn domain có trọng số &gt; 0 trên ít nhất 1 block đã chọn)
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {NEARME_DOMAINS.map(d => {
                    const sel = form.nearme_domain.includes(d)
                    const bad = badDomains.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDomain(d)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                          bad
                            ? 'bg-red-50 text-red-600 border-red-400'
                            : sel
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-[var(--ink-2)] border-[var(--rule)] hover:border-purple-400'
                        }`}
                      >
                        {d}
                        {bad && <span className="ml-1 text-[10px]">⚠</span>}
                      </button>
                    )
                  })}
                </div>
                {badDomains.length > 0 && (
                  <div className="mt-2 p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-700">
                    Domain <strong>{badDomains.join(', ')}</strong> không có block nào trong danh sách đã chọn hỗ trợ domain này
                    (nearmeMix(block)[domain] = 0 trên tất cả block). Bỏ chọn domain hoặc thêm block phù hợp.
                  </div>
                )}
                {form.target_blocks.length === 0 && form.nearme_domain.length > 0 && (
                  <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs text-yellow-700">
                    Chọn ít nhất 1 target block để validate domain.
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-[var(--ink-2)]">{form.is_active ? 'Active' : 'Inactive'}</span>
              </label>

              {/* Error */}
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-700">{saveError}</div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm border border-[var(--rule)] rounded-lg text-[var(--ink-2)] hover:bg-[var(--rule-2)]"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || badDomains.length > 0}
                  className="px-5 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:opacity-90"
                >
                  {saving ? 'Đang lưu...' : editId ? 'Lưu thay đổi' : 'Thêm bài tập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
