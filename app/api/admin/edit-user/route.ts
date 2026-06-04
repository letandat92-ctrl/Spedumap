import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { can, canManage, ROLES, type Role } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const callerRole = (callerProfile?.role ?? '') as Role

    if (!can(callerRole, 'edit_user')) {
      return NextResponse.json({ error: 'Forbidden — edit_user required' }, { status: 403 })
    }

    const { target_id, patch } = await request.json()
    if (!target_id || !patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'target_id và patch là bắt buộc' }, { status: 400 })
    }

    if (target_id === user.id) {
      return NextResponse.json({ error: 'Dùng trang Hồ sơ để sửa thông tin cá nhân' }, { status: 400 })
    }

    const { data: target } = await adminClient
      .from('user_profiles')
      .select('id, role, status')
      .eq('id', target_id)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
    }

    if (!canManage(callerRole, target.role)) {
      return NextResponse.json({ error: 'Forbidden — không đủ quyền quản lý role này' }, { status: 403 })
    }

    const allowed: Record<string, unknown> = {}

    if (patch.full_name !== undefined) allowed.full_name = String(patch.full_name).trim()
    if (patch.phone !== undefined) allowed.phone = String(patch.phone).trim() || null
    if (patch.status !== undefined) {
      if (!['active', 'inactive'].includes(patch.status)) {
        return NextResponse.json({ error: 'status phải là active hoặc inactive' }, { status: 400 })
      }
      allowed.status = patch.status
    }

    if (patch.role !== undefined) {
      const newRole = patch.role as Role
      if (!ROLES.includes(newRole)) {
        return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 })
      }
      if (!canManage(callerRole, newRole)) {
        return NextResponse.json({ error: 'Forbidden — không thể gán role ngang hoặc trên mình' }, { status: 403 })
      }
      allowed.role = newRole
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Không có trường hợp lệ để cập nhật' }, { status: 400 })
    }

    const { error: updErr } = await adminClient
      .from('user_profiles')
      .update(allowed)
      .eq('id', target_id)
    if (updErr) {
      return NextResponse.json({ error: 'Lỗi cập nhật: ' + updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: Object.keys(allowed) })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
