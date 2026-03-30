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
        isPretest: true,
        passScore: 0,
        questionsCount: 10,
        description: "แบบทดสอบนี้จัดทำขึ้นเพื่อประเมินความรู้พื้นฐานของท่าน ไม่นำไปคิดคะแนนในการจบหลักสูตร"
      }
    }
  ]
};

// ==========================================
// 2. Module 1: In-Sight (เปิดตา เปิดใจ ค้นหาความต้องการ)
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
    description: "ออกแบบเป้าหมายและแผนพัฒนาให้สอดคล้องกับสมรรถนะครูยุคใหม่",
    lessons: [
      { id: "m2-l1", title: "2.1 ตั้งเป้าหมาย SMART Goal", type: "video", iconName: "Video" },
      { 
        id: "m2-mission", 
        title: "Mission: My Roadmap", 
        type: "article", 
        iconName: "Layout",
        content: {
          text: "กิจกรรมออกแบบเส้นทางการพัฒนาตนเองเชื่อมโยงกับเป้าหมาย OECD 2030 พร้อมกำหนดตัวชี้วัดรายเดือน"
        }
      }
    ]
  },
  {
    id: "module-3",
    title: "Module 3: P - PLC (รวมพลัง)",
    description: "สร้างเครือข่ายเพื่อนครูและการทำงานร่วมกันแบบ Professional Learning Community",
    lessons: [
      { id: "m3-l1", title: "3.1 กระบวนการ PLC", type: "video", iconName: "Video" },
      { 
        id: "m3-mission", 
        title: "Mission: Pitching Idea", 
        type: "article", 
        iconName: "Users",
        content: {
          text: "อัดคลิปวิดีโอหรือเสียง นำเสนอไอเดียการแก้ปัญหาในชั้นเรียน และรับข้อเสนอแนะจากเพื่อนครู"
        }
      }
    ]
  },
  {
    id: "module-4",
    title: "Module 4: I - Innovation (จุดประกาย)",
    description: "พัฒนานวัตกรรมการสอนที่ใช้งานได้จริงในบริบทโรงเรียน",
    lessons: [
      { id: "m4-l1", title: "4.1 Innovation Lab", type: "video", iconName: "Video" },
      { 
        id: "m4-mission", 
        title: "Mission: Lesson Plan", 
        type: "article", 
        iconName: "Zap",
        content: {
          text: "เขียนแผนการจัดการเรียนรู้หรือนวัตกรรม พร้อมระบุเครื่องมือวัดผลและเกณฑ์ความสำเร็จ"
        }
      }
    ]
  },
  {
    id: "module-5",
    title: "Module 5: RE - Reflection (สะท้อนผล)",
    description: "สรุปบทเรียน ปรับปรุงแนวทาง และวางแผนการพัฒนาต่อเนื่อง",
    lessons: [
      { id: "m5-l1", title: "5.1 เทคนิค AAR", type: "video", iconName: "Video" },
      { 
        id: "m5-mission", 
        title: "Mission: Teaching Clip", 
        type: "article", 
        iconName: "Video",
        content: {
          text: "ส่งคลิปการสอนจริงในห้องเรียนพร้อมบันทึกหลังสอน และแผนการปรับปรุงรอบถัดไป"
        }
      }
    ]
  }
];

// ==========================================
// 4. ส่วน Post-test (แบบทดสอบหลังเรียน & จบหลักสูตร)
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
        isPosttest: true,
        passScore: 8,
        maxAttempts: 5,
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
// 5. รวมร่างและ Export (Final Export)
// ==========================================
export const teacherCourseData = {
  id: "course-teacher",
  title: "InSPIRE for Teacher: เส้นทางสู่ครูนวัตกร",
  description: "หลักสูตรพัฒนาครูมืออาชีพผ่านกระบวนการ Design Thinking",
  modules: [
    preTestModule,
    moduleOne,
    ...learningModules,
    postTestModule
  ]
};
