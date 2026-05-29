// Edge Function: confirm-session
// Public parent-confirmation proxy. The browser NEVER touches the tables
// directly — it calls this function with a capability token (daily_sessions
// .confirm_token). The function uses the service-role key server-side, returns
// ONLY the fields needed to render the parent view, and the confirm action
// flips ONLY parent_confirmed / parent_confirmed_at. Rate-limited per token.
//
// Deployed with verify_jwt=false: this project uses the new publishable key
// format (sb_publishable_...) which is not a JWT, so the gateway's JWT check
// would reject it. Auth here is the unguessable capability token + per-token
// rate limit (custom auth).
//
// Request body: { token: string, action: 'load' | 'confirm' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT = 10            // requests
const RATE_WINDOW_MS = 60 * 60 * 1000  // per hour
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  let token = ''
  let action = ''
  try {
    const body = await req.json()
    token = String(body?.token ?? '')
    action = String(body?.action ?? '')
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400)
  }

  if (!UUID_RE.test(token)) return json({ ok: false, error: 'invalid_token' }, 400)
  if (action !== 'load' && action !== 'confirm') return json({ ok: false, error: 'invalid_action' }, 400)

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── Rate limit: max RATE_LIMIT requests per token per hour ──
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await supa
    .from('confirm_rate_limit')
    .select('*', { count: 'exact', head: true })
    .eq('token', token)
    .gt('ts', windowStart)
  if ((count ?? 0) >= RATE_LIMIT) return json({ ok: false, error: 'rate_limited' }, 429)
  await supa.from('confirm_rate_limit').insert({ token })

  // ── Locate the session by capability token ──
  const { data: sess } = await supa
    .from('daily_sessions')
    .select('id, cycle_id, session_index, date, cooperation_stars, notes, plan_note, activities, observed_activities, parent_confirmed')
    .eq('confirm_token', token)
    .maybeSingle()

  if (!sess) return json({ ok: false, error: 'not_found' }, 404)

  if (action === 'confirm') {
    if (sess.parent_confirmed === true) return json({ ok: true, already: true })
    const { error } = await supa
      .from('daily_sessions')
      .update({ parent_confirmed: true, parent_confirmed_at: new Date().toISOString() })
      .eq('confirm_token', token)
      .eq('parent_confirmed', false)
    if (error) return json({ ok: false, error: 'update_failed' }, 500)
    return json({ ok: true, already: false })
  }

  // ── action === 'load' ──────────────────────────────────────────────
  const { data: cyc } = await supa
    .from('cycles')
    .select('child_id, baseline, target, planned_sessions')
    .eq('id', sess.cycle_id)
    .single()

  let childName = ''
  let childDob: string | null = null
  if (cyc?.child_id) {
    const { data: child } = await supa
      .from('children')
      .select('name, dob')
      .eq('id', cyc.child_id)
      .single()
    childName = child?.name ?? ''
    childDob = child?.dob ?? null
  }

  // Sibling sessions — only fields needed to draw the trendline / sparklines.
  const { data: siblings } = await supa
    .from('daily_sessions')
    .select('session_index, date, activities, layer_eval')
    .eq('cycle_id', sess.cycle_id)
    .order('session_index', { ascending: true })

  type Act = { block?: string; delta?: number; current_after?: unknown; solution_title?: string; exercise?: string; note?: string }

  return json({
    ok: true,
    already: sess.parent_confirmed === true,
    child: { name: childName, dob: childDob },
    planned_sessions: cyc?.planned_sessions ?? 0,
    baseline: { blocks: (cyc?.baseline?.blocks) ?? {}, total_score: (cyc?.baseline?.total_score) ?? 0 },
    target: { blocks: (cyc?.target?.blocks) ?? {} },
    this_session: {
      session_index: sess.session_index,
      date: sess.date,
      cooperation_stars: sess.cooperation_stars,
      notes: sess.notes,
      plan_note: sess.plan_note,
      activities: ((sess.activities as Act[]) || []).map((a) => ({
        block: a.block ?? '',
        solution_title: a.solution_title ?? a.exercise ?? null,
        delta: typeof a.delta === 'number' ? a.delta : 0,
      })),
      observed_activities: ((sess.observed_activities as Act[]) || []).map((o) => ({
        block: o.block ?? '',
        note: o.note ?? null,
        delta: typeof o.delta === 'number' ? o.delta : null,
      })),
    },
    sessions: ((siblings as Array<{ session_index: number; date: string; activities: Act[]; layer_eval: unknown }>) || []).map((s) => ({
      session_index: s.session_index,
      date: s.date,
      activities: (s.activities || []).map((a) => ({
        block: a.block ?? '',
        current_after: a.current_after ?? null,
        delta: typeof a.delta === 'number' ? a.delta : 0,
      })),
      layer_eval: s.layer_eval ?? null,
    })),
  })
})
