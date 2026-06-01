import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Role → allowed path prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  admin:                ['/admin', '/therapist', '/head', '/parent'],
  head_therapist:       ['/head', '/therapist'],
  senior_therapist:     ['/therapist'],
  technician_therapist: ['/therapist'],
  junior_therapist:     ['/therapist'],
  parent:               ['/parent'],
}

// Public routes — no auth required
// '/confirm' is the parent session-confirmation page: it talks only to the
// confirm-session Edge Function via an unguessable capability token, never to
// the DB directly, so it must bypass the auth gate.
// Only '/parent/auth' (the parent login page) is public; the rest of '/parent'
// is gated so first-time magic-link parents get auto-provisioned below.
// '/auth/callback' must be public: the magic-link code exchange runs there
// before any session cookie exists.
const PUBLIC_ROUTES = ['/auth/login', '/auth/change-password', '/auth/callback', '/parent/auth', '/confirm']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    return supabaseResponse
  }

  // Not logged in → redirect to login. Parent routes go to the parent login.
  if (!user) {
    const loginUrl = path.startsWith('/parent') ? '/parent/auth' : '/auth/login'
    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  // Get role from user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  if (!role) {
    // A logged-in user with no profile row who is heading into the parent
    // portal is a first-time magic-link parent: auto-provision their profile
    // as 'parent' and let them through. Insert is RLS-guarded by the
    // parent_self_insert policy (auth.uid() = id AND role = 'parent').
    if (path.startsWith('/parent')) {
      const { error: insErr } = await supabase.from('user_profiles').insert({
        id:    user.id,
        email: user.email,
        role:  'parent',
      })
      if (insErr) return NextResponse.redirect(new URL('/auth/login', request.url))
      return supabaseResponse
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check role has access to this route
  const allowedPrefixes = ROLE_ROUTES[role] || []
  const hasAccess = allowedPrefixes.some(prefix => path.startsWith(prefix))

  if (!hasAccess) {
    // Redirect to their default route
    const defaultRoute =
      role === 'admin'          ? '/admin'          :
      role === 'head_therapist' ? '/head/dashboard' :
      role === 'parent'         ? '/parent'         :
      '/therapist/baseline'   // senior_therapist, technician_therapist, junior_therapist
    return NextResponse.redirect(new URL(defaultRoute, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
