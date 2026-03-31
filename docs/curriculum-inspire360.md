# InSPIRE360 Curriculum Configuration

ไฟล์หลักของหลักสูตรอยู่ที่:
- `config/inspire360.curriculum.json`

## สิ่งที่ปรับปรุงรอบนี้ (ภาษาไทย + ความเสถียร)
- ใช้ภาษาไทยเป็นค่าเริ่มต้นทั้งระบบ (`defaultLanguage: th`) และกำหนด `supportedLanguages` ให้รองรับไทยอย่างชัดเจน
- ยืนยันบทบาท **AI Mentor Persona** ในทุกขั้น (`showGuidanceEveryStep: true`) พร้อมสำนวนเชิงให้กำลังใจและชวนคิด
- คงแนวทาง UX ตามข้อกำหนด:
  - Progression Bar: `Step 1-4`
  - Instant Feedback: `micro-reward` พร้อมแอนิเมชันย่อย
- โครงสร้างบทเรียนทุก Module รองรับการฝังแบบ `iframe` และแสดงผลหลัง Pre-test
- แตกคำถาม Module 1 Mission 1 และ Mission 2 เป็น 2 Parts ตามสเปกอย่างชัดเจน
  - Mission 1 = 2 Parts × 9 คำถาม
  - Mission 2 = 2 Parts × 6 คำถาม

## Validation (เน้นความเสถียรของโครงสร้าง)
รันคำสั่งนี้เพื่อตรวจความครบถ้วนของ config:

```bash
npm run curriculum:validate
```

ตัวตรวจจะเช็กเงื่อนไขสำคัญ เช่น:
- ภาษาหลักต้องเป็นไทย
- เปิดใช้งาน AI Mentor, Progression Bar, และ Instant Feedback
- ทุก Module ต้องมี `lesson.url`, `lesson.embed = iframe`, และ `lesson.placement = after_pretest`
- Mission 1 และ Mission 2 ของ Module 1 มีจำนวนคำถามครบตามสเปก
- Final post-test ต้องผ่าน 80%, retry 3 ครั้ง, cooldown 12 ชั่วโมง
