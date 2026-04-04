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

export const MODULE_THREE_BADGE = "P-PLC Badge";
export const MODULE_THREE_REPORT_KEY = "module3";
export const MODULE_THREE_UNLOCK_TITLE = "Module 4: I - Innovation";

export const generateModuleThreeCardSerial = (uid = "USER", generatedAt = new Date().toISOString()) => {
  const safeUid = String(uid || "USER").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6) || "USER03";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `PPLC-${dateCode}-${safeUid}`;
};

export const moduleThreeStages = [
  {
    step: 1,
    label: "Step 1",
    title: "Idea Billboard",
    helper: "ประกาศแผน 30 วันของตัวเองให้เครือข่ายเห็นและชวนมองต่อ",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Mastermind",
    helper: "อ่านไอเดียเพื่อน สวมบทบาท และให้ feedback แบบ asynchronous",
  },
  {
    step: 3,
    label: "Step 3",
    title: "60-Second Spell",
    helper: "ย่อยไอเดียที่ได้ feedback แล้วให้เหลือแก่นที่ขายได้ใน 1 นาที",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Reflection Mirror",
    helper: "สะท้อนพลังของเครือข่ายก่อนปลดล็อกไปสู่การพัฒนานวัตกรรม",
  },
];

export const moduleThreePreTestQuestions = [
  {
    id: "module3-pretest-1",
    question: "Mission 1 ของ Module 3 ต้องการให้ครูทำสิ่งใดเป็นหลัก",
    options: [
      "จัดประชุมพร้อมกันทั้งทีม",
      "โพสต์แผน 30 วันลงกระดานเพื่อเปิดรับมุมมองใหม่",
      "ส่งใบงานให้ DU ตรวจ",
      "ทำ post-test ทันที",
    ],
    correctAnswer: 1,
  },
  {
    id: "module3-pretest-2",
    question: "Mission 2 เน้น PLC แบบใด",
    options: ["Asynchronous PLC", "Synchronous PLC", "Solo Reflection", "Direct Coaching Only"],
    correctAnswer: 0,
  },
  {
    id: "module3-pretest-3",
    question: "The Mastermind Comments กำหนดให้ต้องคอมเมนต์อย่างน้อยกี่โพสต์",
    options: ["1 โพสต์", "2 โพสต์", "3 โพสต์", "4 โพสต์"],
    correctAnswer: 1,
  },
  {
    id: "module3-pretest-4",
    question: "The 60-Second Spell ให้ย่อยไอเดียออกมาในรูปแบบใด",
    options: [
      "บทความ 1 หน้า",
      "สคริปต์และลิงก์เสียง/วิดีโอไม่เกินประมาณ 1-1.5 นาที",
      "อินโฟกราฟิก",
      "ข้อสอบปรนัย",
    ],
    correctAnswer: 1,
  },
  {
    id: "module3-pretest-5",
    question: "Reflection Mirror ปิดท้ายเพื่อสะท้อนอะไร",
    options: [
      "คะแนนสอบของผู้เรียน",
      "พลังหรือมุมมองใหม่ที่ได้จากเครือข่ายครู",
      "งบประมาณโครงการ",
      "ตารางประชุมของโรงเรียน",
    ],
    correctAnswer: 1,
  },
];

const plcRoles = [
  {
    id: "challenger",
    label: "ผู้ท้าทาย",
    starter: "[ผู้ท้าทาย]",
    tone:
      "คอมเมนต์เชิงตั้งคำถามเพื่อต่อยอด เช่น ไอเดียดีมากครับ แต่ถ้าเด็กกลุ่มอ่อนตามไม่ทัน เราจะปรับตรงไหนได้บ้าง?",
  },
  {
    id: "alchemist",
    label: "นักแปรธาตุ",
    starter: "[นักแปรธาตุ]",
    tone:
      "คอมเมนต์เสนอไอเดีย สื่อ หรือเครื่องมือเพิ่มเติม เช่น ลองใช้แอป Wordwall ผสมเข้าไปด้วยไหมคะ เด็กๆ น่าจะสนุกขึ้น",
  },
  {
    id: "defender",
    label: "ผู้พิทักษ์",
    starter: "[ผู้พิทักษ์]",
    tone:
      "คอมเมนต์ชื่นชมจุดแข็งของแผนและให้กำลังใจ เช่น ชอบการเชื่อมโยงกับชุมชนมากครับ เป็นแผนที่เป็นไปได้จริง",
  },
];

const moduleThreeMentor = {
  pretest: {
    intro:
      "AI Mentor: ก่อนเข้าสภา PLC ลองเช็กฐานความเข้าใจสั้นๆ ก่อนนะครับ แล้วเราจะพาแผนจาก Module 2 ออกไปคุยกับเครือข่ายจริงแบบไม่ต้องรอประชุมพร้อมกัน",
    reward: "Council gate cleared",
  },
  briefing: {
    intro:
      "AI Mentor: Module นี้ไม่ได้วัดว่าใครเก่งกว่าใครครับ แต่วัดว่าเรากล้าเปิดไอเดีย รับ feedback และเปลี่ยนเครือข่ายให้กลายเป็นพลังขับเคลื่อนแผนได้แค่ไหน",
    reward: "Council map unlocked",
  },
  missionOne: {
    intro:
      "AI Mentor: ลองย่อของดีจาก Module 2 ให้กลายเป็นโพสต์ที่คนเห็นแล้วเข้าใจทันทีนะครับ ยิ่งชัด เพื่อนครูก็ยิ่งช่วยต่อยอดให้เราได้ตรงจุด",
    reward: "Billboard lit",
  },
  missionTwo: {
    intro:
      "AI Mentor: รอบนี้เราไม่ได้เข้าไปตัดสินใครครับ แต่เข้าไปเป็นเพื่อนร่วมคิด ลองเลือกบทบาทแล้วคอมเมนต์ให้เกิดมุมมองใหม่ที่ใช้งานได้จริง",
    reward: "Mastermind echo collected",
  },
  missionThree: {
    intro:
      "AI Mentor: ตอนนี้คุณมีทั้งไอเดียตั้งต้นและ feedback จากเครือข่ายแล้ว ถึงเวลาย่อยให้เหลือแก่นที่ฟังแล้วอยากสนับสนุนทันทีครับ",
    reward: "Spell cast ready",
  },
  posttest: {
    intro:
      "AI Mentor: ก่อนออกจากสภา ลองมองย้อนดูว่าพลังของเครือข่ายเติมอะไรให้โปรเจกต์ของคุณบ้าง การสะท้อนครั้งนี้จะช่วยให้ก้าวต่อไปชัดขึ้นมากครับ",
    reward: "Badge ready",
  },
};

export const moduleThreeModuleMeta = {
  title: "Module 3: P - PLC : รวมพลัง สร้างเครือข่ายแห่งการเรียนรู้",
  description:
    "เปิดพื้นที่ PLC แบบ asynchronous ให้คุณครูได้ประกาศไอเดีย แลกเปลี่ยน feedback ผ่านบทบาทสมมติ ฝึก pitch และสะท้อนคุณค่าของเครือข่ายครู",
  campaignName: "P-PLC Council",
};

export const moduleThreeLessons = [
  {
    id: "m3-pretest",
    title: "3.0 Pre-test: PLC Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPretest: true,
      passScore: 0,
      questionsCount: 5,
      questions: moduleThreePreTestQuestions,
      aiMentor: moduleThreeMentor.pretest,
      description: "เช็กความเข้าใจก่อนเข้าสู่ Module 3 แล้วค่อยเปิดบทเรียน Canva และวง PLC แบบ asynchronous",
      gamification: checkpointProfile({
        arc: "Council Gate",
        xp: 70,
        reward: "PLC lesson deck access",
        badge: "Council Scout",
        objective: "เตรียมตัวก่อนออกไปแลกเปลี่ยนแผนกับเครือข่ายครูใน Module 3",
      }),
    },
  },
  {
    id: "m3-lesson-brief",
    title: "3.1 P-PLC Lesson Brief",
    type: "video",
    iconName: "PlayCircle",
    content: {
      videoUrl: "https://www.canva.com/design/DAHFglrceqA/WbTYzz93vBYgo8m30raOQg/watch?embed",
      frameLabel: "P-PLC Lesson Deck",
      externalUrl: "https://www.canva.com/design/DAHFglrceqA/WbTYzz93vBYgo8m30raOQg/watch?embed",
      description:
        "ดูบทเรียนเปิดทางของ Module 3 หลังจบ pre-test เพื่อเข้าใจแนวคิด PLC แบบ asynchronous ก่อนเริ่มโพสต์ แลกเปลี่ยน feedback และฝึก pitch",
      campaignStep: 1,
      campaignStages: moduleThreeStages,
      aiMentor: moduleThreeMentor.briefing,
      gamification: checkpointProfile({
        arc: "Council Briefing",
        xp: 80,
        reward: "Lesson deck + PLC mission map",
        badge: "Network Seeker",
        objective: "ดูบทเรียนเตรียมโหมดคิดก่อนเข้าสู่ PLC mission ของ Module 3",
      }),
    },
  },
  {
    id: "m3-mission-1",
    title: "Mission 1: The Idea Billboard",
    type: "activity",
    activityType: "module3_idea_billboard",
    iconName: "PenTool",
    content: {
      missionKey: "missionOne",
      campaignStep: 1,
      campaignStages: moduleThreeStages,
      aiMentor: moduleThreeMentor.missionOne,
      boardUrl: "https://padlet.com/g91ytl0xhuk8qx3a",
      gamification: missionProfile({
        arc: "Idea Billboard",
        xp: 190,
        reward: "Council visibility + peer signal unlock",
        badge: "Idea Herald",
        objective:
          "นำแผน 30 วันจาก Module 2 ไปโพสต์บนกระดานสภาเวทมนตร์ ให้เครือข่ายได้รับรู้และพร้อมช่วยมองต่อ",
        deliverable:
          "โพสต์ 1 ชิ้นที่มี Pain Point, Solution และคำถามขอคำแนะนำ พร้อมลิงก์โพสต์หรือหลักฐานการเผยแพร่",
        duSignal:
          "DU จะเห็นจุดตั้งต้นของโปรเจกต์แต่ละคนอย่างกระชับ และรู้ว่าควรส่งแรงหนุนหรือผู้เชี่ยวชาญเข้าไปในประเด็นใด",
        checkpoints: [
          "สรุป Pain Point ให้เห็นชัดใน 1-2 บรรทัด",
          "ย่อแผน 30 วันให้คนอ่านเข้าใจว่าคุณจะทำอะไร",
          "ระบุคำถามหรือจุดที่อยากให้เพื่อนครูช่วยแนะนำ",
        ],
      }),
    },
  },
  {
    id: "m3-mission-2",
    title: "Mission 2: The Mastermind Comments",
    type: "activity",
    activityType: "module3_mastermind_comments",
    iconName: "Users",
    content: {
      missionKey: "missionTwo",
      campaignStep: 2,
      campaignStages: moduleThreeStages,
      aiMentor: moduleThreeMentor.missionTwo,
      padletEmbedUrl: "https://padlet.com/embed/g91ytl0xhuk8qx3a",
      roles: plcRoles,
      gamification: missionProfile({
        arc: "Mastermind Chamber",
        xp: 210,
        reward: "Feedback echoes + perspective unlock",
        badge: "Council Contributor",
        objective:
          "เลือกอ่านโพสต์เพื่อนอย่างน้อย 2 โพสต์ แล้วให้ feedback แบบสร้างสรรค์ผ่านบทบาทสมมติ เพื่อให้เกิด PLC โดยไม่ต้องนัดเวลา",
        deliverable:
          "หลักฐานการคอมเมนต์ 2 โพสต์ พร้อมบทบาทที่ใช้ มุมมองที่เสนอ และภาพ Screenshot การมีส่วนร่วม",
        duSignal:
          "DU จะเห็นคุณภาพของการแลกเปลี่ยนในเครือข่าย ไม่ใช่แค่จำนวนโพสต์ ว่าครูกำลังหนุนกันในลักษณะใด",
        checkpoints: [
          "เลือกอ่านอย่างน้อย 2 โพสต์จากเพื่อนครู",
          "คอมเมนต์ด้วยบทบาทที่ชัดเจนในแต่ละครั้ง",
          "แนบหลักฐานการมีส่วนร่วมครบ 2 โพสต์",
        ],
      }),
    },
  },
  {
    id: "m3-mission-3",
    title: "Mission 3: The 60-Second Spell",
    type: "activity",
    activityType: "module3_spell_pitch",
    iconName: "PenTool",
    content: {
      missionKey: "missionThree",
      campaignStep: 3,
      campaignStages: moduleThreeStages,
      aiMentor: moduleThreeMentor.missionThree,
      gamification: missionProfile({
        arc: "Pitch Spell",
        xp: 220,
        reward: "Pitch crystal + sponsor-ready signal",
        badge: "Spell Caster",
        objective:
          "นำไอเดียตั้งต้นและ feedback จากเพื่อนในสภามาย่อยให้เหลือแก่น แล้วฝึกสื่อสารให้คนอยากซื้อไอเดียภายใน 1 นาที",
        deliverable:
          "สคริปต์ 4 ช่วง Hook, Pain Point, Solution, Impact พร้อมลิงก์ไฟล์เสียงหรือวิดีโอไม่เกินประมาณ 1-1.5 นาที",
        duSignal:
          "DU จะเห็นว่าคุณครูสามารถสื่อสารโปรเจกต์ได้ชัดแค่ไหน และควรช่วยเชื่อมทรัพยากรหรือผู้สนับสนุนต่ออย่างไร",
        checkpoints: [
          "ร่างสคริปต์ทั้ง 4 ส่วนให้ครบ",
          "อธิบายให้เห็นว่า feedback จากเพื่อนถูกนำมาปรับในแผนอย่างไร",
          "แนบลิงก์เสียงหรือวิดีโอสำหรับ pitch จริง",
        ],
      }),
    },
  },
  {
    id: "m3-posttest",
    title: "Post-test: The Reflection Mirror",
    type: "activity",
    activityType: "module3_reflection_mirror",
    iconName: "CheckSquare",
    content: {
      missionKey: "posttest",
      campaignStep: 4,
      campaignStages: moduleThreeStages,
      aiMentor: moduleThreeMentor.posttest,
      question:
        "จากการได้อ่านไอเดียและแลกเปลี่ยนคอมเมนต์กับเพื่อนครูในครั้งนี้ คุณครูค้นพบ 'พลังวิเศษ หรือ มุมมองใหม่' อะไรจากเครือข่ายที่ช่วยเติมเต็มให้โปรเจกต์ของคุณครูสมบูรณ์และเป็นไปได้จริงมากยิ่งขึ้น?",
      badgeReward: MODULE_THREE_BADGE,
      unlockTitle: MODULE_THREE_UNLOCK_TITLE,
      gamification: checkpointProfile({
        arc: "Reflection Mirror",
        xp: 150,
        reward: "P-PLC Badge + Module 4 unlock",
        badge: "PLC Finisher",
        objective: "สะท้อนคุณค่าของเครือข่ายครูและปิดวง PLC ก่อนก้าวต่อไปสู่ Module 4",
      }),
    },
  },
];

const missionTitleById = Object.fromEntries(moduleThreeLessons.map((lesson) => [lesson.id, lesson.title]));

export const buildModuleThreeReportCard = (missionResponses = {}, trainee = {}) => {
  const generatedAt = new Date().toISOString();
  const missionOne = missionResponses["m3-mission-1"] || {};
  const missionTwo = missionResponses["m3-mission-2"] || {};
  const missionThree = missionResponses["m3-mission-3"] || {};
  const reflection = missionResponses["m3-posttest"] || {};

  return {
    generatedAt,
    badge: MODULE_THREE_BADGE,
    unlockedModule: MODULE_THREE_UNLOCK_TITLE,
    traineeName: trainee.name || trainee.displayName || trainee.email || "InSPIRE Learner",
    traineeEmail: trainee.email || "",
    cardSerial:
      trainee.cardSerial ||
      generateModuleThreeCardSerial(trainee.uid || trainee.email || "USER", generatedAt),
    title: moduleThreeModuleMeta.title,
    projectName: missionThree.projectName || missionOne.projectName || "",
    sections: [
      {
        kind: "billboard",
        title: missionTitleById["m3-mission-1"],
        content: missionOne,
      },
      {
        kind: "comments",
        title: missionTitleById["m3-mission-2"],
        content: missionTwo,
      },
      {
        kind: "pitch",
        title: missionTitleById["m3-mission-3"],
        content: missionThree,
      },
      {
        kind: "reflection",
        title: missionTitleById["m3-posttest"],
        content: reflection,
      },
    ],
  };
};
