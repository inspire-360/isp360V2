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
const moduleOne = {
  id: "module-1",
  title: "Module 1: In-Sight (เปิดตา เปิดใจ ค้นหาความต้องการ)",
  description: "ครูสามารถวิเคราะห์ปัญหาและความต้องการเชิงพื้นที่ของตนเองและโรงเรียนได้อย่างเป็นระบบ",
  lessons: [
    {
      id: "m1-overview",
      title: "บทนำ Module 1: In-Sight",
      type: "article",
      iconName: "FileText",
      content: {
        text: "วัตถุประสงค์: ครูสามารถวิเคราะห์ปัญหาและความต้องการเชิงพื้นที่ของตนเองและโรงเรียนได้อย่างเป็นระบบ ผ่าน 5 Missions ก่อนทำ Post-test ของ Module 1"
      }
    },
    {
      id: "m1-vdo",
      title: "Lesson VDO: The 9 Dimensions of In-Sight",
      type: "video",
      iconName: "Video",
      content: {
        videoUrl: "https://www.youtube.com/embed/8L7X3zR2dK8",
        description: "เรียนรู้กรอบ The 9 Dimensions เพื่อค้นหา Insight ของผู้เรียน การจัดการเรียนรู้ และครูในบริบทเชิงพื้นที่"
      }
    },
    {
      id: "m1-presentation",
      title: "Lesson Presentation: In-Sight Toolkit",
      type: "article",
      iconName: "Layout",
      content: {
        text: "สรุปขั้นตอนทำ Mission 1-5 ในรูปแบบสไลด์: Data Scan → SWOT → TOWS → Needs Detective → Action Plan (PDCA)"
      }
    },
    {
      id: "m1-blog",
      title: "Lesson Blog: ตัวอย่างครูนักคิดเชิงกลยุทธ์",
      type: "article",
      iconName: "FileText",
      content: {
        text: "อ่านกรณีศึกษาโรงเรียนที่เปลี่ยน Pain Point เป็นโอกาส พร้อมแนวทางวิเคราะห์ปัญหาเชิงระบบแบบครูโค้ช"
      }
    },
    {
      id: "m1-m1-9dimensions",
      title: "Mission 1: The 9 Dimensions",
      type: "activity",
      activityType: "insight_9_dimensions",
      iconName: "PenTool",
      content: {
        mentorTip: "เยี่ยมมากครับ! ลองเก็บข้อมูลดิบให้ครบทุกมิติ เพื่อลด Blind Spot ก่อนวิเคราะห์เชิงกลยุทธ์",
        instructions: [
          "ตอบคำถามทั้ง 9 มิติให้ครบ",
          "ให้คะแนน Pain Point หรือ Problem ของแต่ละมิติ 1-5",
          "เลือกประเด็นสำคัญเพื่อส่งต่อไป Mission 2"
        ],
        dimensions: [
          { key: "learners", label: "Learners", question: "เรื่องอะไรที่ทำให้เด็กๆ 'ตาเป็นประกาย' ที่สุด?" },
          { key: "learning_style", label: "Learning Style", question: "ช่วงเวลา Magic Moment ที่ห้องเรียนเงียบกริบหรือตื่นเต้นที่สุดคือตอนไหน?" },
          { key: "community", label: "Community", question: "ใครคือฮีโร่ลับนอกโรงเรียนที่ช่วยได้?" },
          { key: "pain_points", label: "Pain Points", question: "ถ้าเสกเวทมนตร์ให้หายไปได้ 1 อย่าง สิ่งนั้นคืออะไร?" },
          { key: "opportunities", label: "Opportunities", question: "มีของดีอะไรที่ถูกวางทิ้งไว้เฉยๆ บ้าง?" },
          { key: "passion", label: "Passion", question: "โปรเจกต์ในฝันที่อยากทำถ้าไม่มีข้อจำกัดคืออะไร?" },
          { key: "threats", label: "Threats", question: "อะไรคือกำแพงที่สูงที่สุดที่ขวางทางอยู่?" },
          { key: "vision", label: "Vision", question: "อีก 6 เดือนข้างหน้า อยากเห็นภาพอะไรในห้องเรียน?" },
          { key: "small_wins", label: "Small Wins", question: "เรื่องเล็กๆ อะไรที่ทำให้คุณยิ้มได้ในแต่ละวัน?" }
        ]
      }
    },
    {
      id: "m1-m2-swot",
      title: "Mission 2: SWOT Analysis",
      type: "activity",
      activityType: "insight_swot",
      iconName: "PenTool",
      content: {
        mentorTip: "สุดยอดครับ! ลองเลือกคำจาก Mission 1 ลงกล่อง SWOT และเติมคำใหม่ได้เสมอ",
        instructions: [
          "เลือกประเด็นจาก The 9 Dimensions มาใส่ใน SWOT",
          "อนุญาตให้พิมพ์คำเพิ่มในแต่ละช่อง SWOT",
          "ดูกราฟ SWOT Balance เพื่อสะท้อนมุมมอง"
        ],
        swotLabels: ["Strengths", "Weaknesses", "Opportunities", "Threats"]
      }
    },
    {
      id: "m1-m3-tows",
      title: "Mission 3: Strategy Fusion (TOWS Matrix)",
      type: "activity",
      activityType: "insight_tows",
      iconName: "Zap",
      content: {
        mentorTip: "ลองจับคู่ปัจจัยภายในและภายนอก แล้วเขียนกลยุทธ์ให้ชัดว่าทำอะไร กับใคร และผลลัพธ์คืออะไร",
        instructions: [
          "เลือกคู่ S/W + O/T เพื่อสร้างกลยุทธ์ SO/WO/ST/WT",
          "ต้องสร้างอย่างน้อย 3 กลยุทธ์",
          "ระบุเหตุผลสั้นๆ ว่าทำไมกลยุทธ์นี้ตอบโจทย์บริบท"
        ],
        requiredStrategies: 3
      }
    },
    {
      id: "m1-m4-needs-detective",
      title: "Mission 4: Needs Detective",
      type: "activity",
      activityType: "insight_needs_detective",
      iconName: "Users",
      content: {
        mentorTip: "ดีมากครับ! ต่อไปให้ลองให้คะแนนกลยุทธ์ แล้วเลือกกลยุทธ์ที่ตอบโจทย์สูงสุดเพื่อพัฒนา Action Plan",
        instructions: [
          "ให้คะแนนแต่ละกลยุทธ์จาก Mission 3 (1-5)",
          "เลือก 1 กลยุทธ์ที่เหมาะสมที่สุด",
          "สรุป Core Problem, Real Need และ Solution"
        ]
      }
    },
    {
      id: "m1-m5-action-plan",
      title: "Mission 5: Action Plan (PDCA)",
      type: "activity",
      activityType: "insight_action_plan",
      iconName: "Layout",
      content: {
        mentorTip: "เยี่ยมมากครับ! ทำ PDCA ให้ครบทั้ง Plan-Do-Check-Act และกำหนดตัวชี้วัดผลลัพธ์จริง",
        instructions: [
          "ออกแบบแผน PDCA ให้ครบ 4 ขั้น",
          "ระบุผู้รับผิดชอบ ระยะเวลา และตัวชี้วัด",
          "ยืนยันความพร้อมก่อนเข้าสู่ Post-test Module 1"
        ]
      }
    },
    {
      id: "m1-posttest",
      title: "Post-test [Module 1]",
      type: "quiz",
      iconName: "CheckSquare",
      content: {
        passScore: 3,
        questions: [
          {
            id: "m1-q1",
            question: "เป้าหมายหลักของ Mission 1: The 9 Dimensions คืออะไร?",
            options: [
              "เพื่อให้ครูทำเอกสารให้ครบ",
              "เพื่อรวบรวมข้อมูลดิบให้ครอบคลุมและลด Blind Spot",
              "เพื่อจัดอันดับครูภายในโรงเรียน",
              "เพื่อหาคะแนนสอบปลายภาค"
            ],
            correctAnswer: 1
          },
          {
            id: "m1-q2",
            question: "ในการทำ SWOT Mission 2 ผู้เรียนควรทำอะไรได้บ้าง?",
            options: [
              "เลือกคำได้อย่างเดียว ห้ามพิมพ์เพิ่ม",
              "เลือกคำจาก Mission 1 และพิมพ์เพิ่มได้",
              "ทำเฉพาะช่อง Strengths",
              "ข้ามไป Mission 3 ได้ทันที"
            ],
            correctAnswer: 1
          },
          {
            id: "m1-q3",
            question: "TOWS Matrix ใน Mission 3 ต้องสร้างกลยุทธ์อย่างน้อยกี่กลยุทธ์?",
            options: ["1", "2", "3", "5"],
            correctAnswer: 2
          },
          {
            id: "m1-q4",
            question: "Needs Detective ใช้เพื่ออะไร?",
            options: [
              "สุ่มเลือกกลยุทธ์",
              "ให้คะแนนกลยุทธ์และเลือก 1 กลยุทธ์ที่ดีที่สุด",
              "เพิ่มจำนวนคำใน SWOT",
              "ปิดภารกิจทั้งหมดทันที"
            ],
            correctAnswer: 1
          },
          {
            id: "m1-q5",
            question: "Action Plan ใน Mission 5 ควรใช้กรอบใดในการออกแบบ?",
            options: ["5W1H", "OKR", "PDCA", "AAR"],
            correctAnswer: 2
          }
        ]
      }
    },
    {
      id: "m1-report-card",
      title: "In-Sight Report Card & Badge",
      type: "certificate",
      iconName: "Award",
      content: {
        isModule1ReportCard: true,
        badgeName: "In-Sight Badge",
        unlocksModuleId: "module-2",
        text: "สรุปผลคำตอบ Module 1 และรับตรา In-Sight Badge เพื่อปลดล็อก Module 2"
      }
    }
  ]
};

// ==========================================
// 3. ส่วนเนื้อหาบทเรียน (Learning Modules 2-5)
// ==========================================
const learningModules = [
  {
    id: "module-2",
    title: "Module 2: S - Design (ออกแบบฝัน)",
    lessons: [
      {
        id: "m2-l1",
        title: "2.1 ตั้งเป้าหมาย SMART Goal",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/sTJ7AzBIJoI",
          description: "กำหนดเป้าหมายการพัฒนาที่เฉพาะเจาะจง วัดผลได้ และสอดคล้องกับบริบทห้องเรียนจริง"
        }
      },
      {
        id: "m2-l2",
        title: "2.2 Design Thinking for Classroom",
        type: "article",
        iconName: "Layout",
        content: {
          text: "เรียนรู้ขั้นตอน Empathize, Define, Ideate, Prototype และ Test เพื่อออกแบบนวัตกรรมการเรียนรู้ในชั้นเรียน"
        }
      },
      {
        id: "m2-mission",
        title: "Mission: My Roadmap",
        type: "article",
        iconName: "Layout",
        content: { text: "กิจกรรมออกแบบเส้นทางการพัฒนาตนเองเชื่อมโยงกับเป้าหมาย OECD 2030" }
      }
    ]
  },
  {
    id: "module-3",
    title: "Module 3: P - PLC (รวมพลัง)",
    lessons: [
      {
        id: "m3-l1",
        title: "3.1 กระบวนการ PLC",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/atfDg4fLcks",
          description: "เข้าใจวงจรการทำงานของ PLC ตั้งแต่การระบุปัญหา วางแผน ทดลอง และสะท้อนผลร่วมกัน"
        }
      },
      {
        id: "m3-l2",
        title: "3.2 Facilitation Skills",
        type: "article",
        iconName: "Users",
        content: {
          text: "เทคนิคการเป็นผู้อำนวยความสะดวกในการประชุม PLC เพื่อให้เกิดการแลกเปลี่ยนที่ปลอดภัยและสร้างสรรค์"
        }
      },
      {
        id: "m3-mission",
        title: "Mission: Pitching Idea",
        type: "article",
        iconName: "Users",
        content: { text: "อัดคลิปวิดีโอหรือเสียง นำเสนอไอเดียการแก้ปัญหา" }
      }
    ]
  },
  {
    id: "module-4",
    title: "Module 4: I - Innovation (จุดประกาย)",
    lessons: [
      {
        id: "m4-l1",
        title: "4.1 Innovation Lab",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/tgbNymZ7vqY",
          description: "แนวทางพัฒนานวัตกรรมการจัดการเรียนรู้จากปัญหาจริงในโรงเรียน"
        }
      },
      {
        id: "m4-l2",
        title: "4.2 Prototype และการทดลองใช้",
        type: "article",
        iconName: "Zap",
        content: {
          text: "ออกแบบต้นแบบนวัตกรรมแบบง่าย (Low-fidelity Prototype) และกำหนดวิธีทดลองใช้กับผู้เรียนกลุ่มเล็ก"
        }
      },
      {
        id: "m4-mission",
        title: "Mission: Lesson Plan",
        type: "article",
        iconName: "Zap",
        content: { text: "เขียนแผนการจัดการเรียนรู้หรือนวัตกรรม" }
      }
    ]
  },
  {
    id: "module-5",
    title: "Module 5: RE - Reflection (สะท้อนผล)",
    lessons: [
      {
        id: "m5-l1",
        title: "5.1 เทคนิค AAR",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ",
          description: "ฝึกทักษะสะท้อนผลแบบ AAR (What was expected? What happened? Why? What next?)"
        }
      },
      {
        id: "m5-l2",
        title: "5.2 Evidence-based Reflection",
        type: "article",
        iconName: "FileText",
        content: {
          text: "สรุปผลลัพธ์การพัฒนาจากหลักฐานเชิงประจักษ์ เช่น งานนักเรียน ผลประเมิน และเสียงสะท้อนจากเพื่อนครู"
        }
      },
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
      content: {
        text: "กรุณาตอบแบบประเมินความพึงพอใจเพื่อสะท้อนคุณภาพหลักสูตร และเสนอแนวทางพัฒนารุ่นถัดไป",
        surveyUrl: "https://forms.gle/example-inspire-survey"
      }
    },
    {
      id: "final-cert",
      title: "รับเกียรติบัตร",
      type: "certificate",
      iconName: "Award",
      content: {
        text: "ยินดีด้วย! คุณผ่านการอบรมหลักสูตร InSPIRE for Teacher เรียบร้อยแล้ว สามารถดาวน์โหลดเกียรติบัตรได้ที่นี่",
        requirements: [
          "ทำ Post-test ผ่านเกณฑ์ 80%",
          "ส่งแบบประเมินความพึงพอใจเรียบร้อย",
          "ทำกิจกรรมใน Module 1-5 ครบทุกบทเรียน"
        ]
      }
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
