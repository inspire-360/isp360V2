# Phase 2 Execution Blueprint: Migration and Repository Plan

Date: 2026-04-13
Project: `inspire-app`
Depends on:

- [phase-1-firebase-audit.md](C:/Users/401ms/Desktop/inspire-pwa/inspire-pwa/inspire-app/docs/phase-1-firebase-audit.md)
- [phase-2-firestore-schema-v2.md](C:/Users/401ms/Desktop/inspire-pwa/inspire-pwa/inspire-app/docs/phase-2-firestore-schema-v2.md)

This document turns the schema design into an execution order the team can implement without breaking production flows.

## 1. Migration Strategy

The migration should happen in controlled waves, not as one large cutover.

Recommended migration mode:

- additive first
- dual-read temporarily
- dual-write only where unavoidable
- then remove deprecated fields after validation

## 2. Wave-by-Wave Rollout

## Wave 0: Guardrails Before Refactor

Goal:

- prepare the codebase so later changes do not multiply across screens

Tasks:

1. Create a Firebase service/repository layer folder.
2. Add central schema constants and collection-path helpers.
3. Add shared normalizers and mappers.
4. Add a feature flag or schema version switch for migration-safe reads.

Target folder structure:

```text
src/services/firebase/
  collections.js
  timestamps.js
  pathBuilders.js
  mappers/
    userMapper.js
    enrollmentSummaryMapper.js
    missionResponseMapper.js
    videoMapper.js
    innovationMapper.js
  repositories/
    userRepository.js
    enrollmentRepository.js
    missionResponseRepository.js
    presenceRepository.js
    videoRepository.js
    innovationRepository.js
    matchRequestRepository.js
    supportTicketRepository.js
    adminAggregateRepository.js
```

Files most affected:

- `src/hooks/useLearningDashboard.jsx`
- `src/hooks/useDuMemberData.js`
- `src/hooks/useVideoAnnotationBoard.js`
- `src/hooks/useInnovationBoard.js`
- `src/hooks/useResourceMarketplace.js`
- `src/hooks/useSupportTickets.jsx`
- `src/pages/CourseRoom.jsx`

## Wave 1: User Profile Contract Cleanup

Goal:

- stop expanding `users/{uid}` with learning-state duplication

Tasks:

1. Create `userRepository` with canonical profile read/write functions.
2. Refactor:
   - `Login.jsx`
   - `Register.jsx`
   - `Profile.jsx`
   - `AuthContext.jsx`
   - `bootstrap-admin.mjs`
3. Standardize role values to:
   - `admin`
   - `teacher`
   - `learner`
4. Rename `lastLogin` to `lastLoginAt` in new writes.
5. Keep backward-compatible reads for old fields during the transition.

Migration notes:

- old fields can remain in Firestore for a short period
- new reads must stop trusting `progress`, `progressPercent`, and `status` from `users/{uid}`

Definition of complete:

- all user creation/update flows write the same contract
- no screen derives learning progress from the user document

## Wave 2: Enrollment Summary and Mission Response Split

Goal:

- split overloaded enrollment documents into:
  - summary doc
  - raw mission subcollection

Tasks:

1. Create `enrollmentRepository` and `missionResponseRepository`.
2. Update `CourseRoom.jsx` so:
   - mission responses are written to `mission_responses/{missionId}`
   - enrollment summary is written separately
3. Add a transitional read adapter:
   - if `mission_responses` subcollection is empty, fallback to nested `missionResponses` map
4. Add summary recomputation helpers:
   - `progressPercent`
   - `completedLessonsCount`
   - `status`
   - active lesson/module fields

Temporary dual-read policy:

- `CourseRoom` can read from subcollection first, then fallback to nested map during migration
- admin export should be updated next to read from new subcollection first

Do not do this in Wave 2:

- do not rewrite every dashboard page at the same time
- first stabilize the writer path

Definition of complete:

- new mission submissions no longer increase the size of enrollment summary docs with nested answer blobs

## Wave 3: Dashboard, Member Control, and Admin Readers

Goal:

- make downstream readers consume one canonical summary contract

Tasks:

1. Refactor `Dashboard.jsx` and `MyCourses.jsx` to use `enrollmentRepository`.
2. Refactor `useLearningDashboard.jsx` to read canonical summaries only.
3. Refactor `useDuMemberData.js` and `MemberControl.jsx` to:
   - use paginated or scoped queries
   - stitch profile + presence + enrollment summary via shared mappers
4. Refactor admin export in `AdminConsole.jsx` to read:
   - summary from enrollment docs
   - raw answers from `mission_responses`

Compatibility policy:

- remove fallback logic from page-level code
- keep migration fallback only inside repositories

Definition of complete:

- dashboard, my courses, member control, and admin summary screens show the same progress values for the same user/course pair

## Wave 4: Video Review Canonicalization

Goal:

- stop deriving video review rows directly from enrollment render logic

Tasks:

1. Add `videoRepository`.
2. Introduce a sync job:
   - preferred: Cloud Function on mission response submit
   - fallback: explicit sync step in app service during temporary transition
3. Populate canonical video documents with:
   - source refs
   - title
   - subject
   - teacher info
   - school name
4. Refactor `useVideoAnnotationBoard.js` to read from `videos` as primary source.
5. Keep `video_comments` unchanged except for repository ownership.

Definition of complete:

- the video board can render correctly even if enrollment documents are not opened at the same time

## Wave 5: Innovation Canonicalization

Goal:

- define the missing producer for `innovations`

Tasks:

1. Add `innovationRepository`.
2. Decide product rule:
   - auto-create innovation on mission submit
   - or create on explicit teacher publish action
3. Backfill old innovation rows from historical mission responses where possible.
4. Refactor `useInnovationBoard.js` to trust `innovations` as canonical source.

Definition of complete:

- innovation board population no longer depends on manual seeding or hidden external writes

## Wave 6: Admin Aggregate Strategy

Goal:

- reduce broad realtime admin reads

Tasks:

1. Create `adminAggregateRepository`.
2. Add aggregate documents for:
   - learning summary
   - member summary
   - video summary
   - innovation summary
   - SOS summary
3. Refactor admin overview screens to use aggregate docs realtime and drill-downs on demand.

Definition of complete:

- admin dashboards stop relying on broad `collectionGroup("enrollments")` listeners for top-level KPIs

## 3. Repository Responsibilities

Each repository should own these concerns:

## `userRepository`

Responsibilities:

- get current user profile
- create bootstrap profile
- update editable profile fields
- normalize role values
- expose minimal DTO for UI

Should not do:

- compute learning progress

## `enrollmentRepository`

Responsibilities:

- read one enrollment summary
- read course enrollments for a user
- write summary updates
- compute normalized summary output for UI

Should not do:

- persist raw mission payloads directly

## `missionResponseRepository`

Responsibilities:

- read/write mission response documents
- handle draft vs submitted state
- provide admin export iterators
- expose migration fallback from old nested map

Should not do:

- render dashboard progress

## `presenceRepository`

Responsibilities:

- write presence heartbeats
- read scoped presence lists
- normalize stale/away/offline states

## `videoRepository`

Responsibilities:

- read canonical video review records
- ensure comment counts and review status updates are consistent
- map source refs to readable UI rows

Should not do:

- infer canonical data from random page state

## `innovationRepository`

Responsibilities:

- read innovation board data
- update stage
- map source response data to board cards during migration

## `matchRequestRepository`

Responsibilities:

- create match requests
- update match lifecycle
- normalize expert snapshot payloads

## `supportTicketRepository`

Responsibilities:

- create ticket
- read ticket list and message thread
- send messages
- admin triage updates

## `adminAggregateRepository`

Responsibilities:

- read compact admin KPI docs
- expose fallback empty states when aggregates are not available yet

## 4. Hook Refactor Map

Hook-by-hook migration order:

| Hook/Page | Current issue | First refactor target |
| --- | --- | --- |
| `CourseRoom.jsx` | overloaded direct writes | move writes into enrollment + mission response repositories |
| `useLearningDashboard.jsx` | broad realtime read and custom normalization | use enrollment summary repository |
| `useDuMemberData.js` | broad realtime `users + presence + enrollments` | use repository + scoped queries |
| `useVideoAnnotationBoard.js` | derives video rows from mission maps | use `videoRepository` |
| `useInnovationBoard.js` | board exists without canonical producer | use `innovationRepository` |
| `useResourceMarketplace.js` | direct collection access | use repositories after schema cleanup |
| `useSupportTickets.jsx` | already structured, mostly wrap in repository | low-risk migration |

## 5. Data Migration Plan

Recommended migration scripts:

## Script A: User Profile Backfill

Purpose:

- standardize role values
- set `profileVersion`
- rename or add `lastLoginAt`
- keep legacy fields temporarily for compatibility

## Script B: Enrollment Summary Backfill

Purpose:

- derive summary-only fields
- stamp `summaryVersion`
- separate out final canonical timestamps

## Script C: Mission Response Extraction

Purpose:

- iterate existing enrollment docs
- copy nested `missionResponses` into `mission_responses/{missionId}`
- stamp `responseVersion`
- record source migration metadata

## Script D: Video Backfill

Purpose:

- create `videos/{videoId}` from teaching-video mission responses
- attach source refs

## Script E: Innovation Backfill

Purpose:

- create `innovations/{innovationId}` from innovation-related mission responses where data exists

## Script F: Aggregate Rebuild

Purpose:

- populate `admin_aggregates/*`

## 6. Compatibility Layer Rules

During migration only:

1. repositories may fallback to old nested fields
2. page-level components must not implement their own fallbacks
3. every fallback path must log when it is used so removal can be planned

Recommended compatibility cutoff:

- remove fallback reads only after:
  - migration scripts finish
  - UAT passes
  - live project sample checks are clean

## 7. Firestore Rules and Index Work Order

Do rules and indexes in this order:

1. add new paths to rules
2. deploy new indexes
3. release dual-read repositories
4. run migration backfills
5. switch primary readers to new paths
6. remove deprecated write paths
7. clean old rules last

Reason:

- readers should never switch before the new rules and indexes are live

## 8. Production Safety Checklist

Before each migration wave:

1. export sample production docs
2. capture current read/write error rate
3. confirm rules and indexes deploy successfully
4. verify emulator tests for the touched collections
5. verify one teacher account and one admin account manually in staging or preview

After each migration wave:

1. compare old and new computed progress values
2. confirm member control counts still match
3. confirm admin export row count is stable
4. confirm no sudden spike in Firestore read usage

## 9. Immediate Implementation Sequence for the Next Coding Sprint

The recommended first sprint after this document:

1. create `src/services/firebase/` scaffolding
2. implement `userRepository`
3. implement `enrollmentRepository`
4. implement `missionResponseRepository`
5. refactor `CourseRoom.jsx` writer path
6. refactor `Dashboard.jsx` and `MyCourses.jsx`
7. add migration script stubs for user profile and mission response extraction

This order is important because:

- it stabilizes the highest-dependency contracts first
- it reduces repeated refactors across dashboard, member control, video board, and admin tools

## 10. Definition of Ready for Phase 3

You are ready to begin the next coding-heavy phase when:

1. the team approves schema v2
2. the service/repository layout is accepted
3. the migration-wave order is accepted
4. the repo has a place for shared Firebase access logic
5. live-project verification is scheduled or already completed
