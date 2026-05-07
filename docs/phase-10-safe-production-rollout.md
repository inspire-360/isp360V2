# Phase 10: Safe Production Rollout

## Objective

Roll out the unified Member Management system in production gradually, with feature flags, staging sign-off, production smoke tests, monitoring, and a clear rollback path. This phase must not remove the legacy `MemberControl` fallback until the new console is stable in production.

## Release Scope

### In scope

- Unified primary route: `/du/members`
- Legacy fallback retained behind `VITE_MEMBERS_V2_ENABLED=false`
- Redirects from `/du/members-v2` and `/admin/members-v2` to `/du/members`
- `members_v2`, `userUsage`, `auditLogs`, `systemHealth`, `systemHealthRuns`
- Admin backend callables:
  - `adminUpdateMemberProfileV2`
  - `setUserRole`
  - `suspendMember`
  - `restoreMember`
  - `softDeleteMember`
  - `hardDeleteMember`
  - `resetMemberLearningProgress`
  - `runMemberIntegrityCheck`
  - `reconcileMemberLifecycleMismatch`
  - `cleanupPresenceV2StaleConnectionsNow`
- Presence V2 backend:
  - `aggregatePresenceV2Connection`
  - `cleanupPresenceV2StaleConnections`
- Firestore and Realtime Database rules already designed to keep sensitive writes backend-only.

### Out of scope

- Removing `MemberControl`
- Broad production enablement without staged allowlist
- Hard delete of real users during rollout
- One-shot production data migration
- Phase 10 production deployment from this document alone without sign-off evidence

## Rollout Checklist

### Gate 0: Pre-rollout local verification

- [ ] Confirm current branch contains the intended member-management changes only.
- [ ] Confirm no production data mutation scripts are planned for this release.
- [ ] Run local checks:

```powershell
node --check .\functions\index.js
npm run lint
npm run test:unit
npm run build
npm run qa:release
```

- [ ] Confirm the generated build points at the intended Firebase project configuration for the target environment.
- [ ] Confirm `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED=false` unless `resetMemberLearningProgress` is deployed and tested.
- [ ] Capture output under `output/` as release evidence.

### Gate 1: Staging deploy

Deploy to staging first. Use the staging project explicitly:

```powershell
$env:PROJECT_ID="inspire-staging-e7e8b"
firebase deploy --only functions:adminUpdateMemberProfileV2,functions:setUserRole,functions:suspendMember,functions:restoreMember,functions:softDeleteMember,functions:hardDeleteMember,functions:resetMemberLearningProgress,functions:runMemberIntegrityCheck,functions:reconcileMemberLifecycleMismatch,functions:cleanupPresenceV2StaleConnectionsNow --project $env:PROJECT_ID
firebase deploy --only firestore:indexes --project $env:PROJECT_ID
firebase deploy --only firestore:rules --project $env:PROJECT_ID
firebase deploy --only database --project $env:PROJECT_ID
```

Deploy scheduled and database-triggered presence functions only after Realtime Database URL and rules are verified in staging:

```powershell
firebase deploy --only functions:aggregatePresenceV2Connection,functions:cleanupPresenceV2StaleConnections --project $env:PROJECT_ID
```

Deploy staging hosting only after flags are set for a limited allowlist:

```powershell
npm run build
firebase deploy --only hosting --project $env:PROJECT_ID
```

### Gate 2: Staging sign-off

- [ ] Super admin can open `/du/members`.
- [ ] Sidebar shows only one member item.
- [ ] `/du/members-v2` redirects to `/du/members`.
- [ ] `/admin/members-v2` redirects to `/du/members`.
- [ ] Member grid loads realtime `members_v2`.
- [ ] Search, filter, saved views, sort, pagination, and drawer open work.
- [ ] Profile update writes via `adminUpdateMemberProfileV2` and creates audit log.
- [ ] Role editor is hidden/disabled unless flag and role allow it.
- [ ] Suspend/restore buttons are hidden/disabled unless flag and role allow them.
- [ ] Delete buttons are hidden/disabled unless flag and role allow them.
- [ ] Learning reset is hidden/disabled unless `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED=true`.
- [ ] Audit & Health dashboard loads for allowlisted admin when enabled.
- [ ] Integrity check dry run works in staging.
- [ ] No console errors, request failures, permission errors, or function errors remain.

### Gate 3: Production deploy, backend internal-only

Deploy backend and rules first with UI flags still off for general admins.

```powershell
$env:PROJECT_ID="inspire-72132"
firebase deploy --only functions:adminUpdateMemberProfileV2,functions:setUserRole,functions:suspendMember,functions:restoreMember,functions:softDeleteMember,functions:hardDeleteMember,functions:resetMemberLearningProgress,functions:runMemberIntegrityCheck,functions:reconcileMemberLifecycleMismatch,functions:cleanupPresenceV2StaleConnectionsNow --project $env:PROJECT_ID
firebase deploy --only firestore:indexes --project $env:PROJECT_ID
firebase deploy --only firestore:rules --project $env:PROJECT_ID
```

Presence V2 production deploy requires separate approval:

```powershell
firebase deploy --only database --project $env:PROJECT_ID
firebase deploy --only functions:aggregatePresenceV2Connection,functions:cleanupPresenceV2StaleConnections --project $env:PROJECT_ID
```

Expected state:

- Backend callables exist but are protected by authentication, backend role checks, reason validation, confirmation tokens, and UI flags.
- No broad admin group sees the new console yet.

### Gate 4: Production super admin canary

Build and deploy hosting with:

- `VITE_MEMBERS_V2_ENABLED=true`
- `VITE_MEMBERS_V2_ALLOW_SUPER_ADMINS=true`
- `VITE_MEMBERS_V2_ALLOW_ALL_ADMINS=false`
- `VITE_MEMBERS_V2_ADMIN_EMAILS=<super-admin-email-only>`
- Keep dangerous flags off at first:
  - `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED=false`
  - `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED=false`
  - `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED=false`
  - `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED=false`
- If the super admin canary must perform management actions before broader admin rollout, enable only the super-admin scoped flags needed for that test:
  - `VITE_MEMBERS_V2_SUPER_ADMIN_ROLE_EDITOR_ENABLED=true`
  - `VITE_MEMBERS_V2_SUPER_ADMIN_LIFECYCLE_ACTIONS_ENABLED=true`
  - `VITE_MEMBERS_V2_SUPER_ADMIN_LEARNING_RESET_ENABLED=true`
  - Keep `VITE_MEMBERS_V2_SUPER_ADMIN_DELETE_ACTIONS_ENABLED=false` unless delete workflow QA has explicit approval.

Then:

- [ ] Run production smoke checks.
- [ ] Check function logs.
- [ ] Check Firestore read rule behavior.
- [ ] Confirm legacy fallback returns when building with `VITE_MEMBERS_V2_ENABLED=false`.

### Gate 5: Limited admin rollout

Add 1-3 admin emails to `VITE_MEMBERS_V2_ADMIN_EMAILS`. Keep action flags staged:

1. Read-only grid and drawer.
2. Profile update.
3. Role editor for super admin only.
4. Suspend/restore.
5. Soft delete.
6. Hard delete and learning reset only after explicit operational approval.

### Gate 6: Full admin rollout

Enable:

- `VITE_MEMBERS_V2_ALLOW_ALL_ADMINS=true`

Keep `MemberControl` fallback in code for at least one stabilization window. Recommended minimum: 7 production days with no P1/P2 member-management incidents.

### Gate 7: Legacy deprecation

Deprecate the legacy page only when:

- [ ] Production telemetry shows admins are using `/du/members` successfully.
- [ ] No active support ticket requires legacy member control.
- [ ] All smoke tests pass against production.
- [ ] Rollback is still possible through previous hosting artifact or branch tag.
- [ ] Product owner and engineering owner sign off.

## Feature Flag Matrix

Vite flags are build-time flags. Changing them requires rebuilding and redeploying hosting unless the project later moves these flags to Remote Config or a backend config document.

| Flag | Default | Super admin canary | Limited admin | Full admin | Rollback |
| --- | --- | --- | --- | --- | --- |
| `VITE_MEMBERS_V2_ENABLED` | `false` | `true` | `true` | `true` | `false` |
| `VITE_MEMBERS_V2_ALLOW_SUPER_ADMINS` | `true` | `true` | `true` | `true` | `false` if super-admin access must be paused |
| `VITE_MEMBERS_V2_ALLOW_ALL_ADMINS` | `false` | `false` | `false` | `true` | `false` |
| `VITE_MEMBERS_V2_ADMIN_UIDS` | empty | optional UID allowlist | optional UID allowlist | optional | empty |
| `VITE_MEMBERS_V2_ADMIN_EMAILS` | empty | super admin only | 1-3 admins | optional | empty |
| `VITE_MEMBERS_V2_HEALTH_DASHBOARD_ENABLED` | `false` | `true` | `true` | `true` | `false` |
| `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED` | `false` | `false` then `true` | `true` for super admin only by backend | `true` | `false` |
| `VITE_MEMBERS_V2_SUPER_ADMIN_ROLE_EDITOR_ENABLED` | `false` | optional `true` | optional `true` | optional | `false` |
| `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED` | `false` | `false` | staged `true` | `true` | `false` |
| `VITE_MEMBERS_V2_SUPER_ADMIN_LIFECYCLE_ACTIONS_ENABLED` | `false` | optional `true` | optional `true` | optional | `false` |
| `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED` | `false` | `false` | soft delete only by procedure | staged `true` | `false` |
| `VITE_MEMBERS_V2_SUPER_ADMIN_DELETE_ACTIONS_ENABLED` | `false` | keep `false` unless explicitly approved | soft delete only by procedure | optional | `false` |
| `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED` | `false` | `false` | staged `true` after callable QA | staged `true` | `false` |
| `VITE_MEMBERS_V2_SUPER_ADMIN_LEARNING_RESET_ENABLED` | `false` | optional `true` after callable QA | optional `true` | optional | `false` |
| `VITE_PRESENCE_V2_ENABLED` | `false` | optional | optional | `true` after presence QA | `false` |
| `VITE_FIREBASE_DATABASE_URL` | empty | staging/prod RTDB URL | staging/prod RTDB URL | staging/prod RTDB URL | empty |
| `VITE_PRESENCE_V2_HEARTBEAT_MS` | `30000` | `30000` | `30000` | `30000` | `30000` |

## Smoke Test Checklist

### Pre-production

```powershell
npm run lint
npm run test:unit
npm run build
npm run qa:release
```

### Staging smoke

```powershell
node .\scripts\smoke-auth.mjs "https://<staging-hosting-url>"
node .\scripts\smoke-admin-console.mjs "https://<staging-hosting-url>" "<admin-email>" "<admin-password>"
node .\scripts\smoke-member-control.mjs "https://<staging-hosting-url>" "<admin-email>" "<admin-password>"
```

Manual staging smoke:

- [ ] Login as super admin.
- [ ] Open `/du/members`.
- [ ] Confirm grid shows real staging members.
- [ ] Search by email and UID.
- [ ] Filter by role, status, online state, saved views.
- [ ] Sort User, Email, Role, Status, Online, Last Active, Created.
- [ ] Change page size and page.
- [ ] Open drawer from row and action button.
- [ ] Profile tab: edit safe profile fields with reason, verify audit log.
- [ ] Usage tab: verify usage summary.
- [ ] Learning tab: verify enrollment cards and pain point signals.
- [ ] Permissions tab: verify role editor visibility.
- [ ] Security tab: verify auth/presence/flag fields.
- [ ] Audit tab: verify latest backend action.
- [ ] Danger tab: verify blocked actions show clear reason when flags are off.

### Production smoke

Run after production hosting deploy:

```powershell
node .\scripts\smoke-auth.mjs "https://inspire-72132.web.app"
node .\scripts\smoke-admin-console.mjs "https://inspire-72132.web.app" "<admin-email>" "<admin-password>"
node .\scripts\smoke-member-control.mjs "https://inspire-72132.web.app" "<admin-email>" "<admin-password>"
npm run qa:release
```

Expected result:

- Login/register/profile update flows still pass.
- `/du/members` loads.
- Legacy route redirects do not break navigation.
- No permission-denied errors for allowlisted super admin.
- No sensitive action appears when its feature flag is off.

## Monitoring Checklist

### Firebase Console

- [ ] Cloud Functions errors by function name.
- [ ] Cloud Functions latency p50/p95/p99.
- [ ] Cloud Functions cold starts and memory usage.
- [ ] Firestore read/write error rate.
- [ ] Firestore rules denied requests.
- [ ] Firestore index build state.
- [ ] Realtime Database connection and rules errors if Presence V2 is enabled.
- [ ] Hosting 4xx/5xx and cache behavior.

### Application health documents

- [ ] `systemHealth/memberIntegrity`
- [ ] `systemHealth/memberLifecycleReconciliation`
- [ ] `systemHealthRuns/*`
- [ ] `auditLogs` entries with `status in ["failed", "partial_failure"]`

### Alert thresholds

- `permission-denied` on `/du/members` for allowlisted admin: immediate rollback candidate.
- Any `member.lifecycle.*` audit log with `partial_failure=true`: run reconciliation dry run.
- More than 3 callable errors in 15 minutes: pause rollout.
- `missingProfilesCount > 0` after Phase 2B completion: investigate before wider rollout.
- `disabledMismatchCount > 0`: run reconciliation dry run before write mode.
- Presence stale count spikes after enabling Presence V2: disable Presence V2 flag first.

### Suggested manual log checks

```powershell
firebase functions:log --only adminUpdateMemberProfileV2 --project inspire-72132
firebase functions:log --only setUserRole --project inspire-72132
firebase functions:log --only suspendMember --project inspire-72132
firebase functions:log --only restoreMember --project inspire-72132
firebase functions:log --only softDeleteMember --project inspire-72132
firebase functions:log --only hardDeleteMember --project inspire-72132
firebase functions:log --only resetMemberLearningProgress --project inspire-72132
firebase functions:log --only runMemberIntegrityCheck --project inspire-72132
```

## Rollback Checklist

Use the smallest rollback that stops the incident.

### UI-only rollback

- [ ] Set `VITE_MEMBERS_V2_ENABLED=false`.
- [ ] Rebuild hosting.
- [ ] Deploy hosting only.
- [ ] Confirm `/du/members` renders legacy `MemberControl`.
- [ ] Confirm `/du/members-v2` redirects to `/du/members`.

```powershell
npm run build
firebase deploy --only hosting --project inspire-72132
```

### Action-specific rollback

Disable only the failing action flag, rebuild, and deploy hosting:

- `VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED=false`
- `VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED=false`
- `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED=false`
- `VITE_MEMBERS_V2_LEARNING_RESET_ENABLED=false`
- `VITE_PRESENCE_V2_ENABLED=false`

### Backend function rollback

Preferred rollback is to disable the UI flag first. If a callable itself is unsafe, redeploy the previous known-good functions source. Deleting functions is an incident-only action and requires explicit approval.

Incident-only delete example:

```powershell
firebase functions:delete resetMemberLearningProgress --region asia-southeast1 --project inspire-72132
```

### Rules rollback

- [ ] Re-deploy the previous known-good `firestore.rules`.
- [ ] Re-run production smoke tests.
- [ ] Do not loosen sensitive client writes as a workaround.

### Data state rollback

- [ ] Do not revert full documents.
- [ ] Use audit logs to identify exact fields/actions.
- [ ] If Auth and Firestore lifecycle diverge, run reconciliation dry run first.

```powershell
# Dry run through callable/UI or local admin-only tool first.
# Write mode only after approval and after reviewing target UIDs.
```

## Admin Documentation

See `docs/member-management-admin-guide.md`.

## Release Notes

See `docs/member-management-v2-release-notes.md`.

## Final Production Readiness Report

### Current readiness

- Local checks for the unified member management work passed on 2026-05-06:
  - `node --check .\functions\index.js`
  - `npm run lint`
  - `npm run test:unit`
  - `npm run build`
  - `npm run qa:release`
- The unified `/du/members` route is feature-flagged and retains legacy fallback.
- Sensitive operations use backend callables.
- Destructive workflows require reason, confirmation, role checks, and audit logs.

### Required before production enablement

- [ ] Staging functions deploy completed.
- [ ] Staging rules/indexes/database rules deploy completed.
- [ ] Staging hosting deploy completed with super-admin allowlist only.
- [ ] Staging smoke and manual UAT signed off.
- [ ] Production backend deploy completed with UI flags still limited.
- [ ] Production smoke checks passed.
- [ ] Monitoring dashboard reviewed for errors/latency.
- [ ] Rollback owner and command path confirmed.

### Go / no-go criteria

Go only if:

- [ ] No P1/P2 regression in login/register/profile update.
- [ ] No unexplained `permission-denied` for allowlisted admins.
- [ ] No callable partial failures.
- [ ] `systemHealth/memberIntegrity` has acceptable counts.
- [ ] Admins can complete read-only workflows before action flags are enabled.

No-go if:

- [ ] Any Auth lifecycle mismatch is detected after suspend/restore/soft delete.
- [ ] Firestore rules block expected admin reads.
- [ ] Any destructive action runs without audit log.
- [ ] Build was produced against the wrong Firebase project configuration.
