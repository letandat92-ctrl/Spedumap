import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { can, type Action } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// NAV_MAP — single source of truth for hub tiles.
// Each entry is shown iff can(role, action) is true.
// Roles with only one destination (reception, parent) never reach this hub.
const NAV_MAP: { action: Action; label: string; href: string; desc: string }[] = [
  { action: 'create_user',   label: 'Tài khoản nhân viên',   href: '/admin',              desc: 'Tạo & quản lý tài khoản nhân viên' },
  { action: 'create_parent', label: 'Hồ sơ phụ huynh',      href: '/admin',              desc: 'Thêm hồ sơ phụ huynh (không đăng nhập)' },
  { action: 'close_cycle',   label: 'Dashboard trưởng nhóm', href: '/head/dashboard',     desc: 'Tổng quan, phân công & đóng chu kỳ' },
  { action: 'assessment',    label: 'Baseline',              href: '/therapist/baseline', desc: 'Đánh giá phát triển & lập baseline' },
  { action: 'cycle_open',    label: 'Chu kỳ',                href: '/therapist/cycle',    desc: 'Mở & xem chu kỳ điều trị' },
  { action: 'daily_session', label: 'Ghi session',           href: '/therapist/session',  desc: 'Nhật ký session hàng ngày' },
  { action: 'view_progress', label: 'Báo cáo tiến độ',      href: '/therapist/report',   desc: 'Theo dõi tiến độ & xuất báo cáo' },
]

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

  // Single-destination roles → redirect directly, no hub
  if (role === 'parent')    redirect('/parent')
  if (role === 'reception') redirect('/reception')

  if (!role) redirect('/auth/login')

  const tiles = NAV_MAP.filter(t => can(role, t.action))

  // If only one tile, go there directly
  if (tiles.length === 1) redirect(tiles[0].href)

  const greeting = profile?.full_name ? `Xin chào, ${profile.full_name}` : 'Xin chào'

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">SPEDUMAP</h1>
          <p className="text-sm text-[var(--ink-3)] mt-1">{greeting}</p>
        </div>

        {/* Tiles grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {tiles.map(tile => (
            <a
              key={tile.action}
              href={tile.href}
              className="group block bg-white border border-[var(--rule)] rounded-xl p-5 shadow-sm hover:border-[var(--navy)] hover:shadow-md transition-all"
            >
              <div className="font-semibold text-[var(--ink)] text-sm mb-1 group-hover:text-[var(--navy)] transition-colors">
                {tile.label}
              </div>
              <div className="text-xs text-[var(--ink-3)] leading-relaxed">
                {tile.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
