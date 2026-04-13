# Phase 3 Mission Response Cutover Checklist

เอกสารนี้ใช้สำหรับ cutover จาก legacy nested field

`users/{uid}/enrollments/{courseId}.missionResponses`

ไปยัง canonical subcollection

`users/{uid}/enrollments/{courseId}/mission_responses/{missionId}`

## Scope

- ใช้กับคอร์ส `course-teacher` เป็นลำดับแรก
- ใช้กับระบบที่อ่าน mission data ต่อจาก enrollment ได้แก่
  - Course Room
  - Member Control
  - DU pain-point analytics
  - Admin CSV export
  - Video Annotation Board

## Current Technical State

- Client ฝั่งใหม่หยุดเขียน nested `missionResponses` แล้ว
- Client ยังมี legacy read fallback ชั่วคราวใน `CourseRoom`
- DU/Admin/Video readers อ่าน canonical path ก่อน แล้ว merge fallback กับ legacy data ถ้ายังไม่ backfill ครบ
- Firestore rules รองรับ `mission_responses` แล้วใน repo แต่ยังต้อง deploy ขึ้น project จริง

## Pre-Cutover Checklist

1. ยืนยันว่า service account สำหรับ Firebase project ถูกต้อง
2. export snapshot หรือ backup ของ collection `users`
3. ยืนยัน branch/build ที่จะ deploy ว่ามีไฟล์ต่อไปนี้แล้ว
   - `firestore.rules`
   - `functions/scripts/backfill-mission-responses.mjs`
   - `functions/scripts/verify-mission-response-backfill.mjs`
4. ยืนยันว่าทีมเข้าใจว่า dry-run เป็น default ของ backfill script
5. เตรียมรายชื่อ user หรือ course ที่จะใช้เป็น sample verification

## Recommended Cutover Order

1. Build แอปจาก branch ปัจจุบัน
2. Deploy Firestore rules ก่อน
3. รัน dry-run backfill
4. รัน verify ก่อน write เพื่อดู baseline mismatch
5. รัน backfill แบบ write
6. รัน verify หลัง write
7. ถ้าไม่มี missing diff แล้วค่อย prune legacy field
8. รัน verify หลัง prune อีกครั้ง
9. ทำ smoke test บน UI จริง

## Commands

### 1. Build

```powershell
npm run build
```

### 2. Deploy Firestore Rules

```powershell
firebase deploy --only firestore:rules
```

### 3. Dry Run Backfill

```powershell
npm run backfill-mission-responses -- --course-id course-teacher
```

ตัวอย่างเจาะผู้ใช้รายเดียว:

```powershell
npm run backfill-mission-responses -- --user-id USER_UID --course-id course-teacher
```

### 4. Verify Baseline

```powershell
npm run verify-mission-response-backfill -- --course-id course-teacher
```

### 5. Write Canonical Documents

```powershell
npm run backfill-mission-responses -- --course-id course-teacher --write true
```

### 6. Verify After Write

```powershell
npm run verify-mission-response-backfill -- --course-id course-teacher --strict true
```

### 7. Prune Legacy Nested Field

รันเมื่อ verify แล้วไม่พบ `missingInCanonical`

```powershell
npm run backfill-mission-responses -- --course-id course-teacher --write true --prune-legacy true
```

### 8. Fail CI/Runbook If Still Mismatched

```powershell
npm run verify-mission-response-backfill -- --course-id course-teacher --strict true --fail-on-diff true
```

## How To Read Verification Output

field สำคัญจาก `verify-mission-response-backfill`

- `scannedEnrollments`: จำนวน enrollment ที่ถูกตรวจ
- `enrollmentsWithLegacyResponses`: enrollment ที่ยังมี nested missionResponses
- `enrollmentsWithCanonicalResponses`: enrollment ที่มี subcollection แล้ว
- `exactMatches`: enrollment ที่ mission IDs และ payload ตรงกัน
- `mismatchedEnrollments`: enrollment ที่ยังมี diff
- `missingInCanonicalCount`: จำนวน mission ที่ยังมีใน legacy แต่ยังไม่เจอใน canonical
- `extraInCanonicalCount`: จำนวน mission ที่ canonical มีเพิ่มจาก legacy
- `payloadDiffCount`: จำนวน mission ที่ key ตรงกันแต่ payload ต่างกัน
- `mismatchSamples`: ตัวอย่าง enrollment ที่ยังต้องไล่ตรวจ

## Cutover Gate

ถอด legacy read fallback ได้เมื่อครบทั้งหมด:

1. `missingInCanonicalCount = 0`
2. `mismatchedEnrollments = 0` ในโหมด `--strict true` หรือมีเฉพาะ diff ที่ทีมยอมรับได้
3. Member Control ยังเห็น pain-point cloud ได้จากข้อมูลจริง
4. Admin export ได้จำนวน mission responses เทียบเท่าก่อน cutover
5. Video Annotation Board ยังเห็นชื่อวิดีโอและข้อมูลจาก mission ครบ
6. Teacher flow บันทึก mission ใหม่แล้วขึ้นที่ canonical path ทันที

## UI Smoke Tests After Cutover

### Teacher

1. เปิด Course Room
2. บันทึก mission draft
3. submit mission
4. refresh หน้า
5. reset mission ที่ reset ได้
6. reset course progress

ผลที่ต้องได้:

- mission responses ยังแสดงอยู่หลัง refresh
- ไม่มีข้อมูลหายระหว่าง draft/submitted/reset
- reset course ล้าง canonical mission responses จริง

### DU Admin

1. เปิด Member Control
2. เปิดสมาชิกที่มีข้อมูล mission เก่า
3. ตรวจ pain-point cloud
4. reset learning

ผลที่ต้องได้:

- pain-point cloud ยังขึ้น
- reset learning ล้างทั้ง enrollment summary และ mission_responses

### Admin Console

1. export CSV
2. เทียบจำนวนแถวกับผล verify

ผลที่ต้องได้:

- CSV ยังออกครบ
- ไม่มี mission สำคัญหายหลัง prune

### Video Coach

1. เปิดหน้า video coach
2. ตรวจว่ารายการวิดีโอจาก module 4-5 ยังขึ้น
3. เพิ่มคอมเมนต์

ผลที่ต้องได้:

- title และ metadata ยังแสดงครบ
- การเพิ่มคอมเมนต์ยัง update review doc ได้

## Rollback Plan

ถ้า verify หลัง write พบ mismatch มากผิดปกติ:

1. หยุด prune legacy field ทันที
2. ใช้ข้อมูล nested `missionResponses` เป็น source สำรองต่อไป
3. เก็บ `mismatchSamples` จาก verify script
4. ตรวจเฉพาะ enrollment ที่มีปัญหา
5. แก้ normalization หรือ data anomalies ก่อน rerun backfill

ถ้า deploy rules แล้ว client อ่าน canonical path ไม่ได้:

1. ตรวจ Firebase project target
2. ตรวจว่ากำลัง deploy `firestore.rules` จาก branch ล่าสุดจริง
3. ใช้ owner/admin test account ไล่สิทธิ์กับ path
4. ถ้ายังไม่ผ่าน ให้ rollback rules deployment ก่อน

## Next Cleanup After Successful Cutover

เมื่อ cutover ผ่านครบแล้ว ให้ทำงานต่อดังนี้:

1. ลบ legacy read fallback ใน `CourseRoom`
2. ลบ logic merge legacy missionResponses ใน DU/Admin hooks
3. ลด code path ที่รองรับ nested `missionResponses`
4. เพิ่ม emulator tests สำหรับ owner/admin access ของ `mission_responses`
