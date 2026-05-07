# Phase 8: Role-Based Access Control

## Objective

Move role management to backend-controlled RBAC using Firebase custom claims as the enforcement source and Firestore as a UI mirror. All role changes require backend validation, reason, audit log, and token revocation.

## Current Risk

- Legacy admin UI can write role-like fields from the client if Firestore rules allow it.
- Firestore role mirror can drift from Firebase Auth custom claims.
- Admin role escalation from the frontend would have high blast radius.
- Role changes without audit log make incident review and rollback difficult.

## Proposed Solution

- Add callable function `setUserRole`.
- Restrict role editor UI behind `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED`.
- Only `super_admin` can change roles in Phase 8.
- UI role selector supports `admin`, `support`, and `member`.
- `super_admin` assignment or modification is intentionally excluded from UI and requires a break-glass process.
- Backend writes Firebase custom claims first, revokes refresh tokens, mirrors the role into Firestore, then writes audit status.
- Firestore rules block direct client updates to sensitive role fields.

## Role Model

- `super_admin`: full platform owner. Can change non-super-admin roles and access all admin lifecycle functions.
- `admin`: manages member profile and lifecycle through backend functions, cannot change roles in Phase 8.
- `support`: read-focused support role. Cannot suspend, delete, hard delete, or change roles.
- `member`: standard user role for non-admin access.

Compatibility note:

- Legacy roles `teacher` and `learner` are still recognized for existing product flows.
- New RBAC role `member` is treated as a non-admin learner-like role in frontend utilities.

## Permission Matrix

| Action | super_admin | admin | support | member |
|---|---:|---:|---:|---:|
| View Members V2 | Yes | Yes | Limited by feature flag | No |
| Edit personal profile fields | Yes | Yes | No in Phase 8 | Self only through existing profile flow |
| Suspend / restore member | Yes | Yes, except super_admin/self | No | No |
| Soft delete member | Yes | Yes, except super_admin/self | No | No |
| Hard delete member | Yes only | No | No | No |
| Change role | Yes, non-super-admin targets only | No | No | No |
| Change own role | No | No | No | No |
| Change super_admin role | Break-glass only | No | No | No |
| Direct Firestore role write | No client writes | No client writes | No client writes | No client writes |

## Files To Change

- `functions/index.js`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/components/admin/MemberDetailDrawerV2.jsx`
- `src/utils/memberManagementFlags.js`
- `src/utils/userRoles.js`
- `src/pages/MemberManagementV2.jsx`
- `firestore.rules`
- `docs/phase-8-role-based-access-control.md`

## Firebase Resources Affected

- Firebase Auth custom claims:
  - `role`
  - `roles`
  - `rbac`
- Firestore:
  - `users/{uid}.role`
  - `users/{uid}.rbac`
  - `members_v2/{uid}.role`
  - `members_v2/{uid}.rbac`
  - `auditLogs/{logId}`
  - `systemHealth/memberRbacReconciliation`

## Data Impact

- Role change writes are explicit and audited.
- No bulk migration is performed in this phase.
- Existing `teacher` and `learner` records are not rewritten automatically.
- Firestore mirror updates use merge and do not replace entire documents.

## User Impact

- Target user refresh tokens are revoked after role change.
- The target may need to sign in again or refresh their session before claims fully reflect the new role.
- Feature flag off means no visible role editor in Members V2.

## Security Impact

- Backend validates actor and target roles.
- Backend rejects self role change.
- Backend rejects editing `super_admin` target through the normal UI flow.
- Backend rejects unsupported roles.
- Security rules prevent client writes to `role`, `rbac`, `auth`, `status`, `memberStatus`, `lifecycle`, and delete on `users`.
- Security rules prefer custom claims for admin checks while retaining Firestore fallback during migration.

## Security Rules Update Plan

1. Deploy to staging only.
2. Verify admin access with both custom claims and Firestore mirror.
3. Confirm legacy profile updates still pass.
4. Confirm direct client writes to `users/{uid}.role` are denied.
5. Confirm direct client delete of `users/{uid}` is denied.
6. After custom claims coverage is complete, plan a later phase to remove Firestore fallback from `isAdmin()`.

## Test Cases

Required before production:

- `super_admin` changes `member` to `support`.
- `super_admin` changes `support` to `admin`.
- `super_admin` changes `admin` to `member`.
- `super_admin` cannot change own role.
- `super_admin` cannot change another `super_admin` through normal UI.
- `admin` cannot change any role.
- `support` cannot change any role.
- unsupported role is rejected.
- missing reason is rejected.
- missing `PHASE8_SET_ROLE` confirm is rejected.
- audit log is written and completed.
- custom claims are updated.
- refresh tokens are revoked.
- Firestore `users` and `members_v2` mirrors are updated.
- direct client write to `users/{uid}.role` is rejected by rules.

Optional after production:

- Build role claims backfill for existing users.
- Build reconciliation report for claims vs Firestore mirror.
- Build break-glass super_admin role process with approval workflow.

## Rollback Plan

- Disable `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED`.
- Use audit log `before.customClaims` and `before.users.role` to restore the previous role through a controlled backend/manual process.
- If custom claims update succeeds but Firestore mirror fails, inspect `systemHealth/memberRbacReconciliation`.
- Do not bulk rewrite roles without dry run and approval.

## Implementation Steps

1. Deploy `setUserRole` to staging.
2. Deploy Firestore rules to staging.
3. Enable `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED=true` for staging only.
4. Test all required cases with staging users.
5. Verify logs and audit documents.
6. Keep production feature flag off.
7. Prepare claims backfill dry run before any production rollout.
