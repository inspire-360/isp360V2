# InSPIRE360 Curriculum Configuration

เอกสารนี้อัปเดตเพื่อแก้ปัญหา "กดเข้าเรียนแล้วหน้าว่าง" โดยทำให้โครงสร้างข้อมูลตรงตามที่หน้าเรียนต้องใช้จริง

## ไฟล์หลัก
- `config/inspire360.curriculum.json`

## สิ่งที่ปรับปรุงเพื่อความเสถียร
- เพิ่มโครงสร้าง `lesson.embedUrl` และ `lesson.showAfter: "pre-test"` ให้ครบทุก Module
- แยก Mission ที่มีหลายพาร์ทเป็น `parts[]` พร้อมคำถามจริงในแต่ละพาร์ท
- คงเงื่อนไข UX บังคับ: AI Mentor Persona, Progression Bar 4 ขั้น, Instant Feedback
- ใส่เกณฑ์ post-test, badge, report card, และการปลดล็อกโมดูลให้ครบ

## Validation
```bash
npm run curriculum:validate
```

ตัวตรวจจะเช็กว่า:
- มี 5 modules ครบ
- ทุก module มี `lesson.embedUrl` (ป้องกันหน้าเรียนว่าง)
- Module 1 Mission 1 = 18 คำถาม และ Mission 2 = 12 คำถาม
- Final post-test = 80% / retry 3 / cooldown 12 ชั่วโมง
