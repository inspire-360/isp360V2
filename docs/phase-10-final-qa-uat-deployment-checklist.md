# Phase 10 Final QA / UAT / Deployment Checklist

This checklist is the final handoff artifact for verifying the EdTech platform before and after release.
Use it together with the smoke scripts in `/scripts` and the Firebase backfill / verify tools in `/functions/scripts`.

## 1. Release gate

Release can proceed only when all of the following are true:

- `npm run lint` passes
- `npm run build` passes
- `npm run test:unit` passes
- `node ./scripts/smoke-auth.mjs "https://inspire-72132.web.app"` passes
- `node ./scripts/smoke-admin-console.mjs "https://inspire-72132.web.app" "<admin-email>" "<admin-password>"` passes
- `npm run qa:release` returns `Release readiness: passed`
- Firestore indexes used by admin collection-group queries are in `Ready` state
- No open production blocker remains in:
  - mission response cutover
  - video review metadata
  - innovations
  - member control
  - admin monitoring

## 2. Pre-deploy checks

Run these locally before production deployment:

```powershell
npm run lint
npm run build
npm run test:unit
```

If Firebase rules or indexes changed:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

If frontend changed:

```powershell
firebase deploy --only hosting
```

## 3. Production smoke checks

### 3.1 Learner / teacher smoke

```powershell
node .\scripts\smoke-auth.mjs "https://inspire-72132.web.app"
```

Expected result:

- Registration works
- Login / logout works
- Profile save roundtrip works
- Student and teacher enrollments work
- `consoleErrors`, `pageErrors`, `requestFailures` are all empty

### 3.2 Admin console smoke

```powershell
node .\scripts\smoke-admin-console.mjs "https://inspire-72132.web.app" "<admin-email>" "<admin-password>"
```

Expected result:

- Admin login works
- `/du/admin` loads
- Route cards open the expected pages
- `consoleErrors`, `pageErrors`, `requestFailures` are all empty

### 3.3 Member control smoke

```powershell
node .\scripts\smoke-member-control.mjs "https://inspire-72132.web.app" "<admin-email>" "<admin-password>"
```

Expected result:

- `/du/members` loads
- Selecting a member shows canonical metadata
- No permission or collection-group regressions appear

## 4. Release readiness summary

After smoke checks finish, summarize the latest reports:

```powershell
npm run qa:release
```

Optional strict run if you also want member control to be required:

```powershell
node .\scripts\release-readiness.mjs --require smoke-auth,smoke-admin-console,smoke-member-control
```

Expected result:

- `Release readiness: passed`
- Summary file written under `output/release-readiness-*.json`

## 5. UAT matrix

### Super Admin / DU Admin

- Open `/du/admin`
- Verify summary cards match current aggregates
- Expand `Learning Progress`, `Online Users`, `SOS Workspace`
- Open `/du/members`, `/du/video-coach`, `/du/innovations`, `/du/matchmaker`
- Confirm no permission errors and no missing canonical metadata

### Teacher

- Register or log in
- Update profile
- Enroll in teacher course
- Save and submit mission work
- Create SOS request
- Confirm progress and profile data reflect in dashboard / member control / admin

### Student

- Register or log in
- Enroll in student course
- Confirm route guard and dashboard behavior

## 6. Data quality verification

Run only if data migration / backfill was part of the release:

```powershell
npm run verify-mission-response-backfill -- --strict true
npm run verify-video-review-quality -- --strict true
npm run verify-innovation-quality -- --strict true
npm run verify-user-profile-quality -- --strict true
npm run verify-matchmaking-quality -- --strict true
npm run verify-admin-monitoring-quality -- --strict true
```

Expected result:

- Every script exits successfully
- No missing canonical docs remain
- No schema drift remains in the verified collections

## 7. Deployment evidence to capture

For each release, keep:

- latest learner smoke `report.json`
- latest admin smoke `report.json`
- latest release readiness summary JSON
- Firebase deploy console output for hosting / rules / indexes
- any migration or backfill command output used in that release

## 8. Rollback triggers

Rollback should be considered if any of the following occur after release:

- new `permission-denied` errors on admin pages
- collection-group index errors after indexes were previously ready
- dashboard or member control shows blank canonical data
- learner enrollment writes succeed but admin summaries stop updating
- smoke reruns fail with `pageErrors` or `requestFailures`

## 9. Rollback actions

Use the smallest rollback needed:

1. Re-deploy the previous frontend build if the issue is UI-only
2. Re-deploy previous `firestore.rules` / `firestore.indexes.json` only if the regression is access-related
3. Pause further data pruning if a backfill verification regression appears
4. Re-run smoke checks after rollback before re-opening access

## 10. Definition of done for Phase 10

Phase 10 is complete when:

- release artifacts exist in `docs/` and `scripts/`
- smoke auth passes on production
- smoke admin passes on production
- release readiness summary passes
- no blocking console / page / request failures remain
- deployment and rollback steps are documented well enough for another engineer to execute without tribal knowledge
