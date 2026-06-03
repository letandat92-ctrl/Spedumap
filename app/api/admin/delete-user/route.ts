import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/permissions'

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

    if (!can(callerProfile?.role ?? '', 'create_user')) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id bắt buộc' }, { status: 400 })

    // Cannot delete yourself
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

    // Soft-flag profile (all roles — preserves FK integrity)
    const { error: softErr } = await adminClient
      .from('user_profiles')
      .update({ status: 'inactive' })
      .eq('id', user_id)

    if (softErr) {
      return NextResponse.json({ error: 'Lỗi vô hiệu hoá: ' + softErr.message }, { status: 500 })
    }

    // Staff (has auth user) → also revoke login
    if (target.role !== 'parent') {
      const { error: authErr } = await adminClient.auth.admin.deleteUser(user_id)
      if (authErr) {
        // Rollback soft-flag so DB stays consistent
        await adminClient.from('user_profiles').update({ status: 'active' }).eq('id', user_id)
        return NextResponse.json({ error: 'Lỗi xoá tài khoản auth: ' + authErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, role: target.role })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
