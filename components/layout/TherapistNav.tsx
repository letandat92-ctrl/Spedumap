'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/therapist/baseline', label: 'Baseline',  short: 'B' },
  { href: '/therapist/goal',     label: 'Goal',      short: 'G' },
  { href: '/therapist/cycle',    label: 'Cycle',     short: 'C' },
  { href: '/therapist/session',  label: 'Session',   short: 'S' },
  { href: '/therapist/report',   label: 'Report',    short: 'R' },
]

export function TherapistNav({ childName }: { childName?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const currentIdx = NAV_ITEMS.findIndex(n => pathname.startsWith(n.href))

  return (
    <div className="sticky top-0 z-20 bg-[var(--navy)] px-4 py-0 flex items-stretch">
      {/* Logo */}
      <div className="flex items-center pr-4 border-r border-white/10 mr-2">
        <span className="font-serif font-bold text-white text-sm">SPEDUMAP</span>
      </div>

      {/* Flow steps */}
      <div className="flex items-stretch flex-1">
        {NAV_ITEMS.map((item, i) => {
          const isActive  = pathname.startsWith(item.href)
          const isPast    = i < currentIdx
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-1.5 px-3 text-xs font-medium border-b-2 transition-colors py-3 ${
                isActive
                  ? 'border-white text-white'
                  : isPast
                  ? 'border-transparent text-white/50 hover:text-white/80'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-white text-[var(--navy)]' : isPast ? 'bg-white/30 text-white' : 'bg-white/10 text-white/40'
              }`}>
                {isPast ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
            </button>
          )
        })}
      </div>

      {/* Child name + logout */}
      <div className="flex items-center gap-3 pl-3 border-l border-white/10">
        {childName && (
          <span className="text-xs text-white/60 hidden md:inline">{childName}</span>
        )}
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
          className="text-white/40 text-xs hover:text-white/70 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  )
}
