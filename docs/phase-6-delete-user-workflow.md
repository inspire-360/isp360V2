# Phase 6: Delete User Workflow

## Objective

Add a production-safe delete workflow for Member Management Console V2. Soft delete is the default path and remains reversible. Hard delete is restricted to `super_admin`, requires a dry run, two confirmation gates, a typed UID or email, a pre-delete snapshot, and audit logging.

## Current Risk

- Client-side delete or status writes would bypass centralized permission checks and audit logging.
- Hard deleting Auth before checking Firestore dependencies can create unrecoverable data loss.
- Deleting profile documents outright can break historical records, audit trails, and legal retention needs.
- A partial hard delete can leave Auth deleted while Firestore still contains profile data.

## Proposed Solution

- Add backend callable functions only:
  - `softDeleteMember`
  - `hardDeleteMember`
- Keep all sensitive writes in Cloud Functions using Firebase Admin SDK.
- Use `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED` to hide or disable delete controls.
- Require soft delete before hard delete.
- Make hard delete dry-run by default.
- Before hard delete write mode:
  - Verify actor is `super_admin`.
  - Reject self-delete.
  - Verify target is already soft deleted or Auth is already missing from a prior partial delete.
  - Check legal or financial dependency collections.
  - Block non-empty `users/{uid}` subcollections until a retention policy exists for those records.
  - Require `PHASE6_HARD_DELETE`.
  - Require typed `DELETE_PERMANENTLY`.
  - Require typed target UID or email.
- Preserve audit logs and create `memberDeletionExports/{exportId}` before destructive work.
- Anonymize Firestore profile data instead of deleting audit history.

## Files To Change

- `functions/index.js`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/utils/memberManagementFlags.js`
- `src/components/admin/MemberDetailDrawerV2.jsx`
- `docs/phase-6-delete-user-workflow.md`

## Firebase Resources Affected

- Firebase Auth: `disabled`, refresh token revocation for soft delete; Auth user deletion for hard delete.
- Firestore:
  - `users/{uid}`
  - `members_v2/{uid}`
  - `userUsage/{uid}`
  - `presence/{uid}`
  - `auditLogs/{logId}`
  - `memberDeletionExports/{exportId}`
  - `systemHealth/memberDeleteReconciliation`

## Data Impact

### Soft Delete

- Sets `users/{uid}.status = deleted`.
- Sets `users/{uid}.memberStatus = deleted`.
- Sets `members_v2/{uid}.status = deleted`.
- Sets `members_v2/{uid}.auth.disabled = true`.
- Writes lifecycle metadata and audit log.
- Does not remove existing profile, usage, audit, or historical data.

### Hard Delete

- Deletes Firebase Auth user.
- Anonymizes direct profile fields in `users/{uid}` and `members_v2/{uid}`.
- Clears detailed usage fields in `userUsage/{uid}`.
- Deletes ephemeral `presence/{uid}`.
- Preserves `auditLogs`.
- Writes pre-delete snapshot to `memberDeletionExports`.

## User Impact

- Soft-deleted users cannot sign in because Auth is disabled and refresh tokens are revoked.
- Soft delete can be restored through the backend restore flow.
- Hard delete is irreversible from the product UI.
- Normal member list behavior remains unchanged unless V2 delete feature flag is enabled.

## Security Impact

- Frontend never writes delete-sensitive fields directly.
- Backend enforces actor role and target constraints.
- `support` cannot delete.
- `admin` can soft delete non-super-admin members through backend policy.
- Only `super_admin` can hard delete.
- Admins cannot delete themselves.
- Hard delete requires prior soft delete.
- Hard delete write mode requires dependency check, reason, two confirmations, and typed UID or email.

## Retention Policy

- `auditLogs` are never deleted by this workflow.
- `memberDeletionExports` stores a pre-delete snapshot for legal review and recovery analysis.
- Direct profile PII is anonymized in Firestore during hard delete.
- Ephemeral presence is deleted because it is not a legal record.
- Any future retention purge must be a separate approved phase with its own dry run, backup, and rollback plan.

## Anonymization Plan

- `users`: clear email, name fields, phone, photo, and direct profile fields.
- `members_v2`: clear email, display name, phone, photo, and profile fields.
- `userUsage`: clear session timestamps and feature usage details.
- `presence`: delete ephemeral status document.
- Keep UID document IDs as a pseudonymous anchor for audit and referential integrity.
- Non-empty `users/{uid}` subcollections block hard delete until an approved anonymization policy exists for those records.

## Test Plan

Required before production:

- Soft delete succeeds for admin on non-super-admin target.
- Soft delete rejects self-delete.
- Soft delete rejects support role.
- Soft delete rejects admin targeting `super_admin`.
- Soft delete writes audit log.
- Soft delete disables Firebase Auth and revokes refresh tokens.
- Restore works after soft delete.
- Hard delete dry run succeeds for `super_admin` on soft-deleted target.
- Hard delete dry run reports dependency blockers.
- Hard delete write rejects without dry-run review, confirmation token, second phrase, or typed UID/email.
- Hard delete rejects `admin` and `support`.
- Hard delete rejects self-delete.
- Hard delete writes `memberDeletionExports` before Auth deletion.
- Hard delete deletes Auth and anonymizes Firestore docs.
- Hard delete preserves `auditLogs`.
- Partial failure writes `systemHealth/memberDeleteReconciliation`.

Optional after production:

- Add scheduled reconciliation report for hard-delete partial failures.
- Add legal-hold aware dependency adapters for app-specific billing or transaction collections.
- Add export review UI for `memberDeletionExports` visible only to `super_admin`.

## Rollback Plan

Soft delete rollback:

- Use existing backend `restoreMember` callable.
- Verify Auth disabled is false.
- Verify `users/{uid}.status` and `members_v2/{uid}.status` are `active`.
- Verify audit log contains restore event.

Hard delete rollback:

- Full rollback is not guaranteed because Firebase Auth user deletion is irreversible.
- Use `memberDeletionExports/{exportId}` for investigation or approved manual reconstruction.
- If Auth deletion succeeds but Firestore anonymization fails, re-run `hardDeleteMember` with the same target after review.
- The function records `systemHealth/memberDeleteReconciliation` when cleanup is required.

## Implementation Steps

1. Deploy functions to staging only.
2. Enable `VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED` for staging admin allowlist.
3. Test soft delete and restore on staging seed users.
4. Test hard delete dry run on a staging soft-deleted user.
5. Test hard delete write only after dry-run output is reviewed.
6. Confirm audit logs and deletion export snapshot.
7. Run production with feature flag disabled.
8. Enable only for a limited `super_admin` allowlist.
9. Monitor function errors, audit logs, and `systemHealth/memberDeleteReconciliation`.
10. Roll back by disabling the feature flag and keeping the existing member management page available.
