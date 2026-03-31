# Firebase Connection & Role Assignment Audit

เอกสารนี้ออกแบบมาเพื่อตรวจสอบ 2 เรื่องหลักแบบมืออาชีพ:
1. การเชื่อมต่อฐานข้อมูล Firebase (Firestore + Realtime Database)
2. การกำหนดบทบาท (Role Assignment) ผ่าน Firebase Auth custom claims
3. สิทธิ์เข้า "หน้าเรียน" จาก role ของผู้ใช้

## สิ่งที่เพิ่มในโปรเจกต์
- สคริปต์ตรวจสอบอัตโนมัติ: `scripts/firebase-audit.mjs`
- ตัวอย่าง environment: `.env.example`
- คำสั่ง npm สำหรับรัน audit: `firebase:audit`, `firebase:audit:strict`

## ขั้นตอนใช้งาน

### 1) ติดตั้ง dependencies
```bash
npm install
```

### 2) ตั้งค่า environment
สามารถใช้ `.env.example` เป็นแม่แบบ แล้ว export ค่า environment ตามนี้:

- `FIREBASE_SERVICE_ACCOUNT_JSON` (จำเป็น)
- `FIREBASE_DATABASE_URL` (จำเป็น)
- `FIREBASE_PROJECT_ID` (ไม่บังคับ)
- `FIREBASE_TEST_UID` (ไม่บังคับ แต่แนะนำ ถ้าจะตรวจ role จริง)
- `FIREBASE_REQUIRED_ROLES` (ไม่บังคับ เช่น `admin,editor`)
- `FIREBASE_LEARNING_PAGE_ROLES` (ไม่บังคับ ค่าเริ่มต้นคือ `learner,teacher,admin`)

ตัวอย่างบน Linux/macOS:
```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
export FIREBASE_DATABASE_URL='https://<project-id>-default-rtdb.firebaseio.com'
export FIREBASE_TEST_UID='uid-to-check'
export FIREBASE_REQUIRED_ROLES='admin,editor'
```

### 3) รันการตรวจสอบ
```bash
npm run firebase:audit
```

ถ้าต้องการให้ CI/CD fail เมื่อมี check ไม่ผ่าน:
```bash
npm run firebase:audit:strict
```

## ความหมายผลลัพธ์
สคริปต์จะคืน JSON ที่แยกเป็นแต่ละ check ดังนี้:
- `adminInit` — การ initialize Firebase Admin SDK
- `firestoreConnection` — การเข้าถึง Firestore
- `realtimeDatabaseConnection` — การเข้าถึง Realtime Database
- `roleAssignment` — การตรวจ custom claims ของ user
- `learningPageAccess` — ตรวจว่าผู้ใช้มี role ที่ได้รับอนุญาตให้เข้า "หน้าเรียน" หรือไม่

## แนวปฏิบัติแนะนำ (Professional Baseline)
- ใช้ service account แยกตาม environment (dev/staging/prod)
- ไม่ hardcode credentials ใน source code
- กำหนด role มาตรฐาน เช่น `admin`, `editor`, `viewer`
- ทวนสอบ role assignment ผ่าน automation ใน CI อย่างสม่ำเสมอ
- บันทึกผล audit เพื่อใช้เป็นหลักฐานในการตรวจสอบย้อนหลัง
