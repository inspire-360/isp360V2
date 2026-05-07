# Phase 5: Suspend & Restore User

Date: 2026-05-06
Project: `inspire-app`
Status: Implemented behind feature flag, not deployed

## Objective

Add safe suspend/restore member lifecycle operations through backend callable functions only, with Firebase Auth state changes, refresh-token revocation, Firestore status sync, audit logs, partial-failure handling, and a reconciliation callable.

## Current risk

- Legacy member management still has direct frontend writes for admin-sensitive fields.
- Firebase Auth and Firestore cannot be updated in a single atomic transaction.
- A partial failure can happen after Auth is updated but before Firestore status/audit completion writes succeed.
- Presence may remain stale until the suspended user's client disconnects or token revocation takes effect.

## Proposed solution

- Add `suspendMember` callable function.
- Add `restoreMember` callable function.
- Add `reconcileMemberLifecycleMismatch` callable function with dry-run default.
- Keep Suspend/Restore buttons in Members V2 Danger Zone only.
- Hide/disable actions behind `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED`.
- Require confirmation modal and reason for every lifecycle action.

## Files to change

- `functions/index.js`
- `src/components/admin/MemberDetailDrawerV2.jsx`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/utils/memberManagementFlags.js`
- `src/utils/userRoles.js`
- `firestore.rules`

## Firebase resources affected

- Auth:
  - `updateUser(uid, { disabled: true })` for suspend
  - `revokeRefreshTokens(uid)` for suspend
  - `updateUser(uid, { disabled: false })` for restore
- Firestore backend writes:
  - `users/{uid}.status`
  - `users/{uid}.memberStatus`
  - `users/{uid}.lifecycle`
  - `members_v2/{uid}.status`
  - `members_v2/{uid}.auth.disabled`
  - `members_v2/{uid}.flags.disabledMismatch`
  - `auditLogs/{logId}`
  - `systemHealth/memberLifecycleReconciliation` only on partial failure

## Data impact

- No production data changes until functions are deployed and an authorized admin confirms an action.
- No hard delete.
- No role change.
- No batch operation from UI.

## User impact

- Suspended user cannot sign in after Auth disabled.
- Existing refresh tokens are revoked on suspend.
- Other users are unaffected.
- Restore enables Auth and sets Firestore lifecycle status back to `active`.

## Security impact

- Frontend never writes lifecycle fields directly.
- Backend checks authenticated actor role from `users/{actorUid}`.
- Only `admin` or `super_admin` can call lifecycle functions.
- Admin cannot suspend/restore themselves.
- Admin cannot suspend/restore `super_admin`; only `super_admin` can.
- Support role is rejected by backend.
- Every attempt that passes preflight audit creation writes an audit trail.

## Partial failure handling

The backend writes an audit log with `status: "started"` before touching Firebase Auth.

If Auth reaches the desired state but Firestore update fails:

- Audit log is best-effort updated to `status: "partial_failure"`.
- `requiresReconciliation: true` is set.
- `systemHealth/memberLifecycleReconciliation` is best-effort updated.
- Callable throws `failed-precondition` and tells the operator to run reconciliation.

## Reconciliation

Callable: `reconcileMemberLifecycleMismatch`

Default is dry run:

```json
{
  "targetUid": "optional uid",
  "write": false,
  "limit": 100
}
```

Write mode requires:

```json
{
  "write": true,
  "confirm": "PHASE5_RECONCILE_WRITE"
}
```

Auth disabled state is treated as the source of truth. Firestore `users` and `members_v2` lifecycle fields are reconciled to match it.

## Feature flag

```text
VITE_MEMBERS_V2_ENABLED=true
VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED=true
```

Keep lifecycle flag off in production until backend functions and rules are staged and verified.

## Test cases

| Test case | Expected result | Risk level | Required before production |
| --- | --- | --- | --- |
| Admin suspends normal user | Auth disabled true, tokens revoked, Firestore suspended, audit completed | High | Yes |
| Admin restores suspended user | Auth disabled false, Firestore active, audit completed | High | Yes |
| Admin suspends self | Backend rejects | High | Yes |
| Support calls suspend | Backend rejects | High | Yes |
| Admin suspends super_admin | Backend rejects | High | Yes |
| Missing reason | Frontend blocks and backend rejects | High | Yes |
| Direct Firestore write to lifecycle fields | Rules reject for V2 collections | High | Yes |
| Auth succeeds, Firestore fails | Partial failure recorded, reconciliation required | High | Yes |
| Reconciliation dry run | Reports mismatches without writes | High | Yes |
| Reconciliation write with confirm | Fixes Firestore mismatch and writes audit log | High | Yes |
| Feature flag off | Danger Zone buttons disabled | High | Yes |

## Rollback plan

1. Disable `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED`.
2. Use `restoreMember` to reverse an accidental suspend.
3. If Auth and Firestore mismatch, run `reconcileMemberLifecycleMismatch` dry run first, then write mode with confirmation.
4. If backend deployment must be rolled back, delete only `suspendMember`, `restoreMember`, and `reconcileMemberLifecycleMismatch`.
5. Existing audit logs remain append-only evidence and should not be deleted.

## Implementation steps

1. Add backend role normalization for `super_admin` and `support`.
2. Add suspend/restore callable functions.
3. Add reconciliation callable with dry-run default.
4. Add frontend lifecycle repository calls.
5. Add lifecycle feature flag.
6. Add Danger Zone buttons and confirmation modal.
7. Add reason validation, impact preview, error handling, and success state.
8. Run lint, build, and function import checks.
