import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/permissions'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

export async function POST(request: NextRequest) {
  try {
    // Verify caller is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const callerRole = profile?.role ?? ''

    // Parse request body
    const { email, role, full_name, phone } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'email và role là bắt buộc' }, { status: 400 })
    }

    if (role !== 'parent' && !String(full_name ?? '').trim()) {
      return NextResponse.json({ error: 'Họ tên là bắt buộc' }, { status: 400 })
    }

    // Branch A — parent record-only (no auth user): caller needs create_parent
    if (role === 'parent') {
      if (!can(callerRole, 'create_parent')) {
        return NextResponse.json({ error: 'Forbidden — create_parent required' }, { status: 403 })
      }
      if (!String(phone ?? '').trim()) {
        return NextResponse.json({ error: 'SĐT bắt buộc cho phụ huynh' }, { status: 400 })
      }
      const adminClient = createAdminClient()
      const { data: prow, error: pErr } = await adminClient
        .from('user_profiles')
        .insert({ role: 'parent', full_name: full_name || '', email, phone: phone || null })
        .select('id')
        .single()
      if (pErr) {
        const msg = pErr.code === '23505'
          ? 'Email hoặc SĐT phụ huynh đã tồn tại'
          : 'Lỗi tạo hồ sơ phụ huynh: ' + pErr.message
        return NextResponse.json({ error: msg }, { status: pErr.code === '23505' ? 409 : 500 })
      }
      return NextResponse.json({
        success: true,
        user_id: prow.id,
        email,
        role,
        message: 'Đã tạo hồ sơ phụ huynh (không cấp đăng nhập)',
      })
    }

    // Branch B — staff account with login: caller needs create_user
    if (!can(callerRole, 'create_user')) {
      return NextResponse.json({ error: 'Forbidden — create_user required' }, { status: 403 })
    }

    const validStaffRoles = ['admin', 'head_therapist', 'senior_therapist', 'technician_therapist', 'junior_therapist', 'reception']
    if (!validStaffRoles.includes(role)) {
      return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const tempPassword = generatePassword()

    // 1. Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password:      tempPassword,
      email_confirm: true,   // auto-confirm email
      user_metadata: {
        full_name,
        role,
        must_change_password: true,
      }
    })

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    // 2. Create user_profile record
    const { error: profileErr } = await adminClient
      .from('user_profiles')
      .insert({
        id:        newUser.user.id,
        role,
        full_name: full_name || '',
        email,
        phone:     phone || null,
        must_change_password: true,
      })

    if (profileErr) {
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Lỗi tạo profile: ' + profileErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success:       true,
      user_id:       newUser.user.id,
      email,
      role,
      temp_password: tempPassword,
      message:       `Tài khoản đã tạo. Mật khẩu tạm: ${tempPassword}`,
    })

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
