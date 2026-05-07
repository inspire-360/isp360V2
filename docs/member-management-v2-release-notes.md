# Member Management V2 Release Notes

## Summary

Member Management V2 replaces the split `MemberControl` and `Members V2` experience with one primary admin route at `/du/members`. The rollout is feature-flagged and keeps the legacy page available as a rollback fallback.

## Highlights

- Single primary member route: `/du/members`
- Full-width realtime member grid backed by `members_v2`
- Search, filters, saved views, sorting, compact density, pagination, and bulk UID copy
- Right-side member detail drawer with:
  - Overview
  - Profile
  - Usage
  - Learning
  - Permissions
  - Security
  - Audit Log
  - Danger Zone
- Backend-only profile update, role update, suspend, restore, soft delete, hard delete, learning reset, integrity check, and reconciliation flows
- Audit log coverage for sensitive admin actions
- Feature flags for staged rollout and instant UI rollback
- Legacy `MemberControl` fallback retained while production stabilizes

## Route Changes

| Route | Behavior |
| --- | --- |
| `/du/members` | Primary Member Management route |
| `/du/members-v2` | Redirects to `/du/members` |
| `/admin/members-v2` | Redirects to `/du/members` |

## Security Changes

- Sensitive admin actions are performed through Cloud Functions, not direct frontend writes.
- Actions require backend authentication and role validation.
- Destructive actions require a reason and confirmation.
- Hard delete remains super-admin-only and requires soft delete first.
- Audit logs are append-only from backend flows.
- Firestore rules should continue blocking direct sensitive client writes.

## New Backend Functions

- `adminUpdateMemberProfileV2`
- `setUserRole`
- `suspendMember`
- `restoreMember`
- `softDeleteMember`
- `hardDeleteMember`
- `resetMemberLearningProgress`
- `runMemberIntegrityCheck`
- `reconcileMemberLifecycleMismatch`
- `aggregatePresenceV2Connection`
- `cleanupPresenceV2StaleConnections`
- `cleanupPresenceV2StaleConnectionsNow`

## Feature Flags

Rollout starts with all action flags disabled except the core read-only console for an allowlisted super admin.

- `VITE_MEMBERS_V2_ENABLED`
- `VITE_MEMBERS_V2_ALLOW_SUPER_ADMINS`
- `VITE_MEMBERS_V2_ALLOW_ALL_ADMINS`
- `VITE_MEMBERS_V2_ADMIN_UIDS`
- `VITE_MEMBERS_V2_ADMIN_EMAILS`
- `VITE_MEMBERS_V2_HEALTH_DASHBOARD_ENABLED`
- `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED`
- `VITE_MEMBERS_V2_SUPER_ADMIN_ROLE_EDITOR_ENABLED`
- `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED`
- `VITE_MEMBERS_V2_SUPER_ADMIN_LIFECYCLE_ACTIONS_ENABLED`
- `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED`
- `VITE_MEMBERS_V2_SUPER_ADMIN_DELETE_ACTIONS_ENABLED`
- `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED`
- `VITE_MEMBERS_V2_SUPER_ADMIN_LEARNING_RESET_ENABLED`
- `VITE_PRESENCE_V2_ENABLED`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_PRESENCE_V2_HEARTBEAT_MS`

## Known Limitations

- Feature flags are Vite build-time values. Changing rollout scope requires a rebuild and hosting deploy.
- Legacy `MemberControl` still exists for rollback and should not be removed until post-rollout stabilization is complete.
- `resetMemberLearningProgress` must be deployed and tested before enabling `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED`.
- Presence V2 requires Realtime Database URL, Realtime Database rules, and backend aggregation functions.

## Rollback Summary

- Disable `VITE_MEMBERS_V2_ENABLED` and redeploy hosting to return `/du/members` to legacy `MemberControl`.
- Disable individual action flags to pause role/lifecycle/delete/learning reset without removing the whole console.
- Use reconciliation only for confirmed Auth/Firestore state mismatch.
