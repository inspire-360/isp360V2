# Phase 2: Safe Backfill and Data Integrity Repair

## Objective

Repair member-management data gaps in a production-safe way by observing first,
running dry-run reports, and only writing additive data after explicit review.

Primary goals:

- Find Firebase Auth users without `users/{uid}` profiles.
- Find profiles without Firebase Auth users.
- Find missing or incomplete `userUsage/{uid}` documents.
- Build or refresh additive `members_v2/{uid}` read-model documents.
- Mark incomplete records with review flags instead of guessing.
- Produce an integrity report and rollback manifest for every write-mode run.

## Current Risk

Phase 0 found these production risks:

- 38 Auth users have no `users/{uid}` profile.
- 0 `users/{uid}` profiles are orphaned from Firebase Auth.
- 24 online presence records appear stale.
- 34 presence records belong to UIDs without a profile.
- Admin-sensitive user edits are still possible from the frontend in the legacy flow.
- Presence is Firestore-heartbeat based and can leave ghost online state.

This phase must not change login, register, profile update, or existing member
screen behavior.

## Proposed Solution

Use a guarded Admin SDK script:

- Script: `functions/scripts/member-v2-safe-backfill.mjs`
- Root npm alias: `npm run member-v2:backfill`
- Functions npm alias: `npm run member-v2:backfill`

Default mode is dry run. No Firestore writes occur unless both flags are present:

```powershell
--write true --confirm PHASE2_WRITE
```

Missing legacy profiles are not created unless this additional flag is present:

```powershell
--repair-users true
```

The safe default write target is additive:

- Create or update `members_v2/{uid}` read-model documents.
- Create or update `userUsage/{uid}` only by merge strategy.
- Optionally write `systemHealth/memberIntegrity`.
- Create `auditLogs/{logId}` for each write operation.

## Files To Change

Implemented in this phase:

- `functions/scripts/member-v2-safe-backfill.mjs`
- `package.json`
- `functions/package.json`
- `docs/phase-2-safe-backfill-and-integrity-repair.md`

No frontend files, Firebase rules, Firebase indexes, deployed functions, or
production environment variables are changed in this phase.

## Firebase Resources Affected

Dry run:

- Reads Firebase Auth users from `--auth-export` or Admin SDK.
- Reads Firestore `users`.
- Reads Firestore `members_v2`.
- Reads Firestore `userUsage`.
- Reads Firestore `presence`.
- Reads collection group `enrollments`.
- Reads collection group `mission_responses`.
- Reads `systemHealth/memberIntegrity`.

Write mode, after approval only:

- `members_v2/{uid}`: additive member read model.
- `userUsage/{uid}`: usage defaults and derived summary fields.
- `users/{uid}`: only when `--repair-users true` and only when the profile is missing.
- `systemHealth/memberIntegrity`: integrity counters.
- `auditLogs/{logId}`: one audit entry per write operation.

No delete operation is included.

## Data Impact

Dry run:

- Creates local output files only.
- Does not modify Firebase.

Write mode:

- Uses Firestore `set(..., { merge: true })`.
- Does not hard delete orphan data.
- Does not overwrite full documents.
- Missing profiles can be marked in `members_v2.flags.profileMissing`.
- Missing usage can be marked in `members_v2.flags.usageMissing`.
- Uncertain or incomplete records are marked `requiresReview`.

The script produces `backup-before-write.json` before the first Firestore batch
commit in write mode.

## User Impact

Dry run:

- No user impact.
- No login/register/profile-update behavior changes.

Write mode without `--repair-users true`:

- No legacy user-facing behavior should change.
- V2 admin read model becomes available for later shadow-mode UI.

Write mode with `--repair-users true`:

- Missing `users/{uid}` profiles are created with minimal default values.
- This must be reviewed carefully because it can affect legacy user discovery.
- Recommended first run: one UID only, then a small batch.

## Security Impact

This script uses Firebase Admin SDK and must be run only by trusted operators.

Required controls:

- Use a least-privilege service account where possible.
- Store service account JSON outside git.
- Do not commit files under `output/` because they may contain email addresses,
  Auth exports, profile snapshots, and rollback data.
- Write mode requires explicit confirmation.
- Every write-mode operation creates an audit log.
- Hard delete is not implemented in this phase.

## Test Plan

Required before any write mode:

1. Syntax check:

```powershell
node --check ".\functions\scripts\member-v2-safe-backfill.mjs"
```

2. Help command:

```powershell
npm run member-v2:backfill -- --help true
```

3. Dry run using Phase 0 Auth export:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --limit 100
```

4. Review output files:

- `dry-run-report.json`
- `data-integrity-report.json`
- `rollback-manifest.json`
- `error-report.json`
- `write-summary.json`
- `batch-log.jsonl`

5. Confirm dry-run report matches Phase 0 expectations:

- Auth user count: 83
- Firestore profile count: 45
- Auth users without profile: 38
- Orphan profiles: 0
- Stale online presence: about 24, depending on run time

Recommended first write-mode validation after review:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --user-id "<UID>" --write true --confirm PHASE2_WRITE --reason "phase2 single-user validation"
```

Recommended limited batch after single-user validation:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --limit 20 --write true --confirm PHASE2_WRITE --reason "phase2 limited members_v2/userUsage backfill"
```

Do not use `--repair-users true` until V2 read-model writes are reviewed.

## Phase 2B: Legacy Profile Repair

Phase 2B repairs Auth users that still have no legacy `users/{uid}` profile.
This is higher risk than the additive `members_v2` and `userUsage` backfill
because the existing app reads `users/{uid}` for auth context, member lists, and
profile update flows.

Additional guardrails:

- Dry run first with `--repair-users true`.
- Write mode requires both `--confirm PHASE2_WRITE` and
  `--confirm-repair-users PHASE2_REPAIR_USERS`.
- `--repair-users true` defaults to `--missing-profiles-only true`.
- Write mode is capped at 10 missing profiles per run by default.
- The script creates only documents that do not already exist.
- Existing `users/{uid}` documents are never patched by Phase 2B.
- Phase 2B does not write `userUsage`; that collection was completed in Phase 2A.
- The generated legacy profile is marked with `backfill.requiresReview: true`.
- Do not run Phase 2B until `members_v2` and `userUsage` are complete and
  final dry run reports `plannedSummary.total = 0` without repair mode.

Recommended dry run for all remaining missing profiles:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --repair-users true --missing-profiles-only true --limit 38 --output-dir ".\output\phase2b-users-repair-dry-run-38"
```

Recommended first write validation:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --repair-users true --missing-profiles-only true --limit 1 --write true --confirm PHASE2_WRITE --confirm-repair-users PHASE2_REPAIR_USERS --write-system-health false --output-dir ".\output\phase2b-users-repair-write-one" --reason "phase2b single missing users profile repair validation"
```

Recommended bounded write batches after one-user validation:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --repair-users true --missing-profiles-only true --limit 10 --write true --confirm PHASE2_WRITE --confirm-repair-users PHASE2_REPAIR_USERS --write-system-health false --output-dir ".\output\phase2b-users-repair-write-10" --reason "phase2b limited missing users profile repair"
```

Because `--missing-profiles-only true` filters out repaired profiles, repeat the
bounded write command with a new output directory until no missing profiles
remain. Always run a dry run between write batches when the previous batch has
any errors.

## Dry Run Report

Dry-run output directory defaults to:

```text
output/phase2-member-v2-backfill-<timestamp>
```

`dry-run-report.json` includes:

- Project ID.
- Whether write mode is enabled.
- Filters used.
- Counts.
- Planned operation summary.
- Planned document paths.
- Top-level fields to be created or updated.

## Write Mode Script

The script supports:

- `--auth-export`: read Auth users from the Phase 0 export.
- `--user-id`: one-user validation.
- `--limit`: bounded batches.
- `--batch-size`: capped at 100 operations.
- `--write true`: enable Firestore writes.
- `--confirm PHASE2_WRITE`: required write confirmation token.
- `--repair-users true`: opt-in legacy `users/{uid}` profile repair.
- `--confirm-repair-users PHASE2_REPAIR_USERS`: required extra token for legacy profile repair writes.
- `--missing-profiles-only true`: process only Auth users missing `users/{uid}`.
- `--max-repair-users-write`: maximum legacy profiles allowed per write run, capped at 25.
- `--system-health-only true`: write or dry-run only `systemHealth/memberIntegrity`.
- `--write-system-health false`: skip `systemHealth/memberIntegrity` write.
- `--reason`: audit reason.
- `--output-dir`: deterministic output path.

Final system health snapshot after Phase 2A/2B:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --system-health-only true --output-dir ".\output\phase2-system-health-dry-run"
```

If the dry-run has only `systemHealth_memberIntegrity_upsert`, write the snapshot:

```powershell
npm run member-v2:backfill -- --auth-export ".\output\phase0-auth-export.json" --system-health-only true --write true --confirm PHASE2_WRITE --output-dir ".\output\phase2-system-health-write" --reason "phase2 final member integrity system health snapshot"
```

## Data Integrity Report

`data-integrity-report.json` includes:

- Auth users count.
- Selected Auth users count.
- Firestore profile count.
- `members_v2` count.
- `userUsage` count.
- Presence document count.
- Auth users without profile.
- Profiles without Auth user.
- Profiles without usage.
- Auth users without `userUsage`.
- Stale online presence.
- Presence without profile.
- Presence without Auth user.
- Presence UID mismatch.
- Role mismatch.
- Disabled mismatch.

## Error Report

`error-report.json` includes:

- Fatal script errors.
- Batch commit failures.
- Firestore/Admin SDK error codes.
- Failed operation paths.

`batch-log.jsonl` includes each batch attempt and retry status.

## Rollback Plan

No rollback is required for dry run because Firebase is not modified.

For write mode:

1. Keep the output directory from the write run.
2. Use `backup-before-write.json` as the full pre-write snapshot.
3. Use `rollback-manifest.json` to identify only committed paths and fields.
4. Revert only fields written by the script.
5. Do not replace whole documents.
6. Do not delete documents that may have received unrelated production updates
   after the backfill.
7. If a document was created by the script and has not changed since, it can be
   deleted only after explicit approval.
8. If a document was created by the script and later changed by production, remove
   only script-owned fields or mark it for manual review.

Recommended rollback validation:

- Compare current document `updatedAt` or script-owned metadata with the manifest.
- Re-read affected docs after rollback.
- Re-run dry run for the same `--user-id` or batch.
- Confirm `error-report.json` is clean.

## Implementation Steps

1. Run syntax and help checks.
2. Run dry run with `--limit 100`.
3. Review planned operations and integrity report.
4. Run one-user write without `--repair-users true`.
5. Validate `members_v2`, `userUsage`, `auditLogs`, and local backup files.
6. Run a limited batch without `--repair-users true`.
7. Review dashboard/read-model behavior in staging or shadow mode.
8. Decide separately whether minimal legacy profile repair is needed.
9. If legacy repair is approved, start with one UID and `--repair-users true`.
10. Re-run integrity report and compare counts.

## Do Not Touch Areas

- Do not modify Firestore Security Rules in this phase.
- Do not deploy Cloud Functions in this phase.
- Do not hard delete Auth users, profiles, usage docs, or presence docs.
- Do not alter login/register/profile-update frontend flows.
- Do not run one-shot production migration.
- Do not use `--repair-users true` as the first production write.

## Exit Criteria

Phase 2 can be considered ready for review when:

- Syntax and help checks pass.
- Dry run completes with no fatal errors.
- Reports are generated in `output/`.
- Planned write operations are understood and reviewed.
- Rollback manifest and backup format are present.
- First write proposal is scoped to one UID or a small batch.
