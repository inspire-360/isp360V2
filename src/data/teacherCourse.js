import { moduleOneLessons, moduleOneModuleMeta } from "./moduleOneCampaign";

const checkpointProfile = ({ arc, xp, reward, badge, objective }) => ({
  arc,
  xp,
  reward,
  badge,
  objective,
  difficulty: "Checkpoint",
  checkpoints: [],
});

const missionProfile = ({
  arc,
  xp,
  reward,
  badge,
  objective,
  deliverable,
  duSignal,
  checkpoints,
  difficulty = "Heroic",
}) => ({
  arc,
  xp,
  reward,
  badge,
  objective,
  deliverable,
  duSignal,
  difficulty,
  checkpoints,
});

const preTestModule = {
  id: "module-pretest",
  title: "Point Zero: Pre-test Mission Brief",
  description: "ประเมินจุดตั้งต้นของผู้เรียนก่อนเข้าสู่เส้นทางภารกิจหลัก",
  campaignName: "Calibration Gate",
  lessons: [
    {
      id: "pretest-exam",
      title: "Pre-test Checkpoint",
      type: "quiz",
      iconName: "ClipboardCheck",
      content: {
        isPretest: true,
        passScore: 0,
        questionsCount: 10,
        description:
          "แบบประเมินนี้ใช้เพื่อดูภาพรวมจุดเริ่มต้นของคุณก่อนเข้าสู่เส้นทางการพัฒนา โดยไม่ตัดสินผ่านหรือไม่ผ่าน",
        gamification: checkpointProfile({
          arc: "Warm Up",
          xp: 80,
          reward: "Access to the first mission map",
          badge: "Ready State",
          objective: "Complete the baseline checkpoint and unlock the mission board",
        }),
      },
    },
  ],
};

const moduleOneModule = {
  id: "module-1",
  title: moduleOneModuleMeta.title,
  description: moduleOneModuleMeta.description,
  campaignName: moduleOneModuleMeta.campaignName,
  lessons: moduleOneLessons,
};

const learningModules = [
  {
    id: "module-1",
    title: "Module 1: In - Insight",
    description: "ทำความเข้าใจผู้เรียน โรงเรียน และบริบทจริงก่อนออกแบบการเปลี่ยนแปลง",
    campaignName: "Insight Expedition",
    lessons: [
      {
        id: "m1-l1",
        title: "1.1 The 9 Dimensions of Insight",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/2Xc9gXyf2G4",
          description:
            "สำรวจ 9 มิติสำคัญในการมองเห็นความต้องการผู้เรียน ความจริงของห้องเรียน และปัจจัยรอบระบบ",
        },
      },
      {
        id: "m1-l2",
        title: "1.2 Needs Assessment & Gap Analysis",
        type: "article",
        iconName: "FileText",
        content: {
          text: "เก็บข้อมูลเชิงคุณภาพและเชิงปริมาณเพื่อวิเคราะห์ช่องว่างระหว่างสภาพจริงกับสภาพที่ต้องการเห็นในห้องเรียนและโรงเรียน",
          resources: [
            "แบบฟอร์มรวบรวมข้อมูลผู้เรียนรายชั้น",
            "แม่แบบสรุป pain point ของห้องเรียน",
          ],
        },
      },
      {
        id: "m1-mission",
        title: "Mission: SWOT Analysis",
        type: "activity",
        activityType: "swot_board",
        iconName: "PenTool",
        content: {
          description: "วิเคราะห์จุดแข็ง จุดอ่อน โอกาส และอุปสรรคของตนเองและโรงเรียน",
          gamification: missionProfile({
            arc: "Insight Expedition",
            xp: 180,
            reward: "Insight Pulse badge + 1 coaching unlock",
            badge: "Observer",
            objective: "สร้างภาพสถานการณ์จริงของผู้เรียนและระบบให้ชัดก่อนลงมือแก้ปัญหา",
            deliverable: "กระดาน SWOT ที่เชื่อมกับโจทย์จริงอย่างน้อย 3 ประเด็น",
            duSignal: "DU ใช้สัญญาณนี้เพื่อรู้ว่าคุณต้องการการสนับสนุนด้านข้อมูลหรือไม่",
            checkpoints: [
              "ระบุ pain point หลัก 1 เรื่อง",
              "เชื่อมโยงข้อมูลจริงอย่างน้อย 2 แหล่ง",
              "สรุปโอกาสพัฒนา 1 ทางเลือก",
            ],
          }),
        },
      },
    ],
  },
  {
    id: "module-2",
    title: "Module 2: S - Design",
    description: "ออกแบบเป้าหมายและแผนพัฒนาที่วัดผลได้และเชื่อมกับการเปลี่ยนแปลงจริง",
    campaignName: "Roadmap Forge",
    lessons: [
      {
        id: "m2-l1",
        title: "2.1 SMART Goal Setup",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/QiM8R6Yl2_0",
          description:
            "กำหนดเป้าหมายแบบ SMART ให้ชัด วัดผลได้ และเชื่อมโยงกับผลลัพธ์ของผู้เรียน",
        },
      },
      {
        id: "m2-l2",
        title: "2.2 Blueprint การออกแบบการเรียนรู้",
        type: "article",
        iconName: "Layout",
        content: {
          text: "ใช้ Backward Design ร่วมกับ OECD 2030 เพื่อออกแบบกิจกรรมการเรียนรู้ที่ตอบโจทย์ผู้เรียนรายบุคคล",
          resources: [
            "Template: Lesson Blueprint 1 หน้า",
            "Checklist ความสอดคล้องของผลลัพธ์การเรียนรู้",
          ],
        },
      },
      {
        id: "m2-mission",
        title: "Mission: My Roadmap",
        type: "article",
        iconName: "Layout",
        content: {
          text: "ออกแบบเส้นทางการพัฒนาตนเองเชื่อมกับเป้าหมาย OECD 2030 พร้อม milestone รายเดือนและตัวชี้วัดที่ติดตามได้",
          gamification: missionProfile({
            arc: "Roadmap Forge",
            xp: 220,
            reward: "Roadmap Relay card + mentor review slot",
            badge: "Architect",
            objective: "เปลี่ยน insight ให้เป็นแผนปฏิบัติการที่เดินตามได้จริงใน 90 วัน",
            deliverable: "แผน roadmap ที่มี milestone ชัดเจนและ owner แต่ละช่วง",
            duSignal: "DU สามารถใช้ roadmap นี้ในการติดตามและเสนอทรัพยากรเสริมให้ตรงจุด",
            checkpoints: [
              "กำหนดผลลัพธ์ 90 วัน",
              "ใส่ milestone รายเดือน",
              "ระบุข้อมูลที่ต้องติดตามและคนที่ช่วยได้",
            ],
          }),
        },
      },
    ],
  },
  {
    id: "module-3",
    title: "Module 3: P - PLC",
    description: "สร้างพลังร่วมกับเพื่อนครูและระบบสนับสนุนแบบ Professional Learning Community",
    campaignName: "Collaboration Sprint",
    lessons: [
      {
        id: "m3-l1",
        title: "3.1 กระบวนการ PLC",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/l4mY2asIjWk",
          description:
            "เข้าใจขั้นตอน PLC ตั้งแต่ตั้งโจทย์ ใช้ข้อมูลจริง ไปจนถึงการติดตามผลการเปลี่ยนแปลง",
        },
      },
      {
        id: "m3-l2",
        title: "3.2 Collaborative Tools for Teachers",
        type: "article",
        iconName: "Users",
        content: {
          text: "แนวทางใช้เครื่องมือดิจิทัลเพื่อ co-planning, peer feedback และ lesson study ให้เกิดการทำงานร่วมกันจริง",
          resources: [
            "Rubric สำหรับการสะท้อนบทเรียนร่วมกัน",
            "Template บันทึกการประชุม PLC",
          ],
        },
      },
      {
        id: "m3-mission",
        title: "Mission: Pitching Idea",
        type: "article",
        iconName: "Users",
        content: {
          text: "อัดคลิปเสียงหรือวิดีโอสั้นเพื่อเสนอแนวคิดการแก้ปัญหาในชั้นเรียนและรับข้อเสนอแนะจากเพื่อนครู",
          gamification: missionProfile({
            arc: "Collaboration Sprint",
            xp: 240,
            reward: "Pitch Signal badge + peer loop feedback",
            badge: "Connector",
            objective: "ทำให้แนวคิดของคุณชัดพอที่จะชวนคนอื่นเข้ามาช่วยขยายผล",
            deliverable: "pitch 1 ชิ้น พร้อมคำถามที่ต้องการ feedback",
            duSignal: "หาก feedback ติดขัด DU จะเห็นได้ทันทีว่าควรเข้ามาช่วยเปิดวงสนทนา",
            checkpoints: [
              "สรุปปัญหาและแนวคิดภายใน 90 วินาที",
              "ระบุ feedback ที่ต้องการ 1-2 ข้อ",
              "บันทึกสิ่งที่จะปรับจาก feedback",
            ],
          }),
        },
      },
    ],
  },
  {
    id: "module-4",
    title: "Module 4: I - Innovation",
    description: "พัฒนานวัตกรรมการสอนที่ใช้งานได้จริงและวัดผลได้",
    campaignName: "Prototype Lab",
    lessons: [
      {
        id: "m4-l1",
        title: "4.1 Innovation Lab",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/7sxpKhIbr0E",
          description:
            "ฝึกคิดเชิงนวัตกรรมด้วย Design Thinking ตั้งแต่ empathize ไปจนถึง prototype และ test",
        },
      },
      {
        id: "m4-l2",
        title: "4.2 Assessment for Learning",
        type: "article",
        iconName: "CheckSquare",
        content: {
          text: "ออกแบบการประเมินเพื่อพัฒนา (AfL) ให้สะท้อนสมรรถนะจริงของผู้เรียนระหว่างเรียน",
          resources: ["Exit Ticket Template", "แนวทางทำ Formative Feedback"],
        },
      },
      {
        id: "m4-mission",
        title: "Mission: Lesson Plan",
        type: "article",
        iconName: "Zap",
        content: {
          text: "เขียนแผนการจัดการเรียนรู้หรือนวัตกรรม พร้อมเครื่องมือวัดผลและเกณฑ์ความสำเร็จ",
          gamification: missionProfile({
            arc: "Prototype Lab",
            xp: 260,
            reward: "Prototype launch token + DU review queue priority",
            badge: "Builder",
            objective: "เปลี่ยนไอเดียเป็นต้นแบบที่พร้อมนำไปใช้กับผู้เรียนจริง",
            deliverable: "lesson plan หรือ prototype พร้อมตัวชี้วัดผลลัพธ์",
            duSignal: "DU ใช้ภารกิจนี้คัดกรองว่าทีมไหนต้องการการโค้ชเรื่อง implementation",
            checkpoints: [
              "ระบุพฤติกรรมหรือผลลัพธ์ที่ต้องการเห็น",
              "แนบวิธีเก็บ evidence",
              "วางแผน cycle ทดสอบอย่างน้อย 1 รอบ",
            ],
          }),
        },
      },
    ],
  },
  {
    id: "module-5",
    title: "Module 5: RE - Reflection",
    description: "สรุปบทเรียน สะท้อนผล และต่อยอดการเติบโตสู่รอบถัดไป",
    campaignName: "Evidence Summit",
    lessons: [
      {
        id: "m5-l1",
        title: "5.1 เทคนิค AAR",
        type: "video",
        iconName: "Video",
        content: {
          videoUrl: "https://www.youtube.com/embed/7rJ7f9G-DN8",
          description:
            "เรียนรู้การทำ After Action Review เพื่อสะท้อนจุดเด่น จุดปรับปรุง และแผนต่อยอด",
        },
      },
      {
        id: "m5-l2",
        title: "5.2 Portfolio สะท้อนการเติบโต",
        type: "article",
        iconName: "FileText",
        content: {
          text: "จัดทำ teaching portfolio ที่สะท้อนพัฒนาการของครูและผลลัพธ์ผู้เรียน พร้อมหลักฐานประกอบ",
          resources: [
            "Template Reflection รายหน่วย",
            "Checklist หลักฐานประกอบ Portfolio",
          ],
        },
      },
      {
        id: "m5-mission",
        title: "Mission: Teaching Clip",
        type: "article",
        iconName: "Video",
        content: {
          text: "ส่งคลิปการสอนจริงพร้อมบันทึกหลังสอนและแผนการปรับปรุงรอบถัดไป",
          gamification: missionProfile({
            arc: "Evidence Summit",
            xp: 300,
            reward: "Capstone badge + certificate lane unlock",
            badge: "Storyteller",
            objective: "ปิดภารกิจด้วยหลักฐานการลงมือทำและบทเรียนที่พร้อมส่งต่อให้ทีม",
            deliverable: "คลิปการสอน + AAR + next experiment",
            duSignal: "DU ใช้ข้อมูลนี้เพื่อติดตามผลต่อเนื่องและคัดกรณีเด่นสำหรับขยายผล",
            checkpoints: [
              "แนบคลิปหรือหลักฐานการสอน",
              "สะท้อนสิ่งที่เกิดขึ้นจริง",
              "กำหนดรอบปรับปรุงถัดไป",
            ],
          }),
        },
      },
    ],
  },
];

const postTestModule = {
  id: "module-posttest",
  title: "Finish Line: Post-test & Certification",
  description: "วัดผลลัพธ์ปลายทาง เก็บ feedback และปลดล็อกใบรับรอง",
  campaignName: "Launch Review",
  lessons: [
    {
      id: "posttest-exam",
      title: "Post-test Checkpoint",
      type: "quiz",
      iconName: "CheckSquare",
      content: {
        isPosttest: true,
        passScore: 8,
        maxAttempts: 5,
        questionsCount: 10,
        description:
          "ข้อสอบ 10 ข้อ เกณฑ์ผ่าน 8 คะแนน หากไม่ผ่านครบ 5 ครั้ง ระบบจะรีเซ็ตกลับไปเริ่มจาก Module 1",
        gamification: checkpointProfile({
          arc: "Final Check",
          xp: 120,
          reward: "Certification lane access",
          badge: "Verifier",
          objective: "พิสูจน์ว่าคุณพร้อมจบหลักสูตรและต่อยอดสู่การใช้งานจริง",
        }),
      },
    },
    {
      id: "final-survey",
      title: "Reflection Survey",
      type: "article",
      iconName: "FileText",
      content: {
        text: "ตอบแบบประเมินความพึงพอใจหลังเรียนจบ เพื่อช่วยพัฒนาหลักสูตรและระบบสนับสนุนครูในรุ่นถัดไป",
        surveyUrl: "https://example.com/inspire-survey",
        surveyLabel: "เปิดแบบสอบถามความพึงพอใจ",
        gamification: checkpointProfile({
          arc: "Signal Back",
          xp: 60,
          reward: "Voice to DU",
          badge: "Contributor",
          objective: "ส่ง feedback กลับเข้าสู่ระบบ DU เพื่อปรับปรุงประสบการณ์รุ่นต่อไป",
        }),
      },
    },
    {
      id: "final-cert",
      title: "Certificate Vault",
      type: "certificate",
      iconName: "Award",
      content: {
        text: "เมื่อผ่าน post-test และ survey แล้ว คุณจะปลดล็อกใบรับรองหลักสูตร InSPIRE for Teacher",
        certificateUrl: "#",
        certificateLabel: "ดาวน์โหลดเกียรติบัตร (PDF)",
        gamification: checkpointProfile({
          arc: "Vault Unlock",
          xp: 140,
          reward: "Certification + alumni status",
          badge: "Finisher",
          objective: "ปิดเส้นทางการเรียนรู้และยืนยันความสำเร็จของคุณ",
        }),
      },
    },
  ],
};

export const teacherCourseData = {
  id: "course-teacher",
  title: "InSPIRE for Teacher: เส้นทางสู่ครูนวัตกร",
  description:
    "หลักสูตรพัฒนาครูผ่านกระบวนการ Design Thinking ที่เปลี่ยนแต่ละภารกิจให้เป็น quest พร้อม feedback และ reward ที่ติดตามได้",
  modules: [preTestModule, moduleOneModule, ...learningModules.slice(1), postTestModule],
};
