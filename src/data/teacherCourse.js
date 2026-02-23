import { Video, FileText, CheckSquare, Award, PenTool, ClipboardCheck, Layout, Users, Zap } from 'lucide-react';

// ==========================================
// 1. ส่วน Pre-test (แบบทดสอบก่อนเรียน)
// ==========================================
const preTestModule = {
  id: "module-pretest",
  title: "📌 จุดเริ่มต้น: แบบทดสอบก่อนเรียน (Pre-test)",
  description: "วัดระดับความรู้พื้นฐานก่อนเข้าสู่บทเรียน (ไม่มีเกณฑ์ผ่าน/ไม่ผ่าน)",
  lessons: [
    {
      id: "pretest-exam",
      title: "แบบวัดสมรรถนะครูก่อนการพัฒนา",
      type: "quiz",
      iconName: "ClipboardCheck",
      content: {
        isPretest: true, // Flag บอกระบบว่าเป็น Pre-test
        passScore: 0,    // ไม่กำหนดคะแนนผ่าน
        questionsCount: 10, // ดึงข้อสอบ 10 ข้อจากคลัง
        description: "แบบทดสอบนี้จัดทำขึ้นเพื่อประเมินความรู้พื้นฐานของท่าน ไม่นำไปคิดคะแนนในการจบหลักสูตร"
      }
    }
  ]
};

// ==========================================
// 2. ส่วนเนื้อหาบทเรียน (Learning Modules 1-5)
// ==========================================
const learningModules = [
  // --- Module 1 ---
  {
    id: "module-1",
    title: "Module 1: In - Insight (เปิดตา เปิดใจ)",
    lessons: [
      { 
        id: "m1-l1", 
        title: "1.1 The 9 Dimensions of Insight", 
        type: "video", 
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", 
          description: "เรียนรู้ 9 มิติสำคัญในการค้นหา Insight ของผู้เรียน การจัดการเรียนรู้ และบริบทครู"
        }
      },
      { 
        id: "m1-mission", 
        title: "Mission: SWOT Analysis", 
        type: "activity", 
        activityType: "swot_board", // เชื่อมกับ Component SWOTBoard
        iconName: "PenTool",
        content: {
          description: "วิเคราะห์จุดแข็ง จุดอ่อน โอกาส และอุปสรรค ของตนเองและโรงเรียน"
        }
      }
    ]
  },

  // --- Module 2 ---
  {
    id: "module-2",
    title: "Module 2: S - Design (ออกแบบฝัน)",
    lessons: [
      { id: "m2-l1", title: "2.1 ตั้งเป้าหมาย SMART Goal", type: "video", iconName: "Video" },
      { 
        id: "m2-mission", 
        title: "Mission: My Roadmap", 
        type: "article", 
        iconName: "Layout",
        content: { text: "กิจกรรมออกแบบเส้นทางการพัฒนาตนเองเชื่อมโยงกับเป้าหมาย OECD 2030" }
      }
    ]
  },

  // --- Module 3 ---
  {
    id: "module-3",
    title: "Module 3: P - PLC (รวมพลัง)",
    lessons: [
      { id: "m3-l1", title: "3.1 กระบวนการ PLC", type: "video", iconName: "Video" },
      { 
        id: "m3-mission", 
        title: "Mission: Pitching Idea", 
        type: "article", 
        iconName: "Users",
        content: { text: "อัดคลิปวิดีโอหรือเสียง นำเสนอไอเดียการแก้ปัญหา" }
      }
    ]
  },

  // --- Module 4 ---
  {
    id: "module-4",
    title: "Module 4: I - Innovation (จุดประกาย)",
    lessons: [
      { id: "m4-l1", title: "4.1 Innovation Lab", type: "video", iconName: "Video" },
      { 
        id: "m4-mission", 
        title: "Mission: Lesson Plan", 
        type: "article", 
        iconName: "Zap",
        content: { text: "เขียนแผนการจัดการเรียนรู้หรือนวัตกรรม" }
      }
    ]
  },

  // --- Module 5 ---
  {
    id: "module-5",
    title: "Module 5: RE - Reflection (สะท้อนผล)",
    lessons: [
      { id: "m5-l1", title: "5.1 เทคนิค AAR", type: "video", iconName: "Video" },
      { 
        id: "m5-mission", 
        title: "Mission: Teaching Clip", 
        type: "article", 
        iconName: "Video",
        content: { text: "ส่งคลิปการสอนจริงในห้องเรียนและบันทึกหลังสอน" }
      }
    ]
  }
];

// ==========================================
// 3. ส่วน Post-test (แบบทดสอบหลังเรียน & จบหลักสูตร)
// ==========================================
const postTestModule = {
  id: "module-posttest",
  title: "🏁 บทสรุป: แบบทดสอบหลังเรียน (Post-test)",
  description: "วัดผลสัมฤทธิ์ทางการเรียน (ต้องผ่านเกณฑ์ 80%)",
  lessons: [
    {
      id: "posttest-exam",
      title: "แบบวัดสมรรถนะครูหลังการพัฒนา",
      type: "quiz",
      iconName: "CheckSquare",
      content: {
        isPosttest: true, // Flag บอกระบบว่าเป็น Post-test
        passScore: 8,     // เกณฑ์ผ่าน 8/10 คะแนน
        maxAttempts: 5,   // ทำได้สูงสุด 5 ครั้ง
        questionsCount: 10,
        description: "ข้อสอบจำนวน 10 ข้อ เกณฑ์ผ่าน 8 คะแนน หากไม่ผ่านครบ 5 ครั้ง ท่านจะต้องเริ่มเรียนรู้ใหม่ตั้งแต่ต้น"
      }
    },
    {
      id: "final-survey",
      title: "แบบประเมินความพึงพอใจ",
      type: "article",
      iconName: "FileText",
      content: { text: "แบบฟอร์มประเมินความพึงพอใจต่อหลักสูตร..." }
    },
    {
      id: "final-cert",
      title: "รับเกียรติบัตร",
      type: "certificate",
      iconName: "Award",
      content: { text: "ยินดีด้วย! คุณผ่านการอบรมหลักสูตร InSPIRE for Teacher เรียบร้อยแล้ว สามารถดาวน์โหลดเกียรติบัตรได้ที่นี่" }
    }
  ]
};

// ==========================================
// 4. รวมร่างและ Export (Final Export)
// ==========================================
export const teacherCourseData = {
  id: "course-teacher",
  title: "InSPIRE for Teacher: เส้นทางสู่ครูนวัตกร",
  description: "หลักสูตรพัฒนาครูมืออาชีพผ่านกระบวนการ Design Thinking",
  
  // นำ Pre-test + เนื้อหา 5 บท + Post-test มารวมเป็น Array เดียว
  // เพื่อให้ CourseRoom.jsx สามารถ Render ต่อกันเป็นเส้นทางเดียวได้
  modules: [
    preTestModule,
    ...learningModules,
    postTestModule
  ]
};