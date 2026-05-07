# Member Management Admin Guide

## Access

Open `/du/members` from the sidebar. During rollout, access is controlled by allowlist feature flags. If you do not see the new console, your account is either not allowlisted yet or the rollout flag is off.

## Main Grid

Use the grid as the primary workspace.

- Search by name, email, UID, school, position, or active path.
- Filter by role, status, and online state.
- Use saved views for common investigations:
  - All
  - Online
  - Needs review
  - Stale presence
  - Suspended
- Sort by user, email, role, status, online, last active, or created date.
- Select rows to copy UIDs for investigation or support handoff.

## Member Detail Drawer

Click a member row to open the detail drawer.

### Overview

Use Overview for quick identity, role, lifecycle status, activity, and integrity flags.

### Profile

Use Profile to edit safe personal fields only:

- Prefix
- First name
- Last name
- School
- Position
- Photo URL

Every profile update requires a reason. The system shows changed fields before save. If the save fails, the drawer reverts the local draft and shows an error.

### Usage

Use Usage to inspect summary usage counts:

- Enrollments
- Mission responses
- Login count
- Total sessions
- Total actions
- Last active

### Learning

Use Learning to inspect current enrollment state and Module 1 pain point signals.

Learning reset is a recovery tool, not a normal support action. It is hidden or disabled unless the rollout flag is enabled and your account is allowed.

Before resetting learning:

- Confirm the target user is correct.
- Choose one course or all enrollments.
- Enter a clear reason.
- Review the confirmation modal.
- Never use this for experimentation on production users.

Expected impact:

- Enrollment progress resets to `not_started`.
- Mission responses under the selected enrollment target are removed.
- A backend audit log is written.

### Permissions

Use Permissions to inspect and, if allowed, change member role.

Role changes:

- Are backend-only.
- Update Firebase custom claims.
- Mirror role to Firestore.
- Revoke refresh tokens.
- Write audit log.
- Require a reason.

Only a super admin should use role editing during rollout.

### Security

Use Security to inspect:

- Auth disabled state
- Email verification
- Provider IDs
- Auth creation and last sign-in
- Presence source
- Connection counts
- Profile/usage/stale presence flags

### Audit Log

Use Audit Log to review backend-written actions for the selected member. If an expected action is missing from audit logs, pause rollout and report it before continuing.

### Danger Zone

Danger Zone contains high-impact actions.

Suspend:

- Disables Firebase Auth.
- Revokes refresh tokens.
- Updates Firestore status.
- Writes audit log.

Restore:

- Enables Firebase Auth.
- Updates Firestore status.
- Writes audit log.

Soft delete:

- Default delete path.
- Disables Auth.
- Revokes tokens.
- Marks status deleted.
- Keeps recovery path available by policy.

Hard delete:

- Super-admin-only.
- Requires soft delete first.
- Requires dry run.
- Requires typed UID/email confirmation.
- Requires second confirmation.
- Preserves audit/deletion snapshot.
- Should not be used during rollout except with explicit approval.

## What To Do If Something Looks Wrong

### Members do not load

- Confirm you are allowlisted.
- Confirm `VITE_MEMBERS_V2_ENABLED=true` in the current build.
- Confirm Firestore rules allow admin reads for `members_v2`.
- Capture the exact error message and route.

### Action button is disabled

This is usually expected. Check:

- Your role.
- The target member role.
- Whether you are trying to act on yourself.
- Whether the feature flag is enabled.
- Whether the member is already suspended, deleted, or hard-deleted.

### Suspend/delete partially fails

- Do not retry blindly.
- Check audit log for `partial_failure`.
- Run lifecycle reconciliation dry run.
- Escalate before write-mode reconciliation.

### Presence looks stale

- Treat presence as non-critical.
- Use last active and last sign-in as fallback.
- Report stale presence spikes for system health review.

## Admin Rules During Rollout

- Do not hard delete production users without explicit approval.
- Do not reset learning on real users for testing.
- Do not change your own role or lifecycle state.
- Do not use legacy `MemberControl` for sensitive role/status edits unless rollback has been declared.
- Always write a clear reason for profile, role, lifecycle, delete, or learning reset actions.
- Stop and report if audit log is missing after any sensitive action.
