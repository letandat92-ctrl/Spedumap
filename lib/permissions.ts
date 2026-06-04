// lib/permissions.ts — role/action permission matrix (single source of truth).
// Mirrors the role set used by middleware.ts ROLE_ROUTES and user_profiles.role
// (CHECK constraint role_check).

export type Role =
  'admin' | 'head_therapist' | 'senior_therapist' |
  'technician_therapist' | 'junior_therapist' | 'parent' | 'reception'

export type Branch = 'clinical' | 'business' | 'client'

export type Action =
  'assessment' | 'cycle_open' | 'daily_session' |
  'view_progress' | 'close_cycle' | 'assign_case' |
  'create_user' | 'create_parent' | 'delete_user' | 'delete_parent' |
  'edit_user' | 'manage_library'

// Numeric rank — lower number = higher authority. admin spans both branches.
export const RANK: Record<Role, number> = {
  admin:                0,
  head_therapist:       1,
  senior_therapist:     2,
  technician_therapist: 3,
  junior_therapist:     4,
  reception:            1,
  parent:               5,
}

export const BRANCH: Record<Role, Branch> = {
  admin:                'clinical',
  head_therapist:       'clinical',
  senior_therapist:     'clinical',
  technician_therapist: 'clinical',
  junior_therapist:     'clinical',
  reception:            'business',
  parent:               'client',
}

// Can `editor` manage (edit/view) `targetRole`?
// Rules: editor rank must be strictly lower (higher authority) than target,
// and they must share a branch — except admin (rank 0) who manages all branches,
// and business branch staff (reception) who also manage client branch (parent).
export function canManage(editor: Role | string, targetRole: Role | string): boolean {
  const eRank = RANK[editor as Role]
  const tRank = RANK[targetRole as Role]
  if (eRank === undefined || tRank === undefined) return false
  if (eRank >= tRank) return false
  if (eRank === 0) return true
  const eBranch = BRANCH[editor as Role]
  const tBranch = BRANCH[targetRole as Role]
  if (eBranch === tBranch) return true
  if (eBranch === 'business' && tBranch === 'client') return true
  return false
}

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
  create_parent: ['admin', 'reception'],
  delete_user:   ['admin'],
  delete_parent: ['admin', 'reception'],
  edit_user:      ['admin', 'head_therapist'],
  manage_library: ['admin', 'head_therapist'],
}

export function can(role: Role | string, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role as Role) ?? false
}

// ROLES — canonical ordered list for UI iteration (stats, filter chips, etc.)
// Use this instead of hardcoding role arrays in components.
export const ROLES: Role[] = [
  'admin', 'head_therapist', 'senior_therapist',
  'technician_therapist', 'junior_therapist', 'reception', 'parent',
]

// ROLE_ROUTES — canonical route-prefix map shared by middleware and hub.
// Middleware imports this instead of defining its own copy.
export const ROLE_ROUTES: Record<string, string[]> = {
  admin:                ['/admin', '/therapist', '/head', '/parent', '/reception', '/profile'],
  head_therapist:       ['/head', '/therapist', '/profile'],
  senior_therapist:     ['/therapist', '/profile'],
  technician_therapist: ['/therapist', '/profile'],
  junior_therapist:     ['/therapist', '/profile'],
  parent:               ['/parent'],
  reception:            ['/reception', '/profile'],
}
