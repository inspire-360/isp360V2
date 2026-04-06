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

export const MODULE_FIVE_BADGE = "RE-Reflection Badge";
export const MODULE_FIVE_REPORT_KEY = "module5";
export const MODULE_FIVE_UNLOCK_TITLE = "Post-test";

export const generateModuleFiveCardSerial = (
  uid = "USER",
  generatedAt = new Date().toISOString(),
) => {
  const safeUid =
    String(uid || "USER")
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(-6) || "USER05";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `REFLECT-${dateCode}-${safeUid}`;
};

export const moduleFiveStages = [
  {
    step: 1,
    label: "Step 1",
    title: "Teach for Real",
    helper: "Take the designed plan into the real classroom and capture evidence from authentic practice.",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Reflect",
    helper: "Write the reflection log after teaching so the lesson learns from the classroom too.",
  },
  {
    step: 3,
    label: "Step 3",
    title: "Refine",
    helper: "Choose the next improvement path and decide what version 2.0 should become.",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Post-test",
    helper: "Confirm readiness, generate the reflection report card, and open the final course post-test.",
  },
];

export const moduleFivePreTestQuestions = [
  {
    id: "module5-pretest-1",
    question: "Mission 1 ของ Module 5 ขอหลักฐานการสอนจริงรูปแบบใด",
    options: [
      "คลิปการสอนจริงความยาวประมาณ 50-60 นาที",
      "ภาพปกคอร์สเพียง 1 ภาพ",
      "คะแนนสอบอย่างเดียว",
      "ไฟล์ attendance เท่านั้น",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-pretest-2",
    question: "Mission 2 เน้นสิ่งใดมากที่สุด",
    options: [
      "บันทึกหลังการใช้แผนการจัดการเรียนรู้",
      "ออกแบบโลโก้ใหม่",
      "เปลี่ยนชื่อคอร์ส",
      "ทำรายงานการเงิน",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-pretest-3",
    question: "Mission 3 ของ Module 5 มุ่งไปที่อะไร",
    options: [
      "แนวทางพัฒนา/ต่อยอดแผนหรือนวัตกรรม",
      "เริ่มวิเคราะห์ SWOT ใหม่ทั้งหมด",
      "ตัดขั้น PLC ออก",
      "ยกเลิกการทดลองใช้",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-pretest-4",
    question: "คะแนนผ่าน post-test ของ Module 5 คือเท่าไร",
    options: ["2 คะแนน", "3 คะแนน", "4 คะแนน", "5 คะแนน"],
    correctAnswer: 1,
  },
  {
    id: "module5-pretest-5",
    question: "เมื่อจบ Module 5 แล้ว จะปลดล็อกอะไรต่อ",
    options: ["กลับไป Module 2", "Post-test ปลายคอร์ส", "หน้า Admin", "SOS Queue"],
    correctAnswer: 1,
  },
];

export const moduleFivePostTestQuestions = [
  {
    id: "module5-posttest-1",
    question: "หลักฐานจากการสอนจริงช่วยครูมากที่สุดในด้านใด",
    options: [
      "เห็นทั้งจุดแข็งและจุดที่ต้องปรับจากสถานการณ์จริง",
      "ทำให้ข้ามการสะท้อนผลได้",
      "ใช้แทน feedback ได้ทั้งหมด",
      "ทำให้ไม่ต้องมีแผนต่อยอด",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-posttest-2",
    question: "บันทึกหลังสอนที่ดีควรมีอะไรอย่างน้อย",
    options: [
      "สิ่งที่เกิดขึ้นจริง ผลตอบรับ และบทเรียนที่ได้",
      "เฉพาะชื่อบทเรียน",
      "เฉพาะรายชื่อผู้เรียน",
      "เฉพาะลิงก์วิดีโอ",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-posttest-3",
    question: "แนวทางต่อยอดที่มีคุณภาพควรเป็นแบบใด",
    options: [
      "มีเป้าหมายชัด ปรับจาก evidence และระบุสิ่งที่จะลองรอบถัดไป",
      "เปลี่ยนทุกอย่างโดยไม่มีเหตุผล",
      "หยุดพัฒนาเมื่อสอนเสร็จ",
      "เลื่อนการปรับปรุงออกไปไม่มีกำหนด",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-posttest-4",
    question: "เหตุผลสำคัญที่ Module 5 ต้องมี reflection report card คืออะไร",
    options: [
      "เพื่อสรุปผลการลงมือทำจริงและใช้ต่อยอดสู่การรับรองผลลัพธ์",
      "เพื่อแทนที่ certificate",
      "เพื่อหลีกเลี่ยงการประเมิน",
      "เพื่อใช้เฉพาะในหน้า admin เท่านั้น",
    ],
    correctAnswer: 0,
  },
  {
    id: "module5-posttest-5",
    question: "เมื่อผ่าน Module 5 post-test แล้ว ผู้เรียนจะได้รับอะไร",
    options: [
      "RE-Reflection Badge และสิทธิ์เข้าสู่ post-test ปลายคอร์ส",
      "Certificate ทันทีโดยไม่ต้องสอบปลายคอร์ส",
      "การ reset course",
      "ปิดการบันทึกคำตอบ",
    ],
    correctAnswer: 0,
  },
];

const moduleFiveMentor = {
  pretest: {
    intro:
      "AI Mentor: Module 5 is where your work becomes evidence. We are no longer imagining the classroom. We are looking at what really happened, what changed, and what should evolve next.",
    reward: "Reflection gate cleared",
  },
  briefing: {
    intro:
      "AI Mentor: Watch this lesson deck as a debrief before the final reflection sprint. Capture what happened in the real room, honor the progress, and turn the next move into a practical upgrade plan.",
    reward: "Reflection brief unlocked",
  },
  missionOne: {
    intro:
      "AI Mentor: Start with the evidence from real practice. The clip is not just proof of action, it is the doorway to seeing your classroom with fresh eyes.",
    reward: "Teaching evidence logged",
  },
  missionTwo: {
    intro:
      "AI Mentor: Reflection becomes powerful when it is concrete. Name the moment you are proud of, the challenge that stretched you, and what the learners made visible.",
    reward: "Reflection journal saved",
  },
  missionThree: {
    intro:
      "AI Mentor: Version 2.0 does not need to be dramatic. Choose the next improvement that matters most, then define the support and timeline that will make it real.",
    reward: "Growth path mapped",
  },
  posttest: {
    intro:
      "AI Mentor: This final module check confirms that you can move from implementation to reflection and from reflection to a better next cycle. Finish this and the course post-test opens for you.",
    reward: "Reflection badge ready",
  },
};

export const moduleFiveModuleMeta = {
  title: "Module 5: Re - Reflection : สะท้อนผล",
  description:
    "นำแผนที่ออกแบบไว้ไปใช้จริงในห้องเรียน เก็บหลักฐานจากคลิปการสอน บันทึกหลังสอน วิเคราะห์สิ่งที่เกิดขึ้นจริง และกำหนดแนวทางต่อยอดสู่รอบพัฒนาถัดไป",
  campaignName: "Reflection Relay",
};

const missionTitleById = {
  "m5-mission-1": "Mission 1: ใช้แผนที่ออกแบบไว้ไปสอนจริงในห้องเรียน",
  "m5-mission-2": "Mission 2: บันทึกหลังการใช้แผนการจัดการเรียนรู้",
  "m5-mission-3": "Mission 3: แนวทางการพัฒนา/ต่อยอด",
};

export const moduleFiveLessons = [
  {
    id: "m5-pretest",
    title: "5.0 Pre-test: Reflection Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPretest: true,
      passScore: 0,
      questionsCount: 5,
      questions: moduleFivePreTestQuestions,
      aiMentor: moduleFiveMentor.pretest,
      description:
        "ตอบคำถาม 5 ข้อเพื่อเช็กความพร้อมก่อนเข้าสู่บทเรียนสรุปผล การใช้แผนจริง และการสร้าง reflection evidence ของ Module 5",
      gamification: checkpointProfile({
        arc: "Reflection Gate",
        xp: 70,
        reward: "Module 5 lesson deck access",
        badge: "Reflection Scout",
        objective:
          "ผ่านจุดตรวจเริ่มต้นเพื่อเปิดบทเรียน Module 5 และเส้นทางสรุปผลจากการสอนจริง",
      }),
    },
  },
  {
    id: "m5-lesson-brief",
    title: "5.1 RE-Reflection Lesson Brief",
    type: "video",
    iconName: "PlayCircle",
    content: {
      videoUrl:
        "https://www.canva.com/design/DAHFgqmbbOo/SOLFw8FFKEblrDUr3_1UQg/view",
      frameLabel: "RE-Reflection Lesson Deck",
      externalUrl:
        "https://www.canva.com/design/DAHFgqmbbOo/SOLFw8FFKEblrDUr3_1UQg/view",
      description:
        "ทบทวนบทเรียน Module 5 หลัง pre-test แล้วเดินเข้าสู่ 3 ภารกิจ ได้แก่ การใช้แผนจริง การบันทึกหลังสอน และการออกแบบแนวทางพัฒนารอบถัดไป",
      campaignStep: 1,
      campaignStages: moduleFiveStages,
      aiMentor: moduleFiveMentor.briefing,
      gamification: checkpointProfile({
        arc: "Reflection Briefing",
        xp: 80,
        reward: "Lesson deck + evidence roadmap",
        badge: "Field Observer",
        objective:
          "เข้าใจขั้นตอนของ Module 5 ก่อนเริ่มเก็บหลักฐานจริงและแปลงผลการสอนเป็นแผนต่อยอด",
      }),
    },
  },
  {
    id: "m5-mission-1",
    title: "Mission 1: Teach the Plan in the Real Classroom",
    type: "activity",
    activityType: "module5_real_classroom",
    iconName: "Video",
    content: {
      missionKey: "missionOne",
      campaignStep: 1,
      campaignStages: moduleFiveStages,
      aiMentor: moduleFiveMentor.missionOne,
      gamification: missionProfile({
        arc: "Real Classroom Sprint",
        xp: 220,
        reward: "Evidence clip logged",
        badge: "Field Runner",
        objective:
          "ใช้แผน 30 วันหรือนวัตกรรมที่ออกแบบไว้ไปสอนจริง และแนบหลักฐานการสอนเพื่อยืนยันการลงมือทำในบริบทจริง",
        deliverable:
          "คลิปการสอนจริง 50-60 นาที พร้อมข้อมูลบริบทชั้นเรียนและสิ่งที่ต้องการให้ DU เห็นจากการสอนครั้งนี้",
        duSignal:
          "DU จะใช้ภารกิจนี้ดู evidence การสอนจริงและเชื่อมกลับไปยังแผน/นวัตกรรมที่คุณพัฒนามาตลอดทั้งคอร์ส",
        checkpoints: [
          "แนบลิงก์คลิปหรือไฟล์หลักฐานการสอนจริง",
          "บอกวันสอน ระยะเวลา และบริบทชั้นเรียน",
          "สรุปเป้าหมายการเรียนรู้ที่ตั้งใจให้เกิดในคาบนี้",
        ],
      }),
    },
  },
  {
    id: "m5-mission-2",
    title: "Mission 2: Reflection Log",
    type: "activity",
    activityType: "module5_reflection_log",
    iconName: "FileText",
    content: {
      missionKey: "missionTwo",
      campaignStep: 2,
      campaignStages: moduleFiveStages,
      aiMentor: moduleFiveMentor.missionTwo,
      gamification: missionProfile({
        arc: "Reflection Log",
        xp: 210,
        reward: "After-action note completed",
        badge: "Sense Maker",
        objective:
          "บันทึกสิ่งที่เกิดขึ้นจริงหลังการใช้แผนการจัดการเรียนรู้ ทั้งจุดเด่น ผลตอบรับของผู้เรียน และจุดที่ยังต้องปรับ",
        deliverable:
          "บันทึกหลังสอนที่สะท้อนทั้งผลลัพธ์ จุดภูมิใจ ความท้าทาย และหลักฐานที่ช่วยยืนยันข้อค้นพบ",
        duSignal:
          "DU สามารถอ่าน reflection log เพื่อให้ feedback ที่สอดคล้องกับบริบทจริงมากขึ้น ไม่ใช่ดูเพียงเอกสารแผน",
        checkpoints: [
          "เล่าให้เห็นว่าอะไรเกิดขึ้นจริงในห้องเรียน",
          "บอกทั้งสิ่งที่สำเร็จและสิ่งที่ยังติดขัด",
          "เชื่อมบทเรียนที่ได้เข้ากับหลักฐานหรือสังเกตการณ์จริง",
        ],
      }),
    },
  },
  {
    id: "m5-mission-3",
    title: "Mission 3: Growth Path",
    type: "activity",
    activityType: "module5_growth_path",
    iconName: "Sparkles",
    content: {
      missionKey: "missionThree",
      campaignStep: 3,
      campaignStages: moduleFiveStages,
      aiMentor: moduleFiveMentor.missionThree,
      gamification: missionProfile({
        arc: "Growth Path",
        xp: 220,
        reward: "Version 2.0 plan mapped",
        badge: "Next-Step Designer",
        objective:
          "กำหนดแนวทางพัฒนา/ต่อยอดแผนการจัดการเรียนรู้หรือนวัตกรรม ให้เห็นภาพรอบพัฒนาถัดไปอย่างชัดเจน",
        deliverable:
          "แผนต่อยอดเวอร์ชันถัดไป พร้อมจุดปรับหลัก ตัวช่วยที่ต้องใช้ และกรอบเวลาที่จะเริ่มลงมือ",
        duSignal:
          "DU ใช้ growth path นี้ในการติดตามรอบถัดไปและเชื่อมการสนับสนุนให้ตรงกับสิ่งที่คุณต้องการจริง",
        checkpoints: [
          "ระบุสิ่งที่จะยกระดับเป็นเวอร์ชัน 2.0",
          "ตั้งกรอบเวลาและตัวช่วยที่ต้องการ",
          "สรุปผลลัพธ์ที่อยากเห็นในการลองรอบถัดไป",
        ],
      }),
    },
  },
  {
    id: "m5-posttest",
    title: "Post-test: RE-Reflection Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPosttest: true,
      passScore: 3,
      maxAttempts: 5,
      questionsCount: 5,
      questions: moduleFivePostTestQuestions,
      aiMentor: moduleFiveMentor.posttest,
      badgeReward: MODULE_FIVE_BADGE,
      unlockTitle: MODULE_FIVE_UNLOCK_TITLE,
      description:
        "ตอบคำถาม 5 ข้อ เก็บอย่างน้อย 3 คะแนน เพื่อรับ RE-Reflection Badge สร้าง report card ของ Module 5 และปลดล็อก post-test ปลายคอร์ส",
      campaignStep: 4,
      campaignStages: moduleFiveStages,
      gamification: checkpointProfile({
        arc: "Reflection Checkpoint",
        xp: 150,
        reward: "RE-Reflection Badge + final post-test unlock",
        badge: "Reflection Finisher",
        objective:
          "ยืนยันว่าคุณสามารถสรุปผลจากการสอนจริง บันทึกบทเรียน และออกแบบรอบพัฒนาถัดไปได้อย่างมีหลักฐานรองรับ",
      }),
    },
  },
];

export const buildModuleFiveReportCard = (
  missionResponses = {},
  scoreMeta = {},
  trainee = {},
) => {
  const generatedAt = new Date().toISOString();
  const missionOne = missionResponses["m5-mission-1"] || {};
  const missionTwo = missionResponses["m5-mission-2"] || {};
  const missionThree = missionResponses["m5-mission-3"] || {};

  return {
    generatedAt,
    badge: MODULE_FIVE_BADGE,
    unlockedModule: MODULE_FIVE_UNLOCK_TITLE,
    traineeName: trainee.name || trainee.displayName || trainee.email || "InSPIRE Learner",
    traineeEmail: trainee.email || "",
    cardSerial:
      trainee.cardSerial ||
      generateModuleFiveCardSerial(trainee.uid || trainee.email || "USER", generatedAt),
    title: moduleFiveModuleMeta.title,
    implementationTitle:
      missionOne.lessonPlanTitle || missionOne.learningFocus || missionTwo.lessonPlanTitle || "",
    score: scoreMeta.score ?? 0,
    totalQuestions: scoreMeta.totalQuestions ?? 0,
    sections: [
      {
        kind: "implementation",
        title: missionTitleById["m5-mission-1"],
        content: missionOne,
      },
      {
        kind: "reflection",
        title: missionTitleById["m5-mission-2"],
        content: missionTwo,
      },
      {
        kind: "growth",
        title: missionTitleById["m5-mission-3"],
        content: missionThree,
      },
    ],
  };
};
