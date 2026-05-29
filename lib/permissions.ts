// lib/permissions.ts — role/action permission matrix (single source of truth).
// Mirrors the role set used by middleware.ts ROLE_ROUTES and user_profiles.role
// (CHECK constraint role_check).

export type Role =
  'admin' | 'head_therapist' | 'senior_therapist' |
  'technician_therapist' | 'junior_therapist' | 'parent'

export type Action =
  'assessment' | 'cycle_open' | 'daily_session' |
  'view_progress' | 'close_cycle' | 'assign_case' | 'create_user'

export const PERMISSIONS: Record<Action, Role[]> = {
  assessment:    ['admin', 'head_therapist', 'senior_therapist'],
  cycle_open:    ['admin', 'head_therapist', 'senior_therapist'],
  daily_session: ['admin', 'head_therapist', 'senior_therapist',
                  'technician_therapist', 'junior_therapist'],
  view_progress: ['admin', 'head_therapist', 'senior_therapist',
                  'technician_therapist'],
  close_cycle:   ['admin', 'head_therapist'],
  assign_case:   ['admin', 'head_therapist'],
  create_user:   ['admin'],
}

export function can(role: Role | string, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role as Role) ?? false
}
