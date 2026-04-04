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

export const MODULE_TWO_BADGE = "S-Design Badge";
export const MODULE_TWO_REPORT_KEY = "module2";
export const MODULE_TWO_UNLOCK_TITLE = "Module 3: P - PLC";

export const generateModuleTwoCardSerial = (uid = "USER", generatedAt = new Date().toISOString()) => {
  const safeUid = String(uid || "USER").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6) || "USER02";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `SDESIGN-${dateCode}-${safeUid}`;
};

export const moduleTwoStages = [
  {
    step: 1,
    label: "Step 1",
    title: "Dream Lab",
    helper: "ปล่อยไอเดีย TOWS แบบไร้กรอบและดึงพลังจาก Module 1",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Vibe Check",
    helper: "ทำภาพจำของห้องเรียนในฝันให้เห็น ฟัง และรู้สึกได้",
  },
  {
    step: 3,
    label: "Step 3",
    title: "30-Day Sprint",
    helper: "แตกแผน 30 วันเป็น 4 สัปดาห์ที่มี quick win ชัดเจน",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Pitch Deck",
    helper: "สรุปโปรเจกต์ให้สั้น ชัด เห็นภาพ ผ่านกรอบ 5W1H",
  },
  {
    step: 5,
    label: "Step 5",
    title: "SMART Goal",
    helper: "กลั่นให้เหลือคำมั่นสัญญาที่วัดผลได้จริงในบริบทจริง",
  },
  {
    step: 6,
    label: "Step 6",
    title: "Quality Lens",
    helper: "ตรวจผลกระทบผ่านเลนส์โลก ชาติ และพื้นที่ก่อนปล่อยจริง",
  },
];

export const moduleTwoPreTestQuestions = [
  {
    id: "module2-pretest-1",
    question: "Mission ใดของ Module 2 ใช้กรอบ TOWS Matrix เป็นฐานการคิดตั้งต้น",
    options: [
      "Mission 1: Dream Lab & TOWS Matrix",
      "Mission 3: Mapping the Journey",
      "Mission 5: SMART Objective",
      "Mission 6: SMART Quality Check",
    ],
    correctAnswer: 0,
  },
  {
    id: "module2-pretest-2",
    question: "Vibe Check ต้องทำให้ภาพโครงการชัดผ่านกี่ผัสสะ",
    options: ["2 ผัสสะ", "3 ผัสสะ", "4 ผัสสะ", "5 ผัสสะ"],
    correctAnswer: 1,
  },
  {
    id: "module2-pretest-3",
    question: "Roadmap ใน Module 2 ถูกออกแบบเป็น sprint ระยะกี่วัน",
    options: ["14 วัน", "21 วัน", "30 วัน", "90 วัน"],
    correctAnswer: 2,
  },
  {
    id: "module2-pretest-4",
    question: "กรอบ 5W1H ใน Module 2 มีหน้าที่หลักเพื่ออะไร",
    options: [
      "ใช้ให้คะแนนผู้เรียน",
      "ใช้เขียนคำโปรยโปรเจกต์ให้อ่านแล้วเข้าใจทันที",
      "ใช้แทน SMART Goal",
      "ใช้แทน Post-test",
    ],
    correctAnswer: 1,
  },
  {
    id: "module2-pretest-5",
    question: "Mission 6 ใช้เลนส์ตรวจสอบคุณภาพทั้งหมดกี่ระดับ",
    options: ["2 ระดับ", "3 ระดับ", "4 ระดับ", "5 ระดับ"],
    correctAnswer: 1,
  },
];

export const moduleTwoPostTestQuestions = [
  {
    id: "module2-posttest-1",
    question: "Dream Lab ใน Module 2 ต้องการอะไรเป็นผลลัพธ์หลัก",
    options: [
      "รวบรวมงบประมาณของโครงการ",
      "สร้างไอเดียเชิงกลยุทธ์จากมุม SO, WO, ST, WT",
      "สรุปคะแนน post-test ของ Module 1",
      "ส่งงานให้ DU อนุมัติทันที",
    ],
    correctAnswer: 1,
  },
  {
    id: "module2-posttest-2",
    question: "คำอธิบาย Visual, Audio และ Feeling อยู่ใน Mission ใด",
    options: ["Mission 1", "Mission 2", "Mission 4", "Mission 5"],
    correctAnswer: 1,
  },
  {
    id: "module2-posttest-3",
    question: "Roadmap 30 วันของ Module 2 แบ่งเป็นกี่สัปดาห์",
    options: ["2 สัปดาห์", "3 สัปดาห์", "4 สัปดาห์", "5 สัปดาห์"],
    correctAnswer: 2,
  },
  {
    id: "module2-posttest-4",
    question: "SMART Objective ที่ดีใน Module 2 ต้องมีองค์ประกอบใดครบ",
    options: [
      "Specific, Measurable, Achievable, Relevant, Time-bound",
      "Simple, Meaningful, Accurate, Rapid, Trackable",
      "Scope, Method, Action, Resource, Timeline",
      "Social, Moral, Active, Reflective, Transferable",
    ],
    correctAnswer: 0,
  },
  {
    id: "module2-posttest-5",
    question: "Mission 6 เพิ่มเลนส์ Local เพื่อช่วยให้โครงการตอบโจทย์อะไร",
    options: [
      "ตอบโจทย์เฉพาะเรื่องคะแนนสอบกลางภาค",
      "ตอบโจทย์บริบทพื้นที่ อ.พบพระ / จ.ตาก และเขตเศรษฐกิจพิเศษชายแดน",
      "ตอบโจทย์การจัดซื้ออุปกรณ์ของโรงเรียนเท่านั้น",
      "ตอบโจทย์การประชุมผู้บริหารรายเดือน",
    ],
    correctAnswer: 1,
  },
];

const dreamLabPrompts = [
  {
    id: "so",
    strategyType: "SO",
    title: "SO (รุกให้สุด)",
    prompt:
      "ถ้าไร้ข้อจำกัด อยากดึง 'ไม้ตาย/ความถนัด' อะไรของตัวเอง มาทำโปรเจกต์ในฝันให้เด็กๆ?",
    guidance:
      "หยิบจุดแข็งจาก Module 1 มาชนกับโอกาสภายนอก แล้วเล่าให้เห็นภาพว่าโครงการในฝันจะพาเด็กไปไกลแค่ไหน",
    relevantLensCodes: ["S", "O"],
  },
  {
    id: "wo",
    strategyType: "WO",
    title: "WO (พลิกจุดอ่อน)",
    prompt:
      "ถ้ามีเวทมนตร์ลบ 'ปัญหาที่เหนื่อยที่สุด' ได้ 1 อย่าง โลกการทำงานจะเปลี่ยนไปแบบไหน? และในโลกจริงเราจะใช้โอกาสอะไรมาช่วยเรื่องนี้?",
    guidance:
      "ตั้งต้นจาก pain point ที่หนักที่สุด แล้วคิดว่าโอกาสรอบตัวอะไรจะช่วยให้จุดอ่อนนั้นเบาลงหรือหายไปได้จริง",
    relevantLensCodes: ["W", "O"],
  },
  {
    id: "st",
    strategyType: "ST",
    title: "ST (ตั้งรับให้มั่น)",
    prompt:
      "ท่ามกลางโลกที่เปลี่ยนไว จะใช้ความเก่งของตัวเองสร้าง 'เกราะป้องกัน' หรือทักษะชีวิตให้เด็กๆ ได้อย่างไร?",
    guidance:
      "หยิบความถนัดของครูมาสร้างภูมิคุ้มกันให้เด็ก ทั้งด้านทักษะชีวิต ความยืดหยุ่น และการอยู่รอดในโลกที่ผันผวน",
    relevantLensCodes: ["S", "T"],
  },
  {
    id: "wt",
    strategyType: "WT",
    title: "WT (ถอยเพื่อสร้างเซฟโซน)",
    prompt:
      "ถ้ายกเลิกระบบประเมินไปได้ อยากออกแบบ 'วัฒนธรรมการทำงานใหม่' แบบไหนให้ครูมีความสุขและเหนื่อยน้อยลง?",
    guidance:
      "มองจุดอ่อนกับแรงกดดันภายนอกพร้อมกัน แล้วออกแบบระบบที่ช่วยลดแรงเสียดทานและทำให้ทีมครูกลับมาหายใจได้",
    relevantLensCodes: ["W", "T"],
  },
];

const vibeCheckSenses = [
  {
    id: "visual",
    title: "Visual",
    prompt: "ตาเห็นอะไร: สภาพแวดล้อม การจัดพื้นที่ หรือท่าทางของเด็กๆ เป็นแบบไหน?",
    placeholder: "เล่าฉากในห้องเรียน เช่น มุมเรียนรู้ สีหน้าเด็ก การเคลื่อนไหว หรือกิจกรรมที่กำลังเกิดขึ้น",
  },
  {
    id: "audio",
    title: "Audio",
    prompt: "หูได้ยินอะไร: บทสนทนา เสียงหัวเราะ หรือระดับความเงียบ/ความครื้นเครงเป็นอย่างไร?",
    placeholder: "อธิบายเสียงที่อยากได้ยิน เช่น คำถามของเด็ก เสียงร่วมมือ เสียงหัวเราะ หรือบรรยากาศสงบแบบมีสมาธิ",
  },
  {
    id: "feeling",
    title: "Feeling",
    prompt: "ใจรู้สึกอย่างไร: มวลอารมณ์รวมๆ ของพื้นที่นั้นเป็นแบบไหน?",
    placeholder: "สรุปความรู้สึกของห้องเรียน เช่น ปลอดภัย เป็นอิสระ ท้าทาย อบอุ่น หรือมั่นใจ",
  },
];

const roadmapWeeks = [
  {
    id: "week1",
    title: "Week 1 (Set Up)",
    focus: "การเตรียมความพร้อม (สื่อ, พื้นที่, หรือการตกลงใจกับเด็กๆ)",
  },
  {
    id: "week2",
    title: "Week 2 (Pilot)",
    focus: "กิจกรรมแรกที่ลงมือทดลองทำจริง",
  },
  {
    id: "week3",
    title: "Week 3 (Feedback)",
    focus: "วิธีการวัดผล ประเมินความรู้สึก และการปรับแก้หน้างาน",
  },
  {
    id: "week4",
    title: "Week 4 (Showcase)",
    focus: "การสรุปผลและเฉลิมฉลองความสำเร็จร่วมกัน",
  },
];

const pitchDeckPrompts = [
  {
    id: "whoWhat",
    title: "Who & What",
    prompt: "ใครคือกลุ่มเป้าหมาย และกิจกรรมหลักคืออะไร (สรุปใน 1-2 ประโยค)",
  },
  {
    id: "whereWhen",
    title: "Where & When",
    prompt: "ใช้พื้นที่ไหน และกรอบเวลาใด",
  },
  {
    id: "why",
    title: "Why",
    prompt: "ทำไมโปรเจกต์นี้ถึงสำคัญ และช่วยทุบ Pain Point อย่างไร",
  },
  {
    id: "how",
    title: "How",
    prompt: "ไม้ตายหรือกระบวนการเด็ดที่จะทำให้เป้าหมายสำเร็จคืออะไร",
  },
];

const smartCriteria = [
  {
    id: "specific",
    label: "S - Specific",
    prompt: "เป้าหมายนี้เจาะจงอะไรให้ชัดที่สุด",
  },
  {
    id: "measurable",
    label: "M - Measurable",
    prompt: "จะวัดผลด้วยตัวเลข พฤติกรรม หรือหลักฐานแบบไหน",
  },
  {
    id: "achievable",
    label: "A - Achievable",
    prompt: "อะไรทำให้เป้าหมายนี้เป็นไปได้จริงในบริบทของคุณ",
  },
  {
    id: "relevant",
    label: "R - Relevant",
    prompt: "เป้าหมายนี้เชื่อมกับ pain point จาก Module 1 อย่างไร",
  },
  {
    id: "timeBound",
    label: "T - Time-bound",
    prompt: "กรอบเวลา 30 วัน หรือ 4 สัปดาห์จะผูกอยู่ตรงไหนของแผน",
  },
];

const qualityLenses = [
  {
    id: "global",
    title: "Global Lens",
    subtitle: "OECD Learning Compass 2030",
    prompt:
      "โปรเจกต์นี้ช่วยสร้าง Student Agency หรือทักษะแห่งอนาคตให้ผู้เรียนอย่างไร?",
    context: [
      "ยืนยันให้เห็นว่าเด็กได้เป็นเจ้าของการเรียนรู้มากขึ้น ไม่ใช่แค่ผู้รับความรู้",
      "เชื่อมกับทักษะคิดวิเคราะห์ ความคิดสร้างสรรค์ การร่วมมือ และการเรียนรู้ที่จะเรียนรู้",
      "ชี้ให้เห็นสมรรถนะเพื่อการเปลี่ยนแปลง เช่น Creating New Value, Reconciling Tensions, Taking Responsibility",
    ],
  },
  {
    id: "national",
    title: "National Lens",
    subtitle: "พระบรมราโชบาย ร.10",
    prompt:
      "โปรเจกต์นี้ปลูกฝังทัศนคติที่ถูกต้อง พื้นฐานชีวิตที่มั่นคง การมีอาชีพ และความเป็นพลเมืองดีในมิติไหนบ้าง?",
    context: [
      "เชื่อมให้เห็นเรื่องคุณธรรม วินัย ความมั่นคงทางอารมณ์ และความรักท้องถิ่น/บ้านเมือง",
      "อธิบายว่ากิจกรรมนี้เตรียมเด็กสู่ทักษะอาชีพ การแก้ปัญหา และทัศนคติที่ดีต่อการทำงานอย่างไร",
      "ยืนยันผลต่อความเป็นพลเมืองดี เช่น ความรับผิดชอบต่อส่วนรวม ความเห็นอกเห็นใจ และการทำหน้าที่ของตนเอง",
    ],
  },
  {
    id: "local",
    title: "Local Lens",
    subtitle: "SEZ ชายแดนตาก / อ.พบพระ / จ.ตาก",
    prompt:
      "โปรเจกต์นี้ช่วยเตรียมความพร้อมให้เด็กในพื้นที่ชายแดนรับมือกับความหลากหลายทางวัฒนธรรม ภาษา ทักษะอาชีพ หรือการค้าชายแดนได้อย่างไร?",
    context: [
      "เชื่อมกับบริบทพื้นที่จริง เช่น การค้าชายแดน ไทย-เมียนมาร์ ภาษา วัฒนธรรม และการบริการ/ท่องเที่ยว",
      "ชี้ให้เห็นทักษะอาชีพ ผู้ประกอบการ ดิจิทัล หรือภาษาคอมพิวเตอร์ที่เด็กจะได้ฝึก",
      "อธิบายผลต่อการอยู่ร่วมกันอย่างเข้าใจความหลากหลายและการพัฒนาพื้นที่อย่างยั่งยืน",
    ],
  },
];

const moduleTwoMentor = {
  pretest: {
    intro:
      "AI Mentor: ก่อนเข้าโหมดออกแบบจริง ลองเช็กฐานความเข้าใจสั้นๆ ก่อนนะครับ แล้วเราจะพาไอเดียจาก Module 1 ไปต่อยอดให้กลายเป็นแผนที่เดินได้จริง",
    reward: "Design gate cleared",
  },
  briefing: {
    intro:
      "AI Mentor: บทเรียนนี้จะช่วยตั้งโหมดคิดแบบนักออกแบบครับ ลองดูให้ครบก่อน แล้วค่อยเข้า Dream Lab เพื่อเปลี่ยน pain point ให้กลายเป็นพื้นที่ทดลองที่น่าตื่นเต้น",
    reward: "Studio map unlocked",
  },
  missionOne: {
    intro:
      "AI Mentor: ตอนนี้เราไม่ได้หาคำตอบที่สมบูรณ์แบบครับ เรากำลังปล่อยให้ความฝันทำงานก่อน ลองใช้จุดแข็ง จุดอ่อน โอกาส และอุปสรรคจาก Module 1 มาเป็นวัตถุดิบสร้าง TOWS แบบไร้ขีดจำกัดดูนะครับ",
    reward: "Dream spark collected",
  },
  missionTwo: {
    intro:
      "AI Mentor: เยี่ยมมากครับ ทีนี้ลองเปลี่ยนไอเดียให้กลายเป็นภาพจำที่ทุกคนรู้สึกได้ ถ้าห้องเรียนนั้นเกิดขึ้นจริง เราอยากเห็นอะไร ได้ยินอะไร และรู้สึกอะไรบ้าง",
    reward: "Vibe board lit",
  },
  missionThree: {
    intro:
      "AI Mentor: ได้ภาพฝันแล้ว เรามาลองทำให้ฝันนี้เดินบนพื้นจริงใน 30 วันกันครับ อย่าคิดให้ใหญ่เกินไป เน้น quick win ที่พาใจทีมไปต่อได้",
    reward: "Sprint map forged",
  },
  missionFour: {
    intro:
      "AI Mentor: ถึงเวลาย่อของดีให้เล่าแล้วคนเห็นภาพทันทีครับ ลองเขียนโปรเจกต์แบบ pitch deck สั้นๆ แต่คมพอที่จะชวนคนอื่นร่วมทางได้",
    reward: "Pitch ready",
  },
  missionFive: {
    intro:
      "AI Mentor: เราจะบีบทุกอย่างให้เหลือคำมั่นสัญญาที่ชัด วัดได้ และทำได้จริงครับ ลองถามตัวเองว่า ถ้าต้องประกาศต่อหน้าเพื่อนครู เป้าหมายนี้จะฟังแล้วมั่นใจแค่ไหน",
    reward: "SMART promise sealed",
  },
  missionSix: {
    intro:
      "AI Mentor: ก่อนปล่อยโปรเจกต์ลงสนาม ลองสวมแว่น 3 ชั้นดูครับ ว่ามันตอบโจทย์ทั้งโลก ทั้งชาติ และทั้งพื้นที่ของเราอย่างสมดุลหรือยัง",
    reward: "Impact lens aligned",
  },
  posttest: {
    intro:
      "AI Mentor: ด่านสุดท้ายของ Module 2 แล้วครับ ทบทวนภาพฝัน แผน 30 วัน SMART goal และ 3 เลนส์คุณภาพให้ครบ แล้วเก็บคะแนนเพื่อรับ S-Design Badge กันเลย",
    reward: "Badge ready",
  },
};

export const moduleTwoModuleMeta = {
  title: "Module 2: S - Design : ออกแบบฝัน ปั้นแผนสู่การพัฒนา",
  description:
    "เปลี่ยนผลวิเคราะห์จาก Module 1 ให้กลายเป็นภาพฝัน แผน 30 วัน คำโปรยโปรเจกต์ เป้าหมาย SMART และการตรวจสอบคุณภาพผ่านบริบทโลก ชาติ และพื้นที่",
  campaignName: "S-Design Studio",
};

export const moduleTwoLessons = [
  {
    id: "m2-pretest",
    title: "2.0 Pre-test: S-Design Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPretest: true,
      passScore: 0,
      questionsCount: 5,
      questions: moduleTwoPreTestQuestions,
      aiMentor: moduleTwoMentor.pretest,
      description:
        "เช็กความเข้าใจก่อนเริ่ม Module 2 แล้วค่อยเข้าสู่บทเรียน Canva และภารกิจออกแบบเต็มรูปแบบ",
      gamification: checkpointProfile({
        arc: "Studio Gate",
        xp: 70,
        reward: "Module 2 lesson deck access",
        badge: "Design Scout",
        objective: "วอร์มเครื่องก่อนเข้าสู่การออกแบบเชิงกลยุทธ์ใน Module 2",
      }),
    },
  },
  {
    id: "m2-lesson-brief",
    title: "2.1 S-Design Lesson Brief",
    type: "video",
    iconName: "PlayCircle",
    content: {
      videoUrl: "https://www.canva.com/design/DAHFggQuQrA/wjrRXDYOTSIPJ65KkbAlLA/watch?embed",
      frameLabel: "S-Design Lesson Deck",
      externalUrl: "https://www.canva.com/design/DAHFggQuQrA/wjrRXDYOTSIPJ65KkbAlLA/watch?embed",
      description:
        "ดูบทเรียนภาพรวมของ Module 2 หลังจบ pre-test เพื่อเซ็ตโหมดคิดแบบนักออกแบบ ก่อนเข้าสู่ภารกิจ Dream Lab, Vibe Check, Roadmap และ SMART Quality Check",
      campaignStep: 1,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.briefing,
      gamification: checkpointProfile({
        arc: "S-Design Briefing",
        xp: 80,
        reward: "Lesson deck + studio guide",
        badge: "Vision Seeker",
        objective: "ดูบทเรียนเปิดทางก่อนเริ่มปั้นไอเดียและแผนงานของ Module 2",
      }),
    },
  },
  {
    id: "m2-mission-1",
    title: "Mission 1: Dream Lab & TOWS Matrix",
    type: "activity",
    activityType: "module2_dream_lab",
    iconName: "Sparkles",
    content: {
      missionKey: "missionOne",
      campaignStep: 1,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionOne,
      prompts: dreamLabPrompts,
      gamification: missionProfile({
        arc: "Dream Lab",
        xp: 220,
        reward: "TOWS spark set + concept unlock",
        badge: "Dream Crafter",
        objective:
          "ใช้ข้อมูล SWOT จาก Module 1 มาจับคู่เป็นไอเดียเชิงกลยุทธ์แบบไร้ข้อจำกัด ผ่านมุม SO, WO, ST และ WT",
        deliverable:
          "คำตอบ Dream Lab 4 มุม ที่พร้อมต่อยอดเป็นภาพฝันและแผนปฏิบัติการจริง",
        duSignal:
          "DU จะเห็นทิศทางไอเดียตั้งต้นของคุณครู ว่าควรส่งแรงหนุนด้านทรัพยากร โค้ช หรือเครือข่ายในจุดไหน",
        checkpoints: [
          "ตอบ SO ให้เห็นโปรเจกต์ในฝันจากจุดแข็ง",
          "ตอบ WO ให้เห็นวิธีพลิก pain point",
          "ตอบ ST และ WT ให้เห็นทั้งเกราะป้องกันและ safe zone",
        ],
      }),
    },
  },
  {
    id: "m2-mission-2",
    title: "Mission 2: Vibe Check",
    type: "activity",
    activityType: "module2_vibe_check",
    iconName: "PenTool",
    content: {
      missionKey: "missionTwo",
      campaignStep: 2,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionTwo,
      senses: vibeCheckSenses,
      gamification: missionProfile({
        arc: "Sensory Board",
        xp: 180,
        reward: "Mood board pulse + classroom vibe lock",
        badge: "Atmosphere Builder",
        objective: "เปลี่ยนไอเดียให้กลายเป็นภาพจำของห้องเรียนในฝันผ่าน 3 ผัสสะ",
        deliverable: "Sensory Board ที่อธิบาย Visual, Audio และ Feeling ได้อย่างเป็นรูปธรรม",
        duSignal: "DU จะมองเห็นภาพเป้าหมายปลายทางของการพัฒนาได้ชัดขึ้นจากภาษาที่จับต้องได้",
        checkpoints: [
          "อธิบายสิ่งที่ตาเห็นในพื้นที่เรียนรู้",
          "อธิบายสิ่งที่อยากได้ยินจากห้องเรียน",
          "อธิบายความรู้สึกรวมของพื้นที่นั้นให้ชัด",
        ],
      }),
    },
  },
  {
    id: "m2-mission-3",
    title: "Mission 3: Mapping the Journey",
    type: "activity",
    activityType: "module2_roadmap",
    iconName: "Flag",
    content: {
      missionKey: "missionThree",
      campaignStep: 3,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionThree,
      weeks: roadmapWeeks,
      gamification: missionProfile({
        arc: "30-Day Sprint",
        xp: 220,
        reward: "Sprint roadmap + quick win tracker",
        badge: "Road Mapper",
        objective:
          "ออกแบบแผนปฏิบัติการระยะสั้น 30 วัน เพื่อแก้ pain point จาก Module 1 ผ่าน 4 สัปดาห์ที่มี quick win ชัดเจน",
        deliverable:
          "Roadmap 4 สัปดาห์ ที่บอกการเตรียมพร้อม ทดลอง วัดผล ปรับแก้ และโชว์เคสได้ชัด",
        duSignal:
          "DU จะใช้ roadmap นี้ติดตามความก้าวหน้าและช่วยแก้อุปสรรคระหว่างทางได้ตรงจุดขึ้น",
        checkpoints: [
          "กำหนด quick win และการลงมือทำของสัปดาห์ที่ 1-2",
          "วางวิธี feedback และหลักฐานการเปลี่ยนแปลงของสัปดาห์ที่ 3",
          "ระบุวิธีสรุปผลและเฉลิมฉลองในสัปดาห์ที่ 4",
        ],
      }),
    },
  },
  {
    id: "m2-mission-4",
    title: "Mission 4: Define 5W1H",
    type: "activity",
    activityType: "module2_pitch_deck",
    iconName: "PenTool",
    content: {
      missionKey: "missionFour",
      campaignStep: 4,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionFour,
      prompts: pitchDeckPrompts,
      gamification: missionProfile({
        arc: "Pitch Deck Forge",
        xp: 170,
        reward: "Project pitch card",
        badge: "Pitch Designer",
        objective: "ย่อแผน 30 วันให้เป็นคำโปรยโปรเจกต์ที่สั้น ชัด และชวนเห็นภาพทันที",
        deliverable: "Project pitch ที่ตอบ Who & What, Where & When, Why และ How ครบ",
        duSignal: "DU จะอ่านแผนของคุณครูแล้วจับประเด็นสนับสนุนได้รวดเร็วขึ้นจาก pitch ที่ชัด",
        checkpoints: [
          "ตั้งชื่อโปรเจกต์ให้สื่อความตั้งใจ",
          "ตอบ 5W1H ให้ครบแบบกระชับ",
          "ทำให้คนอ่านเห็นทั้งกลุ่มเป้าหมายและวิธีสำเร็จ",
        ],
      }),
    },
  },
  {
    id: "m2-mission-5",
    title: "Mission 5: SMART Objective",
    type: "activity",
    activityType: "module2_smart_objective",
    iconName: "CheckSquare",
    content: {
      missionKey: "missionFive",
      campaignStep: 5,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionFive,
      criteria: smartCriteria,
      gamification: missionProfile({
        arc: "Promise Lock",
        xp: 180,
        reward: "SMART promise seal",
        badge: "Goal Architect",
        objective: "สรุปแผนให้เหลือเป้าหมาย SMART ที่วัดผลได้จริงใน 30 วัน",
        deliverable: "คำมั่นสัญญาของโปรเจกต์ 1-2 ประโยค พร้อมเหตุผล SMART ครบ 5 มิติ",
        duSignal: "DU จะใช้ SMART objective นี้เป็น anchor ในการติดตามและโค้ชช่วยระหว่างทาง",
        checkpoints: [
          "เขียนคำมั่นสัญญาของโปรเจกต์ให้ชัด",
          "เชื่อมคำมั่นกับ S-M-A-R-T ครบทุกมิติ",
          "ยืนยันว่าเป้าหมายนี้ทำได้จริงในเวลา 30 วัน",
        ],
      }),
    },
  },
  {
    id: "m2-mission-6",
    title: "Mission 6: SMART Quality Check",
    type: "activity",
    activityType: "module2_quality_check",
    iconName: "ShieldCheck",
    content: {
      missionKey: "missionSix",
      campaignStep: 6,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.missionSix,
      lenses: qualityLenses,
      gamification: missionProfile({
        arc: "Impact Lens",
        xp: 200,
        reward: "Quality check cleared",
        badge: "Impact Navigator",
        objective:
          "ตรวจคุณภาพของโปรเจกต์ผ่านเลนส์ระดับโลก ชาติ และพื้นที่ เพื่อให้แผนนี้มีคุณค่ารอบด้าน",
        deliverable:
          "คำอธิบายผลกระทบ 3 เลนส์ ที่ยืนยันว่าโปรเจกต์นี้ตอบโจทย์ทั้งอนาคต ประเทศ และพื้นที่ของตน",
        duSignal:
          "DU จะเห็นว่ากิจกรรมนี้สามารถเชื่อมเป้าหมายระดับต่างๆ ได้จริง และควรต่อยอดอย่างไรในระดับระบบ",
        checkpoints: [
          "ตอบ Global Lens ให้เห็น Student Agency และทักษะอนาคต",
          "ตอบ National Lens ให้เห็นคุณลักษณะตามพระบรมราโชบาย ร.10",
          "ตอบ Local Lens ให้เห็นความเชื่อมโยงกับบริบท SEZ ชายแดนตาก",
        ],
      }),
    },
  },
  {
    id: "m2-posttest",
    title: "Post-test: S-Design Mission Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPosttest: true,
      passScore: 3,
      maxAttempts: 5,
      questionsCount: 5,
      questions: moduleTwoPostTestQuestions,
      campaignStep: 6,
      campaignStages: moduleTwoStages,
      aiMentor: moduleTwoMentor.posttest,
      badgeReward: MODULE_TWO_BADGE,
      unlockTitle: MODULE_TWO_UNLOCK_TITLE,
      description:
        "ตอบคำถาม 5 ข้อ เก็บอย่างน้อย 3 คะแนน เพื่อปิด Module 2 รับ S-Design Badge และปลดล็อก Module 3",
      gamification: checkpointProfile({
        arc: "Final Design Check",
        xp: 140,
        reward: "S-Design Badge + Module 3 unlock",
        badge: "Design Finisher",
        objective: "ทบทวนการออกแบบไอเดีย แผน 30 วัน SMART goal และ 3 เลนส์คุณภาพก่อนขยับสู่ PLC",
      }),
    },
  },
];

const missionTitleById = Object.fromEntries(moduleTwoLessons.map((lesson) => [lesson.id, lesson.title]));

export const buildModuleTwoReportCard = (missionResponses = {}, postTest = {}, trainee = {}) => {
  const generatedAt = new Date().toISOString();
  const missionOne = missionResponses["m2-mission-1"] || {};
  const missionTwo = missionResponses["m2-mission-2"] || {};
  const missionThree = missionResponses["m2-mission-3"] || {};
  const missionFour = missionResponses["m2-mission-4"] || {};
  const missionFive = missionResponses["m2-mission-5"] || {};
  const missionSix = missionResponses["m2-mission-6"] || {};

  return {
    generatedAt,
    badge: MODULE_TWO_BADGE,
    unlockedModule: MODULE_TWO_UNLOCK_TITLE,
    traineeName: trainee.name || trainee.displayName || trainee.email || "InSPIRE Learner",
    traineeEmail: trainee.email || "",
    cardSerial:
      trainee.cardSerial ||
      generateModuleTwoCardSerial(trainee.uid || trainee.email || "USER", generatedAt),
    score: postTest.score ?? 0,
    totalQuestions: postTest.totalQuestions ?? moduleTwoPostTestQuestions.length,
    title: moduleTwoModuleMeta.title,
    projectName: missionFour.projectName || "",
    smartCommitment: missionFive.commitment || "",
    sections: [
      {
        kind: "dream_lab",
        title: missionTitleById["m2-mission-1"],
        items: missionOne.strategies || [],
        summary: missionOne.sparkNote || "",
      },
      {
        kind: "vibe",
        title: missionTitleById["m2-mission-2"],
        senses: missionTwo.senses || [],
        moodLine: missionTwo.moodLine || "",
      },
      {
        kind: "roadmap",
        title: missionTitleById["m2-mission-3"],
        northStar: missionThree.northStar || "",
        weeks: missionThree.weeks || [],
      },
      {
        kind: "pitch",
        title: missionTitleById["m2-mission-4"],
        projectName: missionFour.projectName || "",
        teaser: missionFour.teaser || "",
        cards: missionFour.cards || [],
      },
      {
        kind: "smart",
        title: missionTitleById["m2-mission-5"],
        commitment: missionFive.commitment || "",
        criteria: missionFive.criteria || [],
      },
      {
        kind: "quality",
        title: missionTitleById["m2-mission-6"],
        alignmentNote: missionSix.alignmentNote || "",
        lenses: missionSix.lenses || [],
      },
    ],
  };
};
