# InSPIRE360 Curriculum Configuration

ไฟล์หลักของหลักสูตรอยู่ที่:
- `config/inspire360.curriculum.json`

จุดเด่นที่อัปเดตแล้ว:
- รวมโครงสร้าง Module 1-5 + Final Post-test ครบถ้วน
- กำหนด Interaction & UX Guidelines ครบ 3 ส่วน
  - AI Mentor Persona (Encouraging + Probing)
  - Progression Bar (Step 1-4)
  - Instant Feedback (Micro-reward)
- ใส่เกณฑ์ผ่าน/ปลดล็อก Badge และ Module ถัดไปครบทุก Module
- แก้ความคลาดเคลื่อนของชื่อภารกิจให้ถูกต้อง (เช่น Module 1 Mission 4)

## Validation
รันคำสั่งนี้เพื่อตรวจความครบถ้วนของ config:

```bash
npm run curriculum:validate
```

ตัวตรวจจะเช็กเงื่อนไขหลัก เช่น:
- มี 5 modules
- Mission 1 และ Mission 2 ของ Module 1 มีจำนวนคำถามตามสเปก
- Final post-test ผ่าน 80%, retry 3 ครั้ง, cooldown 12 ชั่วโมง
