import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can, ROLE_ROUTES, type Action } from '@/lib/permissions'
import { HubLogoutButton } from '@/components/HubLogoutButton'

export const dynamic = 'force-dynamic'

// ── Gate helper ───────────────────────────────────────────────────────────────
// Mirrors spec canSee(): route prefix ∧ (action || true).
// Reads ROLE_ROUTES from lib/permissions — NOT a mirror copy.
function routeAllows(role: string, prefix: string): boolean {
  return ROLE_ROUTES[role]?.some(r => prefix.startsWith(r) || r === prefix) ?? false
}

// ── NAV_MAP — single source of truth (3 sections, 11 tiles) ─────────────────
// Matches ui_hub.html SECTIONS exactly: href / label / desc / accent / icon.
// action:null → route-only gate (no action check).
type TileAccent = 'green' | 'teal' | 'bronze' | 'navy'
interface Tile {
  label:  string
  desc:   string
  href:   string
  route:  string
  action: Action | null
  icon:   keyof typeof ICONS
  accent: TileAccent
}
const SECTIONS: { title: string; tiles: Tile[] }[] = [
  { title: 'Can thiệp lâm sàng', tiles: [
    { label: 'Đánh giá Baseline',  desc: 'Nhập 39-block, lock baseline.',               href: '/therapist/baseline',     route: '/therapist', action: 'assessment',    icon: 'clipboard',     accent: 'green'  },
    { label: 'Thiết lập Mục tiêu', desc: 'Goal setting trên baseline đã lock.',          href: '/therapist/goal',         route: '/therapist', action: 'assessment',    icon: 'target',        accent: 'green'  },
    { label: 'Mở Chu kỳ',          desc: 'Đặt tên cycle, chọn hypothesis.',              href: '/therapist/cycle',        route: '/therapist', action: 'cycle_open',    icon: 'cycle',         accent: 'green'  },
    { label: 'Buổi can thiệp',     desc: 'Daily session, ghi delta, gửi link xác nhận.', href: '/therapist/session',     route: '/therapist', action: 'daily_session', icon: 'calendarCheck', accent: 'teal'   },
    { label: 'Báo cáo Tiến trình', desc: 'Trend layer, chuẩn bị đóng chu kỳ.',          href: '/therapist/report',       route: '/therapist', action: 'view_progress', icon: 'chart',         accent: 'teal'   },
  ]},
  { title: 'Quản lý ca & Đóng chu kỳ', tiles: [
    { label: 'Dashboard tổng',    desc: 'Nhiều ca, pattern A/B/C.',                      href: '/head/dashboard',         route: '/head',      action: null,            icon: 'grid',          accent: 'navy'   },
    { label: 'Trẻ & Phụ huynh',  desc: 'Quản lý trẻ, gán therapist cho ca.',            href: '/head/children',          route: '/head',      action: 'assign_case',   icon: 'people',        accent: 'navy'   },
    { label: 'Retest mù',         desc: 'Đánh giá lại 39-block, không thấy điểm cũ.',   href: '/therapist/retest',       route: '/therapist', action: 'close_cycle',   icon: 'eyeOff',        accent: 'bronze' },
    { label: 'Tổng kết Đóng',    desc: 'So sánh 3-way, seed baseline kế.',              href: '/therapist/close-summary',route: '/therapist', action: 'close_cycle',   icon: 'checkCircle',   accent: 'bronze' },
  ]},
  { title: 'Quản trị & Tiếp đón', tiles: [
    { label: 'Quản lý người dùng',      desc: 'Tạo account staff, gán role.',          href: '/admin',     route: '/admin',     action: 'create_user',   icon: 'usersCog', accent: 'navy'   },
    { label: 'Tạo hồ sơ phụ huynh',    desc: 'Record-only, không cấp đăng nhập.',     href: '/reception', route: '/reception', action: 'create_parent', icon: 'userPlus', accent: 'bronze' },
  ]},
]

// ── Inline SVG icon paths (stroke-based, viewBox 0 0 24 24) ──────────────────
const ICONS = {
  clipboard:     '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8 11h8M8 15h5"/>',
  target:        '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  cycle:         '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  calendarCheck: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  chart:         '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4M13 16V8M18 16v-6"/>',
  grid:          '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  people:        '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>',
  eyeOff:        '<path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c5 0 9 5 9 8a12 12 0 0 1-2 3"/><path d="M6.6 6.6A12 12 0 0 0 3 12c0 3 4 8 9 8a9 9 0 0 0 3.6-.7"/><path d="M3 3l18 18"/>',
  checkCircle:   '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  usersCog:      '<path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 1 4-4h.5"/><circle cx="9" cy="7" r="4"/><circle cx="18" cy="16" r="3"/><path d="M18 13v1M18 18v1M21 16h-1M16 16h-1"/>',
  userPlus:      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
}

// Accent → icon bg + icon color (spec palette)
const ACCENT_STYLE: Record<TileAccent, { bg: string; color: string }> = {
  green:  { bg: '#E8F0E2', color: 'var(--green)'  },
  teal:   { bg: 'var(--teal-bg)', color: 'var(--teal)' },
  bronze: { bg: '#F4ECDF', color: '#6B4423'        },
  navy:   { bg: '#E5EBF3', color: 'var(--navy)'    },
}

const ROLE_LABEL: Record<string, string> = {
  admin:                'Quản trị viên',
  head_therapist:       'Trưởng nhóm trị liệu',
  senior_therapist:     'Trị liệu viên Senior',
  technician_therapist: 'Kỹ thuật viên trị liệu',
  junior_therapist:     'Trị liệu viên Junior',
  reception:            'Tiếp đón',
  parent:               'Phụ huynh',
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  // Single-destination roles → redirect directly, skip hub
  if (role === 'parent')    redirect('/parent')
  if (role === 'reception') redirect('/reception')
  if (!role)                redirect('/auth/login')

  const name = profile?.full_name || ''

  // Build visible sections — gate kép: route ∧ action
  const visibleSections = SECTIONS
    .map(sec => ({
      ...sec,
      tiles: sec.tiles.filter(t =>
        routeAllows(role!, t.route) &&
        (t.action === null || can(role!, t.action))
      ),
    }))
    .filter(sec => sec.tiles.length > 0)

  return (
    <>
      {/* rise animation + hover — CSS only, no JS event handlers needed */}
      <style>{`
        @keyframes hub-rise{to{opacity:1;transform:translateY(0)}}
        .hub-tile{
          opacity:0;transform:translateY(10px);
          animation:hub-rise .5s cubic-bezier(.2,.7,.3,1) forwards;
          transition:transform .16s cubic-bezier(.2,.7,.3,1),border-color .16s,box-shadow .16s;
        }
        .hub-tile:hover{
          transform:translateY(-3px) !important;
          border-color:var(--teal) !important;
          box-shadow:0 2px 4px rgba(13,34,64,.06),0 14px 32px rgba(13,34,64,.12) !important;
        }
        .hub-tile:hover .hub-arrow{color:var(--teal);transform:translateX(3px)}
        .hub-arrow{transition:transform .16s,color .16s}
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)',
        backgroundImage: 'radial-gradient(circle at 12% -5%, rgba(26,106,122,.06), transparent 40%), radial-gradient(circle at 95% 0%, rgba(45,80,22,.05), transparent 35%)' }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 32px', background: 'var(--navy)', borderBottom: '3px solid #6B4423' }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '.04em', color: '#fff' }}>
            SPEDUMAP <span style={{ fontWeight: 400, color: '#9FB3CC' }}>/ Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
            {name && <span style={{ color: '#E8EEF6', fontWeight: 600 }}>{name}</span>}
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
              letterSpacing: '.03em', padding: '3px 9px', borderRadius: 4,
              background: 'rgba(255,255,255,.12)', color: '#CFE0F0',
              border: '1px solid rgba(255,255,255,.18)', textTransform: 'uppercase' }}>
              {ROLE_LABEL[role!] || role}
            </span>
            <HubLogoutButton />
          </div>
        </header>

        {/* ── Main ── */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '34px 32px 64px' }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 26,
            color: 'var(--navy)', letterSpacing: '.01em', marginBottom: 6 }}>
            Chào{name ? <>, <span style={{ color: 'var(--teal)' }}>{name}</span></> : ''}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 30 }}>
            Chọn khu vực làm việc.{' '}
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--ink-3)' }}>
              Vai trò: {ROLE_LABEL[role!] || role}
            </span>
          </div>

          {visibleSections.map(sec => (
            <div key={sec.title} style={{ marginBottom: 34 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 13,
                  letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                  {sec.title}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>
                  {sec.tiles.length}
                </div>
              </div>

              {/* Tile grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                {sec.tiles.map((tile, i) => {
                  const accent = ACCENT_STYLE[tile.accent]
                  return (
                    <a
                      key={tile.href + tile.label}
                      href={tile.href}
                      className="hub-tile"
                      style={{
                        animationDelay: `${i * 40}ms`,
                        position: 'relative', display: 'flex', flexDirection: 'column', gap: 10,
                        background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 11,
                        padding: '18px 18px 16px', textDecoration: 'none', color: 'inherit',
                        boxShadow: '0 1px 2px rgba(13,34,64,.05),0 8px 24px rgba(13,34,64,.06)',
                      }}
                    >
                      {/* Top row: icon + arrow */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: accent.bg, color: accent.color }}>
                          <svg viewBox="0 0 24 24" width={20} height={20}
                            style={{ stroke: 'currentColor', strokeWidth: 1.7, fill: 'none',
                              strokeLinecap: 'round', strokeLinejoin: 'round' }}
                            dangerouslySetInnerHTML={{ __html: ICONS[tile.icon] }} />
                        </div>
                        <svg viewBox="0 0 24 24" width={18} height={18}
                          className="hub-arrow"
                          style={{ stroke: 'var(--ink-3)', strokeWidth: 1.8, fill: 'none',
                            strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                          <path d="M5 12h14M13 6l6 6-6 6"/>
                        </svg>
                      </div>
                      {/* Label + desc + route */}
                      <div>
                        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 16,
                          color: 'var(--navy)', letterSpacing: '.01em', lineHeight: 1.2 }}>
                          {tile.label}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45, marginTop: 3 }}>
                          {tile.desc}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5,
                          color: 'var(--ink-3)', marginTop: 2 }}>
                          {tile.href}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
