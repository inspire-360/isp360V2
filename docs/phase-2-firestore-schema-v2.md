# Phase 2 Design: Firestore Schema v2 and Data Relationships

Date: 2026-04-13
Project: `inspire-app`
Depends on: [phase-1-firebase-audit.md](C:/Users/401ms/Desktop/inspire-pwa/inspire-pwa/inspire-app/docs/phase-1-firebase-audit.md)

This document defines the target Firebase/Firestore data model that should replace the current overloaded contracts identified in Phase 1.

## 1. Design Goals

Schema v2 is designed to achieve these outcomes:

1. Separate profile data from learning state.
2. Separate enrollment summary data from raw mission answers.
3. Make downstream systems read from stable summary documents instead of reconstructing data ad hoc.
4. Define one canonical write owner for each collection.
5. Reduce broad realtime reads for admin views.
6. Make future Cloud Functions, rules, and indexes predictable.

## 2. Non-Negotiable Design Rules

These rules should be treated as architecture constraints:

1. `users/{uid}` is profile and identity only.
2. `users/{uid}/enrollments/{courseId}` is enrollment summary only.
3. Raw mission answers must not be stored as a large nested map on the enrollment summary document.
4. Every downstream collection must be traceable back to a canonical source document.
5. Persisted timestamps should be Firestore `Timestamp` values, not mixed `Date` and ISO strings.
6. Client pages should not decide schema interpretation independently; repository/service modules must own that logic.

## 3. Canonical Collections in Schema v2

## 3.1 `users/{uid}`

Purpose:

- identity
- role
- profile
- membership lifecycle

Canonical writer:

- auth registration flow
- social login bootstrap flow
- profile edit flow
- admin bootstrap or admin profile patch flow

Canonical readers:

- `AuthContext`
- route guards
- member control
- admin console identity views
- expert matching request snapshots

Proposed shape:

```text
users/{uid}
  uid: string
  role: "admin" | "teacher" | "learner"
  name: string
  prefix: string
  firstName: string
  lastName: string
  email: string
  photoURL: string
  school: string
  position: string
  activePath: string
  memberStatus: "active" | "inactive" | "suspended"
  sourceProvider: "email" | "google" | "line" | "admin_bootstrap"
  profileVersion: number
  pdpaAccepted: boolean
  pdpaAcceptedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp
  updatedBy: string
```

Fields to remove from `users/{uid}` as source of truth:

- `progress`
- `progressPercent`
- `status`
- `badges`

Reason:

- these belong to one or more enrollments, not to the user profile globally

## 3.2 `users/{uid}/enrollments/{courseId}`

Purpose:

- one compact summary per user per course
- fast UI reads for course cards, dashboard, member control, and admin summary jobs

Canonical writer:

- enrollment summary service
- optionally Cloud Function denormalizer after mission response writes

Canonical readers:

- `Dashboard`
- `MyCourses`
- `CourseGuard`
- `MemberControl`
- admin summary jobs

Proposed shape:

```text
users/{uid}/enrollments/{courseId}
  courseId: string
  courseTitle: string
  courseType: "teacher" | "student" | "other"
  status: "not_started" | "active" | "completed"
  progressPercent: number
  completedLessonsCount: number
  lessonCount: number
  activeModuleIndex: number
  activeLessonIndex: number
  activeLessonId: string
  activeModuleTitle: string
  activeLessonTitle: string
  score: number
  earnedBadgeIds: string[]
  reportCardVersion: number
  summaryVersion: number
  enrolledAt: Timestamp
  lastAccessAt: Timestamp
  lastSavedAt: Timestamp
  completedAt: Timestamp | null
  resetAt: Timestamp | null
  resetBy: string
  sourceUpdatedAt: Timestamp
```

Fields to move out of enrollment summary:

- `missionResponses`
- `moduleReports`
- `quizAttempts`
- `quizCooldowns`

Reason:

- these are raw or detailed operational records and should not be bundled into the summary contract

## 3.3 `users/{uid}/enrollments/{courseId}/mission_responses/{missionId}`

Purpose:

- canonical raw mission answer record
- per-mission save state
- source for admin export, video sync, innovation sync, and analytics

Canonical writer:

- mission response service called from `CourseRoom`

Canonical readers:

- export jobs
- analytics jobs
- video sync
- innovation sync
- detailed learner review views

Proposed shape:

```text
users/{uid}/enrollments/{courseId}/mission_responses/{missionId}
  missionId: string
  moduleId: string
  lessonId: string
  courseId: string
  saveState: "draft" | "submitted"
  responseVersion: number
  responseData: map
  submissionMeta: map
  derivedTags: string[]
  submittedAt: Timestamp | null
  updatedAt: Timestamp
  updatedBy: string
```

Notes:

- `responseData` is the only flexible payload area in this record
- everything outside `responseData` should stay structurally stable

## 3.4 `users/{uid}/enrollments/{courseId}/module_reports/{moduleId}`

Purpose:

- module-level narrative or computed report output

Canonical writer:

- reporting service or Cloud Function

Canonical readers:

- learning dashboard drill-down
- admin export/reporting

Proposed shape:

```text
users/{uid}/enrollments/{courseId}/module_reports/{moduleId}
  moduleId: string
  courseId: string
  score: number
  reportData: map
  generatedAt: Timestamp
  reportVersion: number
```

## 3.5 `presence/{uid}`

Purpose:

- near-real-time activity and session heartbeat

Canonical writer:

- presence sync utility

Canonical readers:

- online widgets
- member control
- admin pulse panels

Proposed shape:

```text
presence/{uid}
  uid: string
  name: string
  role: "admin" | "teacher" | "learner"
  photoURL: string
  activePath: string
  presenceState: "online" | "away" | "offline"
  isOnline: boolean
  sessionId: string
  lastActiveAt: Timestamp
  lastSeenAt: Timestamp
  updatedAt: Timestamp
  updatedAtMs: number
```

Allowed mixed field:

- `updatedAtMs` can stay if needed for client heartbeat comparisons

## 3.6 `videos/{videoId}`

Purpose:

- canonical teaching-video review record for DU/admin workflows

Canonical writer:

- Cloud Function triggered from mission response submit
- or explicit review source sync service if functions are deferred temporarily

Canonical readers:

- video annotation board
- admin coaching views

Proposed shape:

```text
videos/{videoId}
  videoId: string
  teacherId: string
  courseId: string
  enrollmentPath: string
  sourceMissionId: string
  sourceResponsePath: string
  title: string
  description: string
  subject: string
  schoolName: string
  videoUrl: string
  durationSeconds: number | null
  reviewStatus: "pending_feedback" | "coaching" | "reviewed"
  assignedCoachIds: string[]
  commentCount: number
  lastCommentAt: Timestamp | null
  lastCommentPreview: string
  submittedAt: Timestamp
  updatedAt: Timestamp
  syncVersion: number
```

Important ownership rule:

- `videos/{videoId}` must become canonical for review metadata
- the board should no longer build title or subject by heuristically reading enrollment mission maps during render

## 3.7 `videos/{videoId}/video_comments/{commentId}`

Purpose:

- comment thread on one teaching video

Canonical writer:

- admin coaching workflow

Proposed shape:

```text
videos/{videoId}/video_comments/{commentId}
  commentId: string
  videoId: string
  teacherId: string
  authorId: string
  authorName: string
  authorRole: "admin"
  body: string
  timestampSeconds: number
  createdAt: Timestamp
  updatedAt: Timestamp
```

## 3.8 `innovations/{innovationId}`

Purpose:

- canonical innovation portfolio record per teacher submission

Canonical writer:

- Cloud Function from mission response submit
- or explicit publish action if the product wants teacher confirmation before board exposure

Canonical readers:

- innovation board
- admin innovation monitoring
- future showcase/reporting screens

Proposed shape:

```text
innovations/{innovationId}
  innovationId: string
  teacherId: string
  courseId: string
  enrollmentPath: string
  sourceMissionId: string
  sourceResponsePath: string
  title: string
  summary: string
  description: string
  focusArea: string
  supportNeed: string
  evidenceNote: string
  tags: string[]
  schoolName: string
  teacherName: string
  stage: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastMovedAt: Timestamp | null
  lastMovedById: string
  lastMovedByName: string
  syncVersion: number
```

Important ownership rule:

- every innovation card must be traceable back to one source response or one explicit publish action

## 3.9 `experts/{expertId}`

Purpose:

- expert directory with searchable metadata

Canonical writer:

- admin seed/update workflow

Proposed shape:

```text
experts/{expertId}
  expertId: string
  displayName: string
  title: string
  organization: string
  primaryExpertise: string
  expertiseTags: string[]
  serviceModes: string[]
  region: string
  bio: string
  contactEmail: string
  contactLine: string
  isActive: boolean
  capacityStatus: "available" | "limited" | "paused"
  createdAt: Timestamp
  updatedAt: Timestamp
```

## 3.10 `match_requests/{requestId}`

Purpose:

- teacher request lifecycle for expert/resource support

Canonical writer:

- teacher create flow
- admin match/complete flow

Proposed shape:

```text
match_requests/{requestId}
  requestId: string
  requesterId: string
  requesterRole: "teacher"
  requesterName: string
  requesterProfileSnapshot: map
  schoolName: string
  requestTitle: string
  requestDetails: string
  desiredExpertise: string
  needTags: string[]
  preferredFormat: "online" | "onsite" | "hybrid"
  status: "pending_match" | "matched" | "completed"
  matchedExpertId: string
  matchedExpertSnapshot: map
  matchedByAdminId: string
  matchedByAdminName: string
  matchedAt: Timestamp | null
  completedAt: Timestamp | null
  adminNote: string
  latestUpdateText: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

## 3.11 `sos_tickets/{ticketId}` and `messages`

Purpose:

- support request parent record
- conversation message thread

Canonical writer:

- teacher create flow
- teacher/admin message flow
- admin triage flow

Keep current structure with cleanup only:

- standardize timestamps
- add optional audit metadata
- remove legacy duplicate SOS structures later

## 3.12 `admin_aggregates/{docId}`

Purpose:

- denormalized admin summary documents to avoid heavy broad listeners

Canonical writer:

- Cloud Functions only

Initial documents to create:

```text
admin_aggregates/learning_summary
admin_aggregates/member_summary
admin_aggregates/video_summary
admin_aggregates/innovation_summary
admin_aggregates/sos_summary
```

Purpose of each:

- lightweight realtime admin overview
- fast KPI cards
- reduced `collectionGroup("enrollments")` pressure in admin UI

## 4. Relationship Map

```text
users
  -> enrollments
    -> mission_responses
    -> module_reports

mission_responses
  -> videos
  -> innovations
  -> admin exports

users + enrollments + presence
  -> member control
  -> learning dashboard

experts + match_requests
  -> resource matchmaker

sos_tickets + messages
  -> DU support workspace

all operational collections
  -> admin_aggregates
```

## 5. Ownership and Write Boundaries

Every collection should have one primary ownership rule:

| Collection | Primary writer | Secondary writer allowed | Notes |
| --- | --- | --- | --- |
| `users` | auth/profile/admin flows | none | profile contract only |
| `enrollments` summary | enrollment summary service | Cloud Function summary updater | no raw mission blobs |
| `mission_responses` | mission response service | none | raw source of truth |
| `module_reports` | report generator | none | derived |
| `presence` | presence sync utility | none | realtime session data |
| `videos` | Cloud Function sync | temporary admin sync service during transition | derived canonical review doc |
| `video_comments` | admin coach flow | none | child thread |
| `innovations` | Cloud Function sync or explicit publish service | admin stage updates | no direct board-only create |
| `experts` | admin seeding/admin edit | none | directory |
| `match_requests` | teacher create + admin lifecycle | none | workflow contract |
| `sos_tickets` | teacher create + admin lifecycle | none | workflow contract |
| `admin_aggregates` | Cloud Functions | none | read-only to clients |

## 6. Deprecated Fields and Structures

These should be marked deprecated in rollout planning:

| Path | Deprecated data |
| --- | --- |
| `users/{uid}` | `progress`, `progressPercent`, `status`, `badges` as source of truth |
| `users/{uid}/enrollments/{courseId}` | `missionResponses`, `moduleReports`, `quizAttempts`, `quizCooldowns` |
| rules | `users/{uid}/sosCases/*`, `duSosCases/*` if live verification confirms no usage |

## 7. Query Strategy by Screen

Use realtime:

- `AuthContext` for current user profile
- `CourseRoom` for current enrollment summary and current mission response
- `OnlineUsers` and small presence widgets
- active video comment thread
- active SOS ticket thread
- small `admin_aggregates` documents

Use on-demand or paginated fetch:

- member roster list
- admin exports
- expert directory seed or bulk browse
- large innovation boards
- analytics drill-down and historical reporting

Reason:

- admin-facing broad live listeners create unnecessary read pressure and scale poorly

## 8. Cloud Functions Responsibility in Schema v2

Cloud Functions should own these derived writes:

1. Update enrollment summary after mission response submit.
2. Create or update `videos/{videoId}` from teaching-video source responses.
3. Create or update `innovations/{innovationId}` from innovation source responses.
4. Recompute admin aggregate summary documents.
5. Optionally normalize provider-created profiles after auth bootstrap.

Client-only writes that should remain client-owned:

1. profile edits
2. presence heartbeats
3. expert match request creation
4. SOS ticket create and messaging
5. admin stage changes and coaching comments

## 9. Rules and Index Implications

Rules must be updated to reflect:

- read access on `mission_responses`
- separate permissions for summary vs raw response data
- Cloud Function-only writes to derived collections like `admin_aggregates`

Indexes likely required after migration:

- enrollment summary collection group by `courseId`, `status`, `lastSavedAt`
- `videos` by `reviewStatus`, `updatedAt`
- `innovations` by `stage`, `updatedAt`
- `match_requests` by `status`, `updatedAt`
- `video_comments` by `timestampSeconds`

## 10. Acceptance Criteria for Schema v2 Approval

Schema v2 is ready to implement when:

1. Every downstream screen can point to one canonical source collection.
2. No major screen depends on `missionResponses` nested inside enrollment summary.
3. User profile contract no longer contains global progress state.
4. Video board and innovation board each have an explicit upstream producer.
5. The service/repository layer plan is approved alongside this schema.
