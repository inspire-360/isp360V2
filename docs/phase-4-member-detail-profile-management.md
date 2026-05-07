# Phase 4: Member Detail & Profile Management

Date: 2026-05-06
Project: `inspire-app`
Status: Implemented behind Members V2 feature flag, not deployed

## Objective

Add a compact member detail drawer for Members V2 with profile editing through a backend callable function, lazy-loaded detail panels, role-based visibility, audit logging, and no direct frontend writes to sensitive fields.

## Current risk

- Legacy member management still writes profile, role, and status directly from the frontend.
- Legacy `users/{uid}` remains production-critical for auth context and profile screens.
- Phase 4 must not introduce client writes to `role`, `status`, `auth.disabled`, or lifecycle fields.
- Concurrent updates from legacy tools can still happen until legacy admin writes are retired.

## Proposed solution

- Keep the drawer inside Members V2 only.
- Add `adminUpdateMemberProfileV2` callable Cloud Function as a new additive backend operation.
- Profile edits update only personal profile fields: `prefix`, `firstName`, `lastName`, `school`, `position`, `photoURL`.
- Sensitive panels are read-only in Phase 4.
- Usage and Audit Log panels load only when their tabs are opened.
- Profile save requires validation, a reason, change preview, backend audit log, and a stale-drawer check.

## Files to change

- `src/components/admin/MemberDetailDrawerV2.jsx`
- `src/pages/MemberManagementV2.jsx`
- `src/hooks/useMemberV2DetailPanels.js`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/lib/firebase.js`
- `functions/index.js`
- `firebase.json`
- `firestore.rules`

## Firebase resources affected

- Callable function: `adminUpdateMemberProfileV2`
- Read: `members_v2/{uid}`, `userUsage/{uid}`, `auditLogs/{logId}`
- Backend writes only after callable deployment:
  - `users/{uid}` personal profile fields
  - `members_v2/{uid}` mirrored profile fields
  - `auditLogs/{logId}` append-only audit event

## Data impact

- No data changes until the callable function is deployed and an admin saves a profile.
- No destructive data operation.
- No role/status/auth lifecycle write in Phase 4.
- Backend uses merge updates and field-level patches.

## User impact

- Existing `/du/members` remains unchanged.
- Members V2 drawer adds Overview, Profile, Usage, Permissions, Security, Audit Log, and Danger Zone tabs.
- If callable is not deployed, Save fails safely and reverts the edit UI state.

## Security impact

- Frontend never writes profile data directly to Firestore in this flow.
- Callable checks the actor's `users/{actorUid}.role` and only allows admin.
- Callable rejects unsupported fields, self-edit in this admin flow, invalid URLs, missing reason, and stale drawer saves.
- Firestore rules deny client writes to `members_v2`, `userUsage`, and `auditLogs`.

## Test plan

| Test case | Expected result | Risk level | Required before production |
| --- | --- | --- | --- |
| Open drawer from row | Drawer opens without changing data | Medium | Yes |
| Switch tabs | Only selected panel renders detailed reads | Medium | Yes |
| Edit profile | Form enables only personal fields | High | Yes |
| Save without reason | Save blocked | High | Yes |
| Invalid photo URL | Save blocked | Medium | Yes |
| Changed fields preview | Shows before/after values | Medium | Yes |
| Successful save through callable | `users`, `members_v2`, and `auditLogs` are updated | High | Yes |
| Callable missing/not deployed | UI shows error and reverts form | High | Yes |
| Non-admin callable attempt | Callable rejects | High | Yes |
| Role/status/auth field injection | Callable rejects unsupported fields | High | Yes |
| Stale drawer save | Callable rejects with failed-precondition | High | Yes |
| Permissions tab | Read-only | High | Yes |
| Danger Zone | Placeholder only, no destructive action | High | Yes |
| Feature flag off | V2 route returns to legacy page | High | Yes |

## Rollback plan

1. Set `VITE_MEMBERS_V2_ENABLED=false`.
2. Keep `/du/members` as the active member management route.
3. Do not deploy `adminUpdateMemberProfileV2`, or delete only that function if it was deployed.
4. Leave audit logs and profile updates intact; no document rollback is required unless a specific failed operation is identified.
5. If rollback of a profile save is needed, use the audit log `before` payload to revert only fields changed by that operation.

## Implementation steps

1. Add callable backend function with admin check, validation, stale-drawer check, and audit log.
2. Add Firebase Functions client initialization.
3. Add repository methods for callable save and lazy panel subscriptions.
4. Replace the Phase 3 drawer with `MemberDetailDrawerV2`.
5. Keep Permissions and Danger Zone read-only/placeholders in Phase 4.
6. Add read-only Firestore rules for `userUsage` and `auditLogs`.
7. Run lint/build and function syntax checks.
