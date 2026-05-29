import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// POST /api/head/manage-parent
// Service-role parent management for the Head "Trẻ & Phụ huynh" page.
// Actions: 'lookup' | 'create' | 'send_magic_link'. Caller must be
// head_therapist or admin (verified via their cookie session).

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
    const email  = (body?.email ?? '').trim()
    const phone  = (body?.phone ?? '').trim()
    const fullName = (body?.full_name ?? '').trim()

    const admin = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

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
        .limit(1)
      const parent = rows?.[0] ?? null
      return NextResponse.json({ found: !!parent, parent })
    }

    // ── create: new parent auth user + profile + magic link ──
    if (action === 'create') {
      if (!email || !phone || !fullName) {
        return NextResponse.json({ error: 'email, phone, full_name là bắt buộc' }, { status: 400 })
      }
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: fullName, phone },
      })
      if (cErr || !created?.user) {
        return NextResponse.json({ error: 'Lỗi tạo tài khoản: ' + (cErr?.message ?? 'unknown') }, { status: 400 })
      }
      const { error: pErr } = await admin.from('user_profiles').insert({
        id: created.user.id, email, full_name: fullName, phone, role: 'parent',
      })
      if (pErr) {
        await admin.auth.admin.deleteUser(created.user.id)
        return NextResponse.json({ error: 'Lỗi tạo profile: ' + pErr.message }, { status: 500 })
      }
      // Magic link (Supabase delivers via configured SMTP).
      await admin.auth.admin.generateLink({
        type: 'magiclink', email,
        options: { redirectTo: `${appUrl}/auth/callback?next=/parent` },
      })
      return NextResponse.json({
        parent: { id: created.user.id, email, full_name: fullName, phone, role: 'parent' },
        magic_link_sent: true,
      })
    }

    // ── send_magic_link: (re)send to an existing parent ──
    if (action === 'send_magic_link') {
      if (!email) return NextResponse.json({ error: 'email là bắt buộc' }, { status: 400 })
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink', email,
        options: { redirectTo: `${appUrl}/auth/callback?next=/parent` },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, action_link: data?.properties?.action_link ?? null })
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
