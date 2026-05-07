# Phase 3: Real-time Member List V2

Date: 2026-05-06
Project: `inspire-app`
Status: Implementation-ready, gated by feature flag

## Objective

Create a new read-only Member Management Console V2 that subscribes to `members_v2` in realtime without replacing the legacy `/du/members` screen.

## Current risk

- The legacy member console writes admin-sensitive profile and role fields from the client.
- Existing Firestore rules allow broad admin update/delete on `users/{uid}`.
- Presence still contains stale online rows, so V2 must label stale presence instead of treating it as trusted online state.
- `members_v2` is a new collection and needs a read-only admin rule before production rollout.

## Proposed solution

- Add a new route behind `VITE_MEMBERS_V2_ENABLED`.
- Keep `/du/members` and its data source unchanged.
- Read `members_v2` using Firestore `onSnapshot`.
- Filter, search, sort, paginate, select rows, and open a right-side drawer.
- Keep Phase 3 read-only; no suspend, restore, delete, role update, or profile write.

## Files to change

- `src/pages/MemberManagementV2.jsx`
- `src/hooks/useMembersV2Realtime.js`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/services/firebase/collections.js`
- `src/services/firebase/pathBuilders.js`
- `src/routes/AppRoutes.jsx`
- `src/components/Layout.jsx`
- `src/utils/memberManagementFlags.js`
- `firestore.rules`

## Firebase resources affected

- Read: `members_v2/{uid}`
- No writes from the V2 page
- Optional rules change: read-only `members_v2` access for admins

## Data impact

- None from the V2 UI.
- No production data migration in Phase 3.
- No write to `users`, `userUsage`, `presence`, `auditLogs`, or `systemHealth`.

## User impact

- Existing users and admins keep using the current app unchanged while the flag is off.
- Selected admins can test `/du/members-v2` or `/admin/members-v2` after the flag is enabled.
- If the flag is disabled, V2 routes redirect back to `/du/members`.

## Security impact

- Feature flag gates visibility and route access in frontend.
- Firestore rules must remain read-only for `members_v2`; writes are denied.
- This does not fix legacy direct admin writes yet. That belongs to a backend-only admin operations phase.

## Feature flag

Example local or staging environment:

```text
VITE_MEMBERS_V2_ENABLED=true
VITE_MEMBERS_V2_ALLOW_ALL_ADMINS=false
VITE_MEMBERS_V2_ADMIN_UIDS=comma-separated-admin-uids
VITE_MEMBERS_V2_ADMIN_EMAILS=comma-separated-admin-emails
```

Production default should remain off until QA is complete.

## Test plan

| Test case | Expected result | Risk level | Required before production |
| --- | --- | --- | --- |
| Flag off and visit `/du/members-v2` | Redirects to `/du/members` | High | Yes |
| Flag on for selected admin | V2 page opens | High | Yes |
| Non-admin visit | Redirects away by `AdminRoute` | High | Yes |
| Firestore read rule missing | Page shows permission error | Medium | Yes |
| Firestore `members_v2` snapshot updates | Table updates without refresh | High | Yes |
| Search by name/email/UID | Matching rows shown | Medium | Yes |
| Filter role/status/online | Rows match selected filters | Medium | Yes |
| Saved views | All, Online, Needs review, Stale, Suspended work | Medium | Yes |
| Sort columns | Sort direction toggles | Medium | Yes |
| Pagination | Rows and page count remain consistent | Medium | Yes |
| Row click | Right drawer opens | Medium | Yes |
| Drawer tabs | Profile, Usage, Security, Audit render read-only data | Medium | Yes |
| Bulk select | Selected count and Copy UIDs work | Low | No |
| Mobile viewport | Table scrolls horizontally and drawer fits screen | Medium | Yes |
| Legacy route `/du/members` | Still loads old member console | High | Yes |
| Login/register/profile update | No behavior change | High | Yes |

## Rollback plan

1. Set `VITE_MEMBERS_V2_ENABLED=false` and rebuild/redeploy frontend.
2. Keep `/du/members` as the operational route.
3. If rules were deployed and need rollback, remove the `members_v2` match block or leave it read-only; no data rollback is required.
4. No document rollback is needed because Phase 3 UI does not write data.

## Rollback validation

- `/du/members-v2` redirects to `/du/members`.
- Sidebar no longer shows `Members V2`.
- `/du/members` still loads with current production data.
- No new documents are created or updated when navigating V2.

## Implementation steps

1. Add collection constants and a read-only `members_v2` repository.
2. Add realtime hook using `onSnapshot`.
3. Add feature flag helper.
4. Add `MemberManagementV2` page with grid, filters, pagination, drawer, states, and selection.
5. Add gated routes without modifying `/du/members`.
6. Add sidebar item only when the flag allows the current admin.
7. Add read-only Firestore rule for `members_v2`.
8. Build locally and run QA with the flag off first, then staging flag on for selected admins.
