# InSPIRE360 Curriculum Configuration

ไฟล์หลักของหลักสูตรอยู่ที่:
- `config/inspire360.curriculum.json`

## สิ่งที่ปรับปรุงรอบ Redesign (Interaction + UX)
- เพิ่มธีมสีใหม่ของแพลตฟอร์มตามที่กำหนด:
  - Primary: `#EF7722`
  - Secondary: `#FAA533`
  - Neutral: `#EBEBEB`
  - Accent: `#0BA6DF`
- ยืนยันบทบาท **AI Mentor Persona** ทุกขั้นตอน พร้อมรูปแบบการสื่อสารเชิงให้กำลังใจและคำถามชวนคิด
- Progression Bar แบบ segmented และ milestone ชัดเจน (`Step 1-4`)
- Instant Feedback แบบ micro-reward พร้อมข้อความยินดีและแอนิเมชันเมื่อผ่านแต่ละช่วง
- คงการฝังบทเรียนแบบ `iframe` หลัง Pre-test ของทุก Module

## Curriculum Coverage ที่ปรับให้ละเอียดขึ้น
- **Module 1 / Mission 1**: โครงสร้าง 9 มิติแบบ SWOT (2 Parts x 9 Questions) โดยระบุมิติและเจตนา S/W ชัดเจนทุกข้อ
- **Module 1 / Mission 2**: โครงสร้าง PESTEL (2 Parts x 6 Questions) พร้อมคำถาม O/T เชิงบริบทสถานศึกษา
- **Module 2 / Mission 6**: ขยายรายละเอียด 3 Lenses (Global/National/Local) ให้สอดคล้อง OECD + พระบรมราโชบาย ร.10 + SEZ ตาก
- เพิ่ม `preTest` baseline ให้ครบทุก module เพื่อรองรับ flow “pre-test -> lesson iframe -> missions -> post-test”

## Validation (เน้นความเสถียรของโครงสร้าง)
รันคำสั่งนี้เพื่อตรวจความครบถ้วนของ config:

```bash
npm run curriculum:validate
```

ตัวตรวจจะเช็กเงื่อนไขหลัก เช่น:
- ภาษาไทยเป็นค่าหลัก
- AI Mentor, Progression Bar, Instant Feedback ถูกเปิดใช้
- ทุก Module มี lesson URL + iframe + after_pretest
- Module 1 Mission 1/2 มีจำนวนคำถามครบตามสเปก
- Final post-test: ผ่าน 80%, retry 3 ครั้ง, cooldown 12 ชั่วโมง
