# Phase 9: Audit & System Health

## Objective

Make Member Management V2 auditable and observable before issues affect real users. Phase 9 adds a read-only Audit & Health dashboard plus a backend integrity checker that runs in dry-run mode by default.

## Current Risk

- Admin operations are hard to review without a central audit viewer.
- Data integrity issues can remain invisible until an admin opens a broken member record.
- Failed or partial backend operations require a clear review surface.
- Repair actions are risky if exposed before dry-run, confirmation, and rollback paths exist.

## Proposed Solution

- Use `auditLogs` as the backend-only append-only event stream.
- Add `runMemberIntegrityCheck` callable.
- Add `systemHealth/memberIntegrity` snapshot support.
- Add `systemHealthRuns/{runId}` for detailed integrity run history.
- Add `AuditSystemHealthV2` page gated by `VITE_MEMBERS_V2_HEALTH_DASHBOARD_ENABLED`.
- Keep the UI read-only in Phase 9.
- Keep repair actions locked until a separate confirmed backend repair phase.

## Audit Log Schema

Common fields:

- `schemaVersion`
- `type`
- `actorUid`
- `actorRole`
- `targetUid`
- `targetRole`
- `targetCollection`
- `before`
- `after`
- `changedFields`
- `reason`
- `requestId`
- `status`
- `partialFailure`
- `requiresReconciliation`
- `error`
- `metadata`
- `createdAt`
- `updatedAt`

Covered backend event types:

- `member.profile.update`
- `member.rbac.role.update`
- `member.lifecycle.suspend`
- `member.lifecycle.restore`
- `member.delete.soft`
- `member.delete.hard`
- `member.lifecycle.reconcile`
- `system.health.member_integrity.snapshot`

Planned event types:

- `member.session.revoked`
- `admin.auth.login`
- `admin.action.failed`

## System Health Checks

`runMemberIntegrityCheck` detects:

- Auth user has no Firestore `users/{uid}` profile.
- Firestore `users/{uid}` profile has no Auth user.
- Auth user has no `userUsage/{uid}` record.
- Firestore status does not match Auth disabled state.
- Firebase custom claim role does not match Firestore role mirror.
- Presence is stale.
- Required fields are missing.
- Backfill-required flags are present.
- Failed or partial audit records exist.

## Files To Change

- `functions/index.js`
- `src/pages/AuditSystemHealthV2.jsx`
- `src/hooks/useAuditHealthDashboard.js`
- `src/services/firebase/repositories/auditHealthRepository.js`
- `src/services/firebase/collections.js`
- `src/services/firebase/pathBuilders.js`
- `src/utils/memberManagementFlags.js`
- `src/components/Layout.jsx`
- `src/routes/AppRoutes.jsx`
- `firestore.rules`
- `docs/phase-9-audit-and-system-health.md`

## Firebase Resources Affected

- `auditLogs/{logId}`
- `systemHealth/memberIntegrity`
- `systemHealthRuns/{runId}`
- callable function `runMemberIntegrityCheck`

## Data Impact

- Dry-run integrity checks do not write data.
- Write mode requires `super_admin` and confirm `PHASE9_HEALTH_SNAPSHOT`.
- Write mode creates an additive snapshot under `systemHealth` and `systemHealthRuns`.
- No existing production documents are deleted or rewritten by the dashboard.

## User Impact

- No impact when feature flag is off.
- Health dashboard is admin-only and read-only.
- Core login, register, profile update, course, and member flows are unchanged.

## Security Impact

- Frontend cannot write `auditLogs`, `systemHealth`, or `systemHealthRuns`.
- Audit logs remain append-only from the UI perspective.
- Integrity snapshot write requires backend callable, `super_admin`, and explicit confirm.
- Repair actions are not exposed in Phase 9.

## Repair Action Plan

Not implemented as UI write actions in Phase 9.

Future repair actions must follow:

- Dry run first.
- Small batch limit.
- Explicit confirmation token.
- Backend-only write.
- Audit log.
- Per-field rollback plan.
- No hard delete as repair.

Candidate repair flows:

- Backfill missing profile.
- Backfill missing usage record.
- Reconcile Auth disabled vs Firestore status.
- Reconcile custom claims vs Firestore role.
- Cleanup stale presence connections.

## Alerting Plan

Initial manual monitoring:

- Check `systemHealth/memberIntegrity.status`.
- Check `systemHealth/memberIntegrity.counts.highRiskIssueCount`.
- Check failed and partial audit records.

Future automated alerts:

- Alert when `status = requires_review`.
- Alert when `highRiskIssueCount > 0`.
- Alert when `lastCheckedAt` is older than threshold.
- Alert on any `partial_failure` audit log.

## Test Cases

Required before production:

- Dashboard hidden when feature flag is off.
- Dashboard visible only to admin allowlist when feature flag is on.
- Audit viewer reads latest `auditLogs`.
- Frontend cannot create/update/delete `auditLogs`.
- System health viewer reads `systemHealth`.
- Frontend cannot create/update/delete `systemHealth`.
- Dry-run integrity check returns issues without writing.
- Snapshot write rejects non-`super_admin`.
- Snapshot write rejects missing `PHASE9_HEALTH_SNAPSHOT`.
- Snapshot write creates `systemHealth/memberIntegrity`.
- Snapshot write creates `systemHealthRuns/{runId}`.
- Snapshot write creates audit log.
- Repair tab has no write buttons.

## Rollback Plan

- Disable `VITE_MEMBERS_V2_HEALTH_DASHBOARD_ENABLED`.
- Keep audit logs and health snapshots because they are additive.
- Undeploy `runMemberIntegrityCheck` only if staging shows a backend issue.
- No data rollback is required for dry-run mode.
