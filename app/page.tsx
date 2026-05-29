import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'


export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get role and redirect to appropriate dashboard
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role === 'admin')          redirect('/admin')
  if (role === 'head_therapist') redirect('/head/dashboard')
  if (role === 'parent')         redirect('/parent')
  redirect('/therapist/baseline')  // senior_therapist, technician_therapist, junior_therapist
}
