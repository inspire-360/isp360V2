# Phase 3 Live Verification Matrix

เอกสารนี้ใช้เป็น matrix สำหรับตรวจระบบหลัง deploy rules, หลัง backfill write, และหลัง prune legacy field

## Verification Windows

### Window A: หลัง deploy rules

เป้าหมาย:

- owner/admin อ่าน canonical `mission_responses` ได้
- flow ใหม่ไม่ติด permission denied

### Window B: หลัง backfill write

เป้าหมาย:

- canonical docs ถูกสร้างครบ
- UI ทั้งหมดอ่าน canonical path ได้จริง
- legacy field ยังมีอยู่เป็น safety net

### Window C: หลัง prune legacy field

เป้าหมาย:

- UI ทุกหน้าทำงานได้โดยไม่ต้องพึ่ง nested `missionResponses`
- ไม่มี regression หลังลบ legacy field

## Command Matrix

### Summary Health

```powershell
npm run mission-response-cutover-health -- --course-id course-teacher
```

คาดหวัง:

- ก่อน backfill: มักเห็น `legacyOnlyEnrollments > 0`
- หลัง backfill write: ควรเห็น `legacyOnlyEnrollments = 0`
- หลัง prune: ควรเห็น `legacyFieldRemainingEnrollments = 0`

### Detailed Verify

```powershell
npm run verify-mission-response-backfill -- --course-id course-teacher --strict true
```

คาดหวัง:

- ก่อน prune: `missingInCanonicalCount = 0`
- หลัง prune: `mismatchedEnrollments = 0` หรือไม่มี diff ที่กระทบระบบ

## Page-by-Page Matrix

| Page / Flow | What to do | Expected after backfill | Expected after prune |
| --- | --- | --- | --- |
| Teacher Course Room | เปิดคอร์สครู, บันทึก mission draft, submit mission, refresh หน้า | ข้อมูล mission ไม่หาย, draft/submitted state คงอยู่ | เหมือนเดิมทั้งหมด |
| Teacher Course Reset | กด reset mission ที่ reset ได้ และ reset course ทั้งคอร์ส | canonical docs ถูกอัปเดต/ลบตาม action | ไม่มีข้อมูลค้างใน legacy field |
| Member Control | เปิดสมาชิกที่มี mission เก่า, ดู pain-point cloud, reset learning | pain-point cloud ยังขึ้นจากข้อมูลจริง | reset แล้ว pain-point หายตามข้อมูล canonical |
| Admin Console Export | export CSV คำตอบผู้ใช้ | จำนวนแถวสอดคล้องกับ verify script | ยัง export ได้แม้ไม่มี legacy field |
| Video Annotation Board | เปิดรายการวิดีโอ, ตรวจ title/description, เพิ่ม comment | metadata ยังขึ้นครบ | ยังขึ้นครบเหมือนเดิม |
| DU Dashboard / Learning Summary | เปิด dashboard และ member summary ที่ผูกกับ enrollment summary | progress/status ไม่ regression | ไม่ regression |

## Teacher Verification Script

### Draft and Submit

1. เข้าสู่ระบบเป็นครู
2. เปิด `/course/teacher`
3. กรอก mission หนึ่งรายการแบบ draft
4. refresh หน้า
5. submit mission เดิม
6. refresh หน้าอีกครั้ง

Expected:

- หลัง refresh รอบแรกยังเห็น draft response
- หลัง submit และ refresh รอบสองยังเห็น submitted response
- ไม่มี permission error ใน console

### Course Reset

1. เปิดคอร์สครูที่มี mission responses อยู่แล้ว
2. กด reset mission หนึ่งรายการ
3. กด reset course

Expected:

- mission ที่ reset ถูกล้างจริง
- หลัง reset course แล้ว mission responses หายจาก canonical path
- progress summary กลับค่าเริ่มต้นที่คาดไว้

## Member Control Verification Script

1. เปิด `/du/members`
2. เลือกสมาชิกที่มีข้อมูลจาก Module 1 Mission 1-2
3. ตรวจ pain-point cloud
4. กด reset learning
5. refresh หน้า

Expected:

- ก่อน reset เห็น pain-point cloud
- หลัง reset และ refresh pain-point ที่มาจาก mission responses ต้องหาย
- profile edit/save ยังทำงานได้

## Admin Console Verification Script

1. เปิด `/du/admin`
2. export CSV
3. เปิดไฟล์และสุ่มตรวจผู้ใช้ 3-5 คน
4. เทียบกับผล `verify-mission-response-backfill`

Expected:

- mission IDs สำคัญยังออกครบ
- ถ้าหลัง prune แล้ว CSV ยังต้องออกข้อมูลได้เหมือนก่อน prune

## Video Coach Verification Script

1. เปิด `/du/video-coach`
2. ตรวจว่ารายการวิดีโอจาก mission module 4-5 ยังแสดงครบ
3. เปิดวิดีโอหนึ่งรายการ
4. เพิ่ม comment ใหม่

Expected:

- title, teacher name, subject, school ยังแสดงครบ
- comment count เพิ่ม
- ไม่มี dependency กับ legacy nested field

## Readiness Criteria

ถือว่าพร้อม prune legacy field เมื่อ:

1. `mission-response-cutover-health` รายงาน `legacyOnlyEnrollments = 0`
2. `verify-mission-response-backfill --strict true` รายงาน `missingInCanonicalCount = 0`
3. Teacher flow ผ่าน
4. Member Control ผ่าน
5. Admin export ผ่าน
6. Video Coach ผ่าน

ถือว่าพร้อมลบ fallback code เมื่อ:

1. หลัง prune แล้ว `legacyFieldRemainingEnrollments = 0`
2. UI smoke ทุกหน้าไม่ regression
3. ไม่มี support ticket หรือ error ใหม่จาก permission/path mismatch

## Suggested Manual Rollout Sequence

1. Deploy `firestore.rules`
2. Run `mission-response-cutover-health`
3. Run dry-run backfill
4. Run write backfill
5. Run verify strict
6. Smoke test Teacher + Member Control + Admin + Video
7. Run prune
8. Run health summary อีกครั้ง
9. Smoke test ซ้ำ
10. เปิด task ถอด fallback code ในรอบถัดไป
