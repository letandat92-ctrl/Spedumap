// __tests__/permissions.test.mjs — canManage hierarchy + branch isolation tests.
// Run: node __tests__/permissions.test.mjs
//
// WHY these cases matter:
// - RANK is inverted (0=highest) so the comparison operator must be '<' not '>'.
//   The "senior→admin = false" and "junior→technician = false" cases catch an
//   accidentally flipped operator that would let subordinates manage superiors.
// - BRANCH isolation prevents head (clinical) from editing reception (business)
//   and vice versa, even when rank would otherwise allow it.

import { canManage } from '../lib/permissions.ts'

let passed = 0
let failed = 0

function assert(actual, expected, label) {
  if (actual === expected) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${label} — expected ${expected}, got ${actual}`)
  }
}

console.log('canManage tests\n')

// Admin (rank 0, clinical) manages everyone
console.log('— admin manages all branches —')
assert(canManage('admin', 'head_therapist'), true, 'admin → head')
assert(canManage('admin', 'senior_therapist'), true, 'admin → senior')
assert(canManage('admin', 'reception'), true, 'admin → reception (cross-branch)')
assert(canManage('admin', 'parent'), true, 'admin → parent (cross-branch)')
assert(canManage('admin', 'admin'), false, 'admin → admin (self-rank)')

// Head (rank 1, clinical) manages clinical subordinates only
console.log('— head manages clinical subordinates —')
assert(canManage('head_therapist', 'senior_therapist'), true, 'head → senior')
assert(canManage('head_therapist', 'technician_therapist'), true, 'head → technician')
assert(canManage('head_therapist', 'junior_therapist'), true, 'head → junior')

console.log('— head blocked: same rank, superior, cross-branch —')
assert(canManage('head_therapist', 'head_therapist'), false, 'head → head (same rank)')
assert(canManage('head_therapist', 'admin'), false, 'head → admin (superior)')
assert(canManage('head_therapist', 'reception'), false, 'head → reception (cross-branch, same rank)')
assert(canManage('head_therapist', 'parent'), false, 'head → parent (cross-branch)')

// Senior/junior cannot manage upward — catches flipped operator
console.log('— subordinates cannot manage superiors —')
assert(canManage('senior_therapist', 'head_therapist'), false, 'senior → head')
assert(canManage('senior_therapist', 'admin'), false, 'senior → admin')
assert(canManage('junior_therapist', 'technician_therapist'), false, 'junior → technician (rank 4 vs 3)')
assert(canManage('junior_therapist', 'junior_therapist'), false, 'junior → junior (same rank)')

// Reception (rank 1, business) manages parent only
console.log('— reception branch isolation —')
assert(canManage('reception', 'parent'), true, 'reception → parent')
assert(canManage('reception', 'senior_therapist'), false, 'reception → senior (cross-branch)')
assert(canManage('reception', 'reception'), false, 'reception → reception (same rank)')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
