import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/permissions'

// Tables with FKs pointing at user_profiles.id that represent clinical data.
// Any hit → soft only (preserve history). Includes children.created_by (RESTRICT
// would block hard-delete even if 0 clinical rows, so we check it here too).
const CLINICAL_REF_CHECKS: { table: string; col: string }[] = [
  { table: 'assessments',        col: 'therapist_id' },
  { table: 'clinical_events',    col: 'therapist_id' },
  { table: 'cycle_therapists',   col: 'therapist_id' },
  { table: 'cycles',             col: 'teacher_id'   },
  { table: 'daily_sessions',     col: 'therapist_id' },
  { table: 'children',           col: 'created_by'   },
  { table: 'protocol_changelog', col: 'approved_by'  },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const callerRole = callerProfile?.role ?? ''

    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id bắt buộc' }, { status: 400 })

    if (user_id === user.id) {
      return NextResponse.json({ error: 'Không thể xoá tài khoản của chính mình' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: target, error: tErr } = await adminClient
      .from('user_profiles')
      .select('id, role, status')
      .eq('id', user_id)
      .single()

    if (tErr || !target) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }
    if (target.status === 'inactive') {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hoá' }, { status: 409 })
    }

    // ── Branch: parent (record-only, no auth user) ──
    if (target.role === 'parent') {
      if (!can(callerRole, 'delete_parent')) {
        return NextResponse.json({ error: 'Forbidden — delete_parent required' }, { status: 403 })
      }
      const { error: softErr } = await adminClient
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('id', user_id)
      if (softErr) {
        return NextResponse.json({ error: 'Lỗi vô hiệu hoá: ' + softErr.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, mode: 'soft', role: target.role })
    }

    // ── Branch: staff (has auth user) ──
    if (!can(callerRole, 'delete_user')) {
      return NextResponse.json({ error: 'Forbidden — delete_user required' }, { status: 403 })
    }

    // M5: block deleting the last active admin
    if (target.role === 'admin') {
      const { count } = await adminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'active')
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Không thể xoá admin active cuối cùng' },
          { status: 400 },
        )
      }
    }

    // Check clinical references — any hit → soft
    const refResults = await Promise.all(
      CLINICAL_REF_CHECKS.map(({ table, col }) =>
        adminClient.from(table).select('id', { count: 'exact', head: true }).eq(col, user_id).limit(1)
      )
    )
    const hasRefs = refResults.some(r => (r.count ?? 0) > 0)

    if (hasRefs) {
      // Soft: flag inactive + revoke session (deleteUser), keep profile row
      const { error: softErr } = await adminClient
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('id', user_id)
      if (softErr) {
        return NextResponse.json({ error: 'Lỗi vô hiệu hoá: ' + softErr.message }, { status: 500 })
      }
      await adminClient.auth.admin.deleteUser(user_id)
      return NextResponse.json({
        success: true,
        mode: 'soft',
        role: target.role,
        message: 'Còn dữ liệu lâm sàng — đã vô hiệu hoá (không xoá hồ sơ)',
      })
    }

    // Hard: revoke auth first, then delete profile row
    const { error: authErr } = await adminClient.auth.admin.deleteUser(user_id)
    if (authErr) {
      return NextResponse.json({ error: 'Lỗi xoá tài khoản auth: ' + authErr.message }, { status: 500 })
    }
    const { error: delErr } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', user_id)
    if (delErr) {
      return NextResponse.json({ error: 'Auth xoá OK nhưng profile lỗi: ' + delErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, mode: 'hard', role: target.role })

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
