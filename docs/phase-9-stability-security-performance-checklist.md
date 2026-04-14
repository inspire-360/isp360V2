# Phase 9 Stability / Security / Performance Checklist

## เป้าหมาย
- ลด noise ที่ไม่จำเป็นจาก production console และ smoke reports
- เพิ่ม graceful recovery เมื่อหน้าบางส่วน error
- เพิ่ม baseline tests และ smoke tooling สำหรับหน้าหลักของระบบ
- ป้องกัน generated artifacts ที่มีข้อมูลทดสอบค้างอยู่ใน repo

## สิ่งที่ harden แล้ว
- Presence sync:
  - ignore network errors แบบ unload / aborted fetch ที่ไม่ควรถูกตีความว่าเป็น production failure
  - ไฟล์: `src/utils/presenceSync.js`, `src/hooks/usePresence.jsx`, `src/components/Layout.jsx`
- App recovery:
  - เพิ่ม app-level error boundary
  - ไฟล์: `src/components/AppErrorBoundary.jsx`, `src/App.jsx`
- Unit verification:
  - เพิ่ม baseline unit checks แบบ single-process
  - ไฟล์: `scripts/run-unit-tests.mjs`
- Smoke security:
  - report ใหม่ไม่เขียน password ลงไฟล์
  - password test account ถูกสุ่มใหม่ทุกครั้ง
  - ไฟล์: `scripts/smoke-auth.mjs`
- Artifact hygiene:
  - ignore `output/` และ `playwright-report/`
  - ไฟล์: `.gitignore`
- Admin smoke:
  - เพิ่ม smoke script เฉพาะ `/du/admin`
  - ไฟล์: `scripts/smoke-admin-console.mjs`

## คำสั่งตรวจ baseline
```powershell
npm run lint
npm run build
npm run test:unit
```

## คำสั่ง smoke ที่ควรใช้
```powershell
node scripts\smoke-auth.mjs https://inspire-72132.web.app
```

```powershell
node scripts\smoke-member-control.mjs https://inspire-72132.web.app <admin-email> <admin-password>
```

```powershell
node scripts\smoke-admin-console.mjs https://inspire-72132.web.app <admin-email> <admin-password>
```

## Definition of Done สำหรับรอบนี้
- `lint`, `build`, `test:unit` ผ่าน
- smoke ผู้ใช้ทั่วไปผ่านโดยไม่มี `consoleErrors`, `pageErrors`, `requestFailures`
- smoke admin console ผ่านเมื่อมี admin credential
- ไม่มี generated smoke artifact เก่าค้างใน workspace

## Residual Risks
- `verify-admin-monitoring-quality` ยังต้องใช้ ADC/service account ในเครื่องที่รัน
- ยังไม่มี emulator-based Firestore rules tests
- admin smoke ยังต้องใช้ credential จริงหรือ bootstrap account ที่เตรียมไว้ก่อนรัน
