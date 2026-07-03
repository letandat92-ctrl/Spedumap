import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// POST /api/head/manage-parent
// Service-role parent lookup for the Head "Trẻ & Phụ huynh" page.
// Action: 'lookup' only. Caller must be head_therapist or admin.
// Parent creation goes through /reception (reception role) or /admin.

const STAFF = ['head_therapist', 'admin']

export async function POST(request: NextRequest) {
  try {
    // ── Auth: caller must be staff ──
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).single()
    if (!profile || !STAFF.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })
    }

    const body = await request.json()
    const action = String(body?.action ?? '')
    const email  = String(body?.email ?? '').trim().toLowerCase()
    const phone  = String(body?.phone ?? '').trim().replace(/[\s\-\.]/g, '')

    const admin = createAdminClient()

    // ── lookup: find an existing parent by email OR phone ──
    if (action === 'lookup') {
      if (!email && !phone) return NextResponse.json({ found: false })
      const filters: string[] = []
      if (email) filters.push(`email.eq.${email}`)
      if (phone) filters.push(`phone.eq.${phone}`)
      const { data: rows } = await admin
        .from('user_profiles')
        .select('id, email, full_name, phone, role')
        .or(filters.join(','))
        .eq('role', 'parent')
        .eq('status', 'active')
        .limit(1)
      const parent = rows?.[0] ?? null
      return NextResponse.json({ found: !!parent, parent })
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
