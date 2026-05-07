# Phase 7: Reliable Online Presence

## Objective

Replace fragile Firestore heartbeat-only presence with a non-critical Realtime Database based Presence V2 layer. Presence V2 supports multi-tab, network drops, browser crashes, stale cleanup, and Firestore aggregation for the admin console.

## Current Risk

- The legacy presence flow writes a single Firestore boolean-like state from the client.
- Browser crashes and network drops can leave ghost online records.
- Multi-tab usage can overwrite a single session state.
- Presence failure must not affect login, register, profile update, or core app navigation.

## Proposed Solution

- Add Realtime Database connection documents under `status/{uid}/connections/{connectionId}`.
- Use `.info/connected` and `onDisconnect().remove()` for automatic disconnect cleanup.
- Store one connection per tab/device.
- Aggregate RTDB connections into Firestore summaries for existing admin UI:
  - `users/{uid}.presence`
  - `members_v2/{uid}.presence`
  - compatibility document `presence/{uid}`
- Keep legacy Firestore heartbeat running during rollout.
- Gate client Presence V2 behind `VITE_PRESENCE_V2_ENABLED` and `VITE_FIREBASE_DATABASE_URL`.
- If RTDB is missing or fails, Presence V2 silently falls back and the app continues.

## Files To Change

- `src/lib/firebase.js`
- `src/hooks/usePresence.jsx`
- `src/services/firebase/repositories/presenceV2Repository.js`
- `src/services/firebase/repositories/memberV2Repository.js`
- `src/pages/MemberManagementV2.jsx`
- `src/components/admin/MemberDetailDrawerV2.jsx`
- `src/utils/presenceV2Flags.js`
- `functions/index.js`
- `database.rules.json`
- `firebase.json`

## Firebase Resources Affected

- Realtime Database:
  - `status/{uid}/connections/{connectionId}`
- Firestore:
  - `users/{uid}.presence`
  - `members_v2/{uid}.presence`
  - `presence/{uid}`
  - `systemHealth/presenceV2`
- Cloud Functions:
  - `aggregatePresenceV2Connection`
  - `cleanupPresenceV2StaleConnections`
  - `cleanupPresenceV2StaleConnectionsNow`

## Data Impact

- Additive fields only.
- No existing profile, role, status, usage, login, register, or auth data is removed.
- Aggregator does not create missing `users/{uid}` or `members_v2/{uid}` documents.
- Stale cleanup removes only RTDB connection nodes older than the cleanup threshold.

## User Impact

- Presence V2 is invisible to users.
- If RTDB fails, users can still use the app normally.
- Admin console can display `Online`, `Idle`, `Offline`, `Unknown`, and `Stale`.

## Security Impact

- Clients can write only their own RTDB connection path.
- Clients do not write Firestore presence summaries.
- Backend aggregation uses Admin SDK.
- Cleanup write callable requires `super_admin` and explicit confirm token.
- Presence data is treated as non-critical operational metadata.

## Test Plan

Required before production:

- With flag off, no RTDB writes occur.
- With flag on and valid RTDB URL, one tab creates one connection node.
- Opening two tabs creates two connection nodes for the same UID.
- Closing one tab removes only that tab connection.
- Closing all tabs removes all connections through `onDisconnect` or cleanup.
- Browser refresh creates a new connection and removes the old connection.
- Network drop changes aggregated state to `stale` and cleanup later sets `offline`.
- Hidden/background tab aggregates as `Idle`.
- Admin console shows `Online`, `Idle`, `Offline`, `Unknown`, and `Stale`.
- Login/register/profile update still work if RTDB is unavailable.
- RTDB rules reject writes to another user's `status/{uid}` path.
- Cleanup dry run reports stale connections without deleting.
- Cleanup write mode requires `PHASE7_PRESENCE_CLEANUP`.

Optional after production:

- Add dashboard metric for RTDB connection count.
- Add alert if `systemHealth/presenceV2.lastCheckedAt` is stale.
- Add device label normalization instead of raw user agent.

## Rollback Plan

- Set `VITE_PRESENCE_V2_ENABLED=false`.
- Leave legacy Firestore heartbeat in place.
- Admin UI falls back to existing `presence` and `lastActiveAt` values.
- Do not delete RTDB data immediately; let scheduled cleanup remove stale connection nodes.
- If needed, undeploy only Presence V2 functions from staging or production.

## Implementation Steps

1. Create or enable Realtime Database in staging.
2. Deploy `database.rules.json` to staging.
3. Deploy Presence V2 functions to staging.
4. Add staging env values:
   - `VITE_PRESENCE_V2_ENABLED=true`
   - `VITE_FIREBASE_DATABASE_URL=<staging RTDB URL>`
   - `VITE_PRESENCE_V2_HEARTBEAT_MS=30000`
5. Test one-user single-tab presence.
6. Test multi-tab behavior.
7. Test network drop and browser close behavior.
8. Test cleanup dry run.
9. Test cleanup write mode on staging only.
10. Keep production flag off until staging tests pass.
