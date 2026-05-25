import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    // Parse request body
    const { email, role, full_name } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'email và role là bắt buộc' }, { status: 400 })
    }

    const validRoles = ['admin', 'head_therapist', 'senior_therapist', 'junior_therapist', 'parent']
    if (!validRoles.includes(role)) {
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
