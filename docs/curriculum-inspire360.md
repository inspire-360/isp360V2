# InSPIRE360 Curriculum Configuration

เอกสารนี้อัปเดตเพื่อแก้ปัญหา "กดเข้าเรียนแล้วหน้าว่าง" โดยทำทั้ง **data fallback** และ **safe render guard** ฝั่งหน้าเว็บ

## ไฟล์หลัก
- `config/inspire360.curriculum.json`
- `src/lesson-embed-guard.js`

## สิ่งที่ปรับปรุงเพื่อความเสถียร
- เพิ่ม URL 3 ระดับในแต่ละโมดูล:
  - `lesson.embedUrl` (primary)
  - `lesson.fallbackEmbedUrl` (fallback)
  - `lesson.openInNewTabUrl` (recovery action)
- เพิ่ม Safe Render Guard (`safeRenderLesson`) เพื่อ:
  - ตรวจ URL ก่อน render
  - fallback อัตโนมัติเมื่อโหลด iframe ไม่สำเร็จ/timeout
  - แสดง recovery UI แทนหน้าว่าง พร้อมปุ่มเปิดบทเรียนในแท็บใหม่
- คงเงื่อนไข UX บังคับ: AI Mentor Persona, Progression Bar 4 ขั้น, Instant Feedback

## ตัวอย่างใช้งานฝั่งหน้าเว็บ
```js
import { safeRenderLesson } from './src/lesson-embed-guard.js';

const container = document.getElementById('lesson-frame');
safeRenderLesson(container, module.lesson, {
  onStatus: (s) => console.log('lesson status:', s)
});
```

## Validation
```bash
npm run curriculum:validate
```

ตัวตรวจจะเช็กว่า:
- มี 5 modules ครบ
- ทุก module มี `lesson.embedUrl`, `lesson.fallbackEmbedUrl`, `lesson.openInNewTabUrl`
- Module 1 Mission 1 = 18 คำถาม และ Mission 2 = 12 คำถาม
- Final post-test = 80% / retry 3 / cooldown 12 ชั่วโมง
