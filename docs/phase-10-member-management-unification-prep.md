# Member Management Unification Prep

## Objective

Merge the legacy `MemberControl` workflow and `Members V2` workflow into one primary Member Management route without removing rollback capability.

## Repository Audit

### Routes

- `/du/members` previously loaded `src/pages/MemberControl.jsx`.
- `/du/members-v2` and `/admin/members-v2` previously loaded `src/pages/MemberManagementV2.jsx` behind the Members V2 feature flag.
- `/du/audit-health-v2` remains separate and feature-flagged because it is a system dashboard, not the primary member workspace.

### Frontend Pages

- `MemberControl.jsx`
  - Reads legacy `users`, legacy `presence`, enrollment collection group, and mission response collection group.
  - Provides member profile editing, role/status editing, enrollment inspection, pain point inspection, and reset learning.
  - Writes profile/role/status/reset learning directly with the client Firebase SDK.
- `MemberManagementV2.jsx`
  - Reads `members_v2` through realtime `onSnapshot`.
  - Provides grid search, filters, sort, pagination, bulk UID copy, and detail drawer.
  - Delegates profile/lifecycle/delete/role mutations to backend callable functions.

### Shared and Related Logic

- `useDuMemberData.js` loads global roster, presence, enrollments, and mission responses for the legacy page.
- `useMembersV2Realtime.js` loads the additive `members_v2` roster for V2.
- `MemberDetailDrawerV2.jsx` owns member detail tabs and backend-driven sensitive actions.
- `memberV2Repository.js` owns the V2 API contract for callable functions and realtime reads.
- `memberManagementFlags.js` controls V2 rollout visibility.

## Feature Mapping

| Capability | MemberControl | Members V2 | Unified Decision |
| --- | --- | --- | --- |
| Member list | Card roster | Full-width grid | Use V2 grid |
| Realtime updates | Multiple global subscriptions | `members_v2` snapshot | Use V2 snapshot |
| Search/filter | Search, role, presence, course | Search, role, status, online, saved views | Use V2 plus drawer learning detail |
| Profile edit | Client write | Backend callable with audit | Use V2 backend |
| Role edit | Client write | Backend callable/custom claims | Use V2 backend |
| Suspend/restore | Missing | Backend callable | Use V2 |
| Soft/hard delete | Missing | Backend callable | Use V2 |
| Enrollment detail | Present | Summary only | Add lazy Learning tab |
| Reset learning | Client write | Missing | Add backend callable and feature flag |
| Audit log | Missing | Drawer audit tab | Use V2 |
| Danger zone | Missing | Present | Use V2 |

## Risks

- Keeping both menu entries creates operational confusion and two different security models.
- Legacy reset learning uses client-side writes and deletes mission responses directly.
- Global enrollment and mission response collection group subscriptions are heavier than member-scoped lazy reads.
- Backend functions must be deployed to staging before enabling any new reset action flag.

## Unified Design

- `/du/members` is the single primary Member Management route.
- If Members V2 is enabled for the current admin, `/du/members` renders the unified V2 console.
- If Members V2 is disabled, `/du/members` renders the legacy page as rollback fallback.
- `/du/members-v2` and `/admin/members-v2` redirect to `/du/members` to prevent duplicate entry points.
- The sidebar shows one member item only: `Member Management` when V2 is enabled, otherwise `Member Control`.
- Learning detail is lazy-loaded only when a drawer member opens the Learning tab.
- Reset learning is backend-only and controlled by `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED`.

## Rollback Plan

- Set `VITE_MEMBERS_V2_ENABLED=false` to return `/du/members` to the legacy `MemberControl` page.
- Keep legacy route fallback code until production rollout is complete.
- Keep `/du/members-v2` redirect so old links do not break.
- Do not deploy the new learning reset callable until staging QA passes.
- Keep `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED=false` until the callable is deployed and tested.

## Phase 10 Readiness Notes

- Deploy new callable functions to staging before enabling the learning reset flag.
- Verify Firestore rules still block direct sensitive client writes.
- Run staging QA for search, filters, drawer tabs, profile update, role update, lifecycle, delete, audit, and learning reset.
- After production rollout, remove the legacy fallback only after usage telemetry confirms no admins rely on it.
