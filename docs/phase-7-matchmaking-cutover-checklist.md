## Phase 7 Matchmaking Cutover Checklist

### 1. Deploy application code and Firestore rules

```powershell
npm run build
firebase deploy --only hosting,firestore:rules
```

### 2. Dry run the match request contract backfill

```powershell
npm run backfill-match-request-contract --
```

Optional filters:

```powershell
npm run backfill-match-request-contract -- --user-id USER_UID
npm run backfill-match-request-contract -- --request-id REQUEST_ID
```

### 3. Verify current production quality before writing

```powershell
npm run verify-matchmaking-quality --
```

Expected pre-write findings on legacy documents:
- `missingRequesterSnapshotCount`
- `invalidPriorityCount`
- `invalidResourceTypeCount`
- `missingNeedTagsCount`
- `missingMatchedExpertSnapshotCount` on matched/completed requests

### 4. Run the write pass

```powershell
npm run backfill-match-request-contract -- --write true
```

### 5. Strict verify after the write pass

```powershell
npm run verify-matchmaking-quality -- --strict true
```

Expected strict result:
- `missingRequesterIdCount = 0`
- `missingRequesterSnapshotCount = 0`
- `invalidPriorityCount = 0`
- `invalidResourceTypeCount = 0`
- `missingNeedTagsCount = 0`
- `invalidStatusCount = 0`
- `missingMatchedExpertSnapshotCount = 0`
- `completedWithoutClosedReasonCount = 0`
- `snapshotFlatMismatchCount = 0`

### 6. UI verification

Teacher-side:
- Open `/du/matchmaker`
- Submit a new request with title, expertise, priority, resource type, tags, and details
- Confirm the request appears immediately in the queue

Admin-side:
- Open `/du/matchmaker`
- Confirm queue chips show status, format, priority, and resource type
- Select a request and verify requester profile snapshot fields render
- Select a recommended expert and save the assignment
- Complete the request with a closed reason and confirm the timeline updates

### 7. Rollback note

If UI writes fail after deploy:
- revert to the previous frontend build or redeploy the prior hosting artifact
- restore the prior Firestore rules version
- do not rerun the backfill in write mode until rule errors are resolved
