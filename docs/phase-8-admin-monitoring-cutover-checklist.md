# Phase 8 Admin Monitoring Cutover Checklist

## เป้าหมาย
- ให้หน้า `Admin Console` อ่านสรุประดับระบบจาก `admin_aggregates`
- ให้ทีมแอดมินเห็นตัวเลขหลักของสมาชิก, การเรียน, SOS, video review, innovation และ expert matching จาก snapshot เดียว
- ลดภาระ query ตรงจากหลาย collection ในส่วน summary ของหน้าผู้ดูแล

## เอกสารและสคริปต์ที่เกี่ยวข้อง
- `src/hooks/useAdminMonitoringSummary.js`
- `src/services/firebase/repositories/adminAggregateRepository.js`
- `functions/scripts/backfill-admin-aggregates.mjs`
- `functions/scripts/verify-admin-monitoring-quality.mjs`
- `functions/scripts/lib/admin-aggregate-utils.mjs`

## ลำดับการทำงาน
1. deploy frontend และ `firestore.rules`
2. dry run aggregate generation
3. เขียน `admin_aggregates` จริง
4. strict verify ความตรงของ aggregate กับข้อมูลดิบ
5. เปิดหน้า `/du/admin` เพื่อตรวจ headline cards และ monitoring route cards

## คำสั่งที่ใช้
```powershell
npm run build
firebase deploy --only hosting,firestore:rules
```

```powershell
npm run backfill-admin-aggregates --
```

```powershell
npm run backfill-admin-aggregates -- --write true
```

```powershell
npm run verify-admin-monitoring-quality -- --strict true
```

## เงื่อนไขผ่านงาน
- `admin_aggregates` มี docs ครบ 6 รายการ
- `verify-admin-monitoring-quality -- --strict true` ผ่านโดยไม่มี mismatch
- หน้า `/du/admin` แสดง headline summary และ monitoring route cards ได้ครบ
- ไม่มี `permission-denied` สำหรับ admin aggregate listener

## หมายเหตุ
- Aggregate docs เป็น read-only สำหรับ client
- ถ้าต้องการ rerun เฉพาะ doc ใช้ `--doc-id <docId>` เช่น `learning` หรือ `support`
