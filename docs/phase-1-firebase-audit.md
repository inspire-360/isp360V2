# Phase 1 Audit: Firebase Data Structure and Dependency Report

Date: 2026-04-13
Project: `inspire-app`
Scope: local codebase audit of Firebase/Firestore structure, client read/write paths, rules, indexes, and production-readiness gaps

This document is the concrete output of Phase 1. It describes the current-state data contracts found in the codebase, the main dependency chains, the root problems that must be fixed before Phase 2, and the open checks that still require a live Firebase project audit.

## 1. Audit Scope and Evidence

The audit was derived from these primary modules:

- `src/pages/CourseRoom.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/MyCourses.jsx`
- `src/pages/AdminConsole.jsx`
- `src/pages/MemberControl.jsx`
- `src/hooks/useLearningDashboard.jsx`
- `src/hooks/useDuMemberData.js`
- `src/hooks/useVideoAnnotationBoard.js`
- `src/hooks/useInnovationBoard.js`
- `src/hooks/useResourceMarketplace.js`
- `src/hooks/useSupportTickets.jsx`
- `src/utils/duMemberInsights.js`
- `src/utils/presenceSync.js`
- `src/utils/teacherUserProfile.js`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/Profile.jsx`
- `src/utils/userRoles.js`
- `firestore.rules`
- `firestore.indexes.json`
- `functions/scripts/bootstrap-admin.mjs`

Important constraint:

- This audit is based on the repository state only.
- It does not include a live Firestore export, live index status, or current production document samples.
- A live-project verification pass is still required before Phase 2 rollout.

## 2. Current Firebase Topology

Observed collections and subcollections in active client code:

| Path | Current purpose | Current status |
| --- | --- | --- |
| `users/{uid}` | profile, role, admin identity, duplicated progress defaults | active |
| `users/{uid}/enrollments/{courseId}` | enrollment gate, progress summary, mission answers, reports, badges, analytics source | active and overloaded |
| `presence/{uid}` | online state, active path, heartbeat data | active |
| `videos/{videoId}` | admin video review overlay document | active, but secondary to enrollment-derived data |
| `videos/{videoId}/video_comments/{commentId}` | coaching comments on teaching videos | active |
| `innovations/{innovationId}` | innovation board cards | active for read/update, missing canonical create path |
| `experts/{expertId}` | expert directory | active |
| `match_requests/{requestId}` | expert matching requests | active |
| `sos_tickets/{ticketId}` | teacher support/SOS tickets | active |
| `sos_tickets/{ticketId}/messages/{messageId}` | SOS conversation messages | active |

Legacy or partial structures still present in rules:

| Path | Observation |
| --- | --- |
| `users/{uid}/sosCases/{caseId}` | allowed in rules, not used by current client flows |
| `duSosCases/{caseId}` | allowed in rules, not used by current client flows |

This indicates there are historical structures in the ruleset that are no longer aligned with the primary app data flow.

## 3. Current-State Data Contracts

### 3.1 `users/{uid}`

Observed writers:

- `src/pages/Register.jsx`
- `src/pages/Login.jsx`
- `src/pages/Profile.jsx`
- `functions/scripts/bootstrap-admin.mjs`
- `src/utils/repairTeacherProfiles.js`

Observed fields:

```text
uid
prefix
firstName
lastName
name
position
school
email
role
activePath
progress
progressPercent
status
photoURL
createdAt
updatedAt
lastLogin
pdpaAccepted
pdpaAcceptedAt
badges
lineUserId
updatedBy
```

Audit notes:

- The user document mixes profile fields with learning-progress defaults.
- Role casing is inconsistent at write time. Some flows write `"Teacher"` while normalization utilities expect lowercase `"teacher"`.
- `Profile.jsx` writes `updatedAt: new Date()` while other flows use `serverTimestamp()`.
- The admin bootstrap script writes a different shape than teacher registration flows.

### 3.2 `users/{uid}/enrollments/{courseId}`

Primary writer:

- `src/pages/CourseRoom.jsx`

Observed readers:

- `src/pages/Dashboard.jsx`
- `src/pages/MyCourses.jsx`
- `src/components/CourseGuard.jsx`
- `src/hooks/useLearningDashboard.jsx`
- `src/hooks/useDuMemberData.js`
- `src/pages/AdminConsole.jsx`
- `src/hooks/useVideoAnnotationBoard.js`
- `src/utils/duMemberInsights.js`

Observed fields:

```text
courseId
courseTitle
enrolledAt
createdAt
updatedAt
lastAccess
lastSavedAt
status
progress
progressPercent
completedLessons
completedLessonsCount
lessonCount
currentModuleIndex
activeModuleIndex
activeLessonIndex
activeModuleTitle
activeLessonId
activeLessonTitle
postTestAttempts
score
quizAttempts
quizCooldowns
missionResponses
moduleReports
earnedBadges
resetAt
resetBy
```

Audit notes:

- This document is currently both a summary record and a raw answer store.
- `missionResponses` is a nested map stored inside the enrollment document, which creates a doc-size and schema-drift risk.
- Timestamp formats are mixed across this contract:
  - Firestore `Timestamp`
  - JavaScript `Date`
  - ISO strings inside `missionResponses`
- Many readers apply fallback logic because the document contract is not stable enough to trust directly.

### 3.3 `presence/{uid}`

Primary writer:

- `src/utils/presenceSync.js`

Primary readers:

- `src/pages/Dashboard.jsx`
- `src/components/OnlineUsers.jsx`
- `src/hooks/useDuMemberData.js`

Observed fields:

```text
uid
name
role
photoURL
activePath
presenceState
isOnline
visibilityState
lastActive
lastActiveMs
lastSeen
lastSeenMs
updatedAt
updatedAtMs
sessionId
```

Audit notes:

- Presence uses both timestamp fields and millisecond mirrors.
- There is a direct Firestore write path and a REST keepalive path.
- This collection is structurally healthier than `enrollments`, but still depends on client-side timing and session discipline.

### 3.4 `videos/{videoId}` and `videos/{videoId}/video_comments/{commentId}`

Primary writer:

- `src/hooks/useVideoAnnotationBoard.js`

Source of video identity today:

- Derived from `users/{uid}/enrollments/{courseId}.missionResponses`

Observed `videos/{videoId}` fields:

```text
teacherId
teacherName
title
description
subject
schoolName
videoUrl
durationSeconds
reviewStatus
assignedCoachIds
submittedAt
updatedAt
lastCommentAt
lastCommentPreview
commentCount
```

Observed `video_comments` fields:

```text
videoId
teacherId
authorId
authorName
authorRole
body
timestampSeconds
createdAt
updatedAt
```

Audit notes:

- The review document is not the canonical source of the video; it is currently an overlay created by admin workflow.
- Video title and metadata are derived from teacher course mission responses at runtime.
- This explains why title/subject/school can be incomplete or inconsistent.

### 3.5 `innovations/{innovationId}`

Observed reader/updater:

- `src/hooks/useInnovationBoard.js`

Observed fields inferred from board normalization:

```text
teacherId
teacherName
teacherDisplayName
ownerName
schoolName
school
title
summary
description
focusArea
supportNeed
evidenceNote
tags
stage
createdAt
updatedAt
lastMovedAt
lastMovedById
lastMovedByName
```

Audit notes:

- The board can read and move innovation records.
- No canonical teacher-side create flow was found in the current client code.
- This is a data population problem, not just a rendering problem.

### 3.6 `experts/{expertId}` and `match_requests/{requestId}`

Primary reader/writer:

- `src/hooks/useResourceMarketplace.js`
- `src/utils/seedExpertsDirectory.js`

Observed `match_requests` fields:

```text
requesterId
requesterName
requesterRole
schoolName
requestTitle
desiredExpertise
preferredFormat
requestDetails
status
createdAt
updatedAt
matchedExpertId
matchedExpertName
matchedExpertTitle
matchedExpertPrimaryExpertise
matchedByAdminId
matchedByAdminName
matchedAt
completedAt
adminNote
latestUpdateText
```

Audit notes:

- This model is workable, but it is still a standalone matching flow.
- It is not yet connected to canonical teacher needs from enrollments or innovations.

### 3.7 `sos_tickets/{ticketId}` and `messages`

Primary reader/writer:

- `src/hooks/useSupportTickets.jsx`

Observed `sos_tickets` fields:

```text
requesterId
requesterDisplayName
requesterRole
topic
mainCategory
subCategory
urgencyLevel
location
details
contactInfo
isConfidential
status
assignedTo
createdAt
updatedAt
lastMessageAt
lastMessagePreview
lastMessageAuthorId
lastMessageAuthorRole
closedAt
messageCount
```

Audit notes:

- This flow is comparatively well structured.
- It already uses a parent document plus message subcollection.
- It is a strong reference pattern for future refactors in enrollments and video review.

## 4. Reader/Writer Matrix

| Domain | Primary write path | Primary read path | Audit finding |
| --- | --- | --- | --- |
| User profile | `Register.jsx`, `Login.jsx`, `Profile.jsx`, admin bootstrap | `AuthContext.jsx`, `MemberControl.jsx`, `OnlineUsers.jsx` | multiple write shapes, inconsistent timestamps and role values |
| Enrollment progress | `CourseRoom.jsx` | dashboard, my courses, course guard, member control, admin export, video board | single overloaded doc feeds too many systems |
| Mission answers | `CourseRoom.jsx` inside `missionResponses` map | admin export, analytics, video board | raw answers are buried inside enrollment summary doc |
| Presence | `presenceSync.js` | dashboard, member control, online users | healthy but still client-driven |
| Video review | `useVideoAnnotationBoard.js` overlay doc creation | `VideoAnnotation` board and comments | review doc exists, but canonical source still enrollment mission data |
| Innovation board | no clear canonical teacher create path found | `useInnovationBoard.js` | board is downstream of missing data creation |
| Expert matching | `useResourceMarketplace.js` | same hook and UI | okay as isolated workflow, not integrated with teacher need signals |
| SOS support | `useSupportTickets.jsx` | same hook and admin workspace | best current example of parent/subcollection separation |

## 5. System Dependency Map

Current dependency chains observed in code:

```text
users -> AuthContext -> role gates -> admin pages / teacher pages
users/{uid}/enrollments/{courseId} -> Dashboard
users/{uid}/enrollments/{courseId} -> MyCourses
users/{uid}/enrollments/{courseId} -> CourseGuard
users/{uid}/enrollments/{courseId} -> LearningProgressDashboard
users/{uid}/enrollments/{courseId} -> MemberControl
users/{uid}/enrollments/{courseId}.missionResponses -> Admin CSV export
users/{uid}/enrollments/{courseId}.missionResponses -> VideoAnnotation metadata
presence -> Dashboard pulse / OnlineUsers / MemberControl
innovations -> InnovationBoard
experts + match_requests -> ResourceMatchmaker
sos_tickets + messages -> SupportTicketWorkspace
```

Critical architecture observation:

- `users/{uid}/enrollments/{courseId}` is the densest dependency hub in the system and is currently the highest-risk document contract.

## 6. Root Findings by Problem Type

### 6.1 Data Structure Problems

1. Enrollment documents are overloaded.
   - The same document stores enrollment state, progress summary, badge/report state, and raw mission payloads.
   - This is the main root-system problem.

2. User documents contain duplicated learning state.
   - `progress`, `progressPercent`, and `status` exist on the user profile even though progress actually belongs to enrollments.

3. Timestamp formats are inconsistent.
   - The codebase mixes `serverTimestamp()`, `new Date()`, ISO strings, and numeric timestamp mirrors.

4. Innovation records have no confirmed canonical producer.
   - The board reads `innovations`, but the repo does not show a teacher workflow that creates those records.

5. Video review docs are secondary, not canonical.
   - They are created from derived enrollment data instead of from a dedicated teacher submission record.

### 6.2 Query and Data-Binding Problems

1. Multiple screens read the same data with different fallback logic.
   - `useLearningDashboard.jsx`
   - `useDuMemberData.js`
   - `Dashboard.jsx`
   - `MyCourses.jsx`
   - `duMemberInsights.js`

2. Admin/member dashboards subscribe to broad realtime collections.
   - `collection(db, "users")`
   - `collectionGroup(db, "enrollments")`
   - `collection(db, "presence")`

3. Admin export depends on nested `missionResponses`.
   - Any future schema change must include a migration strategy for export and analytics tools.

4. Video metadata rendering depends on heuristic field lookup across multiple mission IDs.

### 6.3 UI/UX Surface Problems Caused by Data Contracts

1. Member Control appears incomplete because it tries to stitch profile, presence, and enrollment data from independently unstable shapes.
2. Video review cannot consistently render titles because there is no canonical video submission document.
3. Innovation Board can render only what exists in `innovations`, and that upstream creation path is missing or external.
4. Expert matching UX issues are partly downstream of data isolation from actual teacher need signals.

### 6.4 Role and Admin Logic Problems

1. Role writes are inconsistent.
   - Some create flows write `Teacher`.
   - Reader utilities normalize to lowercase.

2. Admin bootstrap uses a separate write contract.
   - It does not follow the same profile builder used by teacher registration.

3. Rules rely on Firestore role values.
   - If role normalization drifts, access behavior can drift with it.

4. There are legacy rule paths still present for old SOS structures.

### 6.5 Stability and Production-Readiness Problems

1. There is no shared repository/service layer for Firebase access.
2. There are no app-level automated tests in the repo for these Firebase flows.
3. `firestore.indexes.json` only defines indexes for:
   - `match_requests`
   - `sos_tickets`
4. No composite index is declared for the heavy `collectionGroup("enrollments")` usage or likely future innovation/video queries.
5. Live production config still needs verification against the repo.

## 7. Realtime vs On-Demand Audit

### 7.1 Current Realtime Usage

Current code uses realtime listeners for:

- `users`
- `collectionGroup("enrollments")`
- `presence`
- `videos`
- `video_comments`
- `innovations`
- `experts`
- `match_requests`
- `sos_tickets`
- `sos_tickets/{ticketId}/messages`

### 7.2 Audit Assessment

Keep realtime:

- authenticated user profile in `AuthContext`
- active course enrollment in `CourseRoom`
- active presence widgets
- active SOS ticket thread
- active video comment thread

Move to on-demand or aggregated reads:

- full member roster with all enrollments
- admin-wide learning summary
- large innovation boards once data grows
- expert directory if it becomes large
- analytics/export workloads

Reason:

- Broad realtime listeners on top-level `users` and `collectionGroup("enrollments")` do not scale cleanly for admin views.

## 8. Rules and Indexes Audit

### 8.1 Rules

Observed protected domains in `firestore.rules`:

- `users`
- `users/{uid}/enrollments`
- `presence`
- `videos`
- `video_comments`
- `experts`
- `match_requests`
- `innovations`
- `sos_tickets`
- `sos_tickets/messages`

Audit findings:

- The ruleset is broader than the currently active client data model.
- Legacy SOS paths still exist.
- Enrollment subcollection writes are permissive for owner/admin, which is workable today but will need tightening if raw mission data is split into separate subcollections.

### 8.2 Indexes

Current `firestore.indexes.json` contains only:

- `match_requests(requesterId, updatedAt desc)`
- `sos_tickets(requesterId, createdAt desc)`

Audit findings:

- The repo does not currently declare indexes for the highest-risk query patterns.
- Future Phase 2 and Phase 3 work will need explicit indexes for:
  - enrollment summary queries
  - admin aggregate queries
  - innovation board queries
  - video comment ordering

## 9. High-Priority Findings to Lock Before Phase 2

### P0

1. Define `users/{uid}` as profile-only source of truth.
2. Define `users/{uid}/enrollments/{courseId}` as summary-only source of truth.
3. Plan the extraction of `missionResponses` into a dedicated subcollection.
4. Standardize role values to lowercase canonical values.
5. Standardize timestamps to Firestore `Timestamp` fields for persisted records.

### P1

1. Introduce repository/service modules so screens stop querying Firestore directly.
2. Define canonical creation flow for `innovations`.
3. Define canonical creation flow for video review source documents.
4. Replace admin broad realtime reads with aggregate or paginated reads.

### P2

1. Remove or explicitly archive legacy rule paths that are no longer used.
2. Add emulator tests for rules and key data flows.
3. Add data migration and backfill scripts before schema cutover.

## 10. Phase 2 Prerequisites

Phase 2 should not begin until these decisions are approved:

- Approved canonical user profile schema
- Approved canonical enrollment summary schema
- Approved mission response subcollection schema
- Approved role vocabulary
- Approved timestamp format policy
- Decision on whether video/innovation sync is done by Cloud Functions or explicit client writes
- Decision on admin summary strategy: live aggregate docs vs heavy client queries

## 11. Live Firebase Verification Checklist

These checks still need to be executed against the real project:

1. Export representative `users` documents for each role:
   - super admin
   - DU admin
   - teacher
   - student
2. Export representative enrollment documents from:
   - teacher course
   - student course
   - completed enrollment
   - partially completed enrollment
3. Confirm whether `innovations` currently contains production data and identify its producer.
4. Confirm whether `videos` documents exist before admin review or only after admin touches the screen.
5. Compare live indexes with `firestore.indexes.json`.
6. Confirm whether any production clients still write to legacy SOS paths.
7. Measure document size of large enrollment records with dense `missionResponses`.

## 12. Phase 1 Exit Summary

Phase 1 audit confirms that the central system problem is not a single broken screen. The core issue is that the app does not yet have a stable, canonical Firebase data contract.

The highest-risk contract is:

- `users/{uid}/enrollments/{courseId}`

The highest-risk missing flows are:

- canonical `innovations` creation
- canonical video submission metadata

The highest-risk architectural gap is:

- no shared repository/service layer between Firebase and UI hooks/pages

Phase 2 should now focus on schema normalization, repository extraction, and data ownership boundaries before fixing downstream dashboards one by one.
