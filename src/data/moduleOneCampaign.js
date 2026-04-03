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

export const MODULE_ONE_BADGE = "In-Sight Badge";
export const MODULE_ONE_REPORT_KEY = "module1";
export const MODULE_ONE_UNLOCK_TITLE = "Module 2: S - Design";

export const generateModuleOneCardSerial = (uid = "USER", generatedAt = new Date().toISOString()) => {
  const safeUid = String(uid || "USER").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6) || "USER01";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `INSIGHT-${dateCode}-${safeUid}`;
};

export const moduleOneStages = [
  {
    step: 1,
    label: "Step 1",
    title: "Open Eyes",
    helper: "มองให้ลึกเข้าไปในห้องเรียนของเรา",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Open Wide",
    helper: "ถอยออกมามองแรงกระทบจากโลกภายนอก",
  },
  {
    step: 3,
    label: "Step 3",
    title: "Fuse Strategy",
    helper: "จับคู่ SWOT แล้วคัดกลยุทธ์ที่คุ้มแรงที่สุด",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Launch Plan",
    helper: "ออกแบบแผนลงมือทำและผ่านด่านสุดท้าย",
  },
];

const classroomDimensions = [
  {
    id: "teaching_strategies",
    title: "1. มิติวิธีการสอนและกลยุทธ์ (Teaching Strategies)",
    focus: "เทคนิคการสอน การจัดการเรียนรู้",
    strengthPrompt:
      "เทคนิคไหน หรือกิจกรรมแบบไหนที่คุณครูจัดแล้วเด็กๆ 'ตาวาว' สนุกและอินไปกับเรามากที่สุดครับ? เล่าความภูมิใจให้ฟังหน่อย",
    weaknessPrompt:
      "เคยมีแผนการสอนไหนที่เตรียมมาซะดิบดี แต่พอลงสนามจริงแล้วแอบ 'แป้ก' หรือไม่เป็นตามคาดไหมครับ? คิดว่าตอนนั้นเกิดจากอะไร แล้วการสอนเด็กเก่งผสมเด็กอ่อนในห้องเดียว ยังเป็นเรื่องปวดหัวอยู่ไหมครับ?",
  },
  {
    id: "classroom_environment",
    title: "2. มิติการจัดการชั้นเรียนและสภาพแวดล้อม (Classroom Environment)",
    focus: "โครงสร้างห้อง กติกา พื้นที่กายภาพ",
    strengthPrompt:
      "การจัดโต๊ะเรียน หรือมี 'กฎเหล็ก' ข้อไหนของห้องที่คุณครูตั้งไว้ แล้วช่วยให้เด็กๆ ดื้อน้อยลง และห้องสงบขึ้นอย่างเห็นได้ชัดครับ?",
    weaknessPrompt:
      "สภาพห้องเรียน อากาศ หรือจำนวนเด็กที่ล้นห้องในตอนนี้ เป็นอุปสรรคที่ทำให้เรา 'ปล่อยของ' ได้ไม่สุดมากน้อยแค่ไหนครับ?",
  },
  {
    id: "systems_assessment",
    title: "3. มิติระบบการทำงานและการประเมินผล (Systems & Assessment)",
    focus: "การให้คะแนน การตรวจงาน รูทีนประจำวัน",
    strengthPrompt:
      "มีวิธีตรวจงาน หรือการให้คะแนนแบบไหน ที่ทั้งประหยัดเวลาครู และเด็กก็เข้าใจเคลียร์ว่าทำไมถึงได้คะแนนเท่านี้บ้างครับ?",
    weaknessPrompt:
      "ขั้นตอนไหนในระบบหลังบ้าน เช่น การทำเอกสาร หรือการกรอกคะแนน ที่สูบพลังงานเรามากที่สุดจนแทบไม่มีเวลาเตรียมสอนครับ?",
  },
  {
    id: "relationships_values",
    title: "4. มิติบรรยากาศและความสัมพันธ์ (Relationships & Shared Values)",
    focus: "วัฒนธรรมห้องเรียน ความเชื่อมโยงทางใจ",
    strengthPrompt:
      "โมเมนต์ไหนในห้องเรียนที่เห็นแล้วทำให้คุณครู 'ใจฟู' หายเหนื่อยเป็นปลิดทิ้งครับ? เช่น เด็กช่วยติวเพื่อน หรือเด็กที่เคยดื้อยอมเปิดใจ",
    weaknessPrompt:
      "มีพฤติกรรมหรือทัศนคติไหนของเด็กยุคนี้ที่เรารู้สึกว่ารับมือยากจัง หรือมีกำแพงไหนในใจเด็กที่เรายังพังเข้าไปไม่ถึงไหมครับ?",
  },
  {
    id: "teacher_style",
    title: "5. มิติสไตล์และความเป็นผู้นำของครู (Teacher's Style & Leadership)",
    focus: "บุคลิกภาพ ท่าที การคุมชั้นเรียน",
    strengthPrompt:
      "คุณครูคิดว่าตัวเองเป็นครูสไตล์ไหนครับ? สายฮา สายเนี้ยบ หรือสายรับฟัง และมุมไหนของเราที่ทำให้เด็กๆ กล้าเข้าหามากที่สุด?",
    weaknessPrompt:
      "มีสถานการณ์แบบไหนในห้องที่เรารู้สึกว่า สไตล์ของเราแอบ 'เอาไม่อยู่' ไหมครับ? เช่น เจอเด็กที่ต่อต้านรุนแรง หรือเจอห้องที่เงียบกริบถามอะไรไม่ตอบ",
  },
  {
    id: "skills_mastery",
    title: "6. มิติทักษะและอาวุธคู่กาย (Skills & Mastery)",
    focus: "ความเชี่ยวชาญในวิชา และเทคนิคเฉพาะตัว",
    strengthPrompt:
      "ขออนุญาตให้ขิงตัวเองนิดนึงครับ คิดว่าสกิลไหนที่เป็น 'ทีเด็ด' ของเราที่ไม่มีใครเลียนแบบได้? เช่น การเล่าเรื่องยากให้เป็นเรื่องตลก หรือศิลปะการโน้มน้าวเด็ก",
    weaknessPrompt:
      "ในยุคที่โลกหมุนไวแบบนี้ มีเรื่องใหม่ๆ หรือสกิลไหนที่คุณครูรู้สึกว่า 'อยากไปอัปเวลเพิ่มด่วนๆ' เพราะแอบรู้สึกว่ายังไม่ค่อยถนัดบ้างครับ?",
  },
  {
    id: "tech_tools",
    title: "7. มิติสื่อ เทคโนโลยี และนวัตกรรม (Tech & Tools)",
    focus: "การใช้เครื่องมือทุ่นแรง แอปพลิเคชัน สื่อการสอน",
    strengthPrompt:
      "แอปพลิเคชัน เว็บไซต์ หรือสื่อตัวไหนที่เป็น 'ลูกรัก' ขาดไม่ได้เลยในการสอนปัจจุบัน เพราะใช้แล้วเด็กชอบมาก?",
    weaknessPrompt:
      "ปัญหาเรื่องไอที สัญญาณอินเทอร์เน็ต หรืออุปกรณ์ของทางโรงเรียน มีส่วนไหนที่ทำให้หงุดหงิดหรือทำให้การสอนสะดุดบ่อยๆ ไหมครับ?",
  },
  {
    id: "teacher_wellbeing",
    title: "8. มิติสุขภาวะและพลังงาน (Teacher Well-being & Workload)",
    focus: "ความเครียด การจัดสมดุลชีวิต ภาระงานรวม",
    strengthPrompt:
      "งานหนักขนาดนี้ คุณครูมีวิธีชาร์จแบตหรือฮีลใจตัวเองยังไง ให้ยังมีแพสชันมาลุยกับเด็กๆ ได้ในทุกๆ วันครับ?",
    weaknessPrompt:
      "พูดกันตามตรงเลย ตอนนี้มีงานส่วนไหนที่อาจจะไม่ใช่งานสอน หรือความเครียดเรื่องอะไร ที่ดึงสมาธิและความสุขในการสอนของเราไปมากที่สุดครับ?",
  },
  {
    id: "network_partnership",
    title: "9. มิติเครือข่ายและแนวร่วม (Network & Partnership)",
    focus: "การซัพพอร์ตจากเพื่อนครู ผู้บริหาร และผู้ปกครอง",
    strengthPrompt:
      "เคยมีเคสไหนที่ได้คุยกับผู้ปกครอง หรือปรึกษาเพื่อนครู แล้วช่วยกันแก้ปัญหาของเด็กคนหนึ่งได้สำเร็จแบบพลิกฝ่ามือเลยไหมครับ?",
    weaknessPrompt:
      "การสื่อสารขอความร่วมมือจากผู้ปกครอง หรือการขอรับการซัพพอร์ตจากส่วนกลางในตอนนี้ มีความยากลำบากหรือมีช่องโหว่ตรงไหนที่เราอยากให้ดีขึ้นบ้างครับ?",
  },
];

const pestelDimensions = [
  {
    id: "political",
    title: "1. P - Political",
    subtitle: "นโยบาย ทิศทาง และการเมืองใน/นอกโรงเรียน",
    focus: "นโยบายกระทรวงฯ นโยบายผู้บริหาร ทิศทางของเขตพื้นที่การศึกษา",
    opportunityPrompt:
      "นโยบายหรือทิศทางไหนของโรงเรียน หรือกระทรวงฯ ในช่วงนี้ ที่คุณครูรู้สึกว่า 'มาถูกทางแล้ว' และช่วยสนับสนุนให้เราสอนง่ายขึ้น หรือจัดกิจกรรมได้อิสระขึ้นบ้างครับ?",
    threatPrompt:
      "มีนโยบาย โครงการ หรือคำสั่งด่วนไหน ที่ตกลงมาแล้วทำให้เรารู้สึก 'อึดอัด' กระทบเวลาสอน หรือกลายเป็นภาระงานที่ดึงเราออกห่างจากเด็กๆ ไหมครับ?",
  },
  {
    id: "economic",
    title: "2. E - Economic",
    subtitle: "ปากท้อง เศรษฐกิจ และงบประมาณ",
    focus: "สภาพเศรษฐกิจของครอบครัวเด็ก งบประมาณสนับสนุน",
    opportunityPrompt:
      "ตอนนี้เรามีงบประมาณ เครือข่ายอุปถัมภ์ หรือกองทุนอะไรในโรงเรียน ที่ช่วยซัพพอร์ตให้เราซื้อสื่อการสอน หรือจัดกิจกรรมสนุกๆ ให้เด็กได้อย่างเต็มที่บ้างไหมครับ?",
    threatPrompt:
      "สภาพเศรษฐกิจของครอบครัวเด็กๆ ตอนนี้ ส่งผลกระทบกับห้องเรียนเรามากน้อยแค่ไหนครับ? เช่น เด็กไม่มีเงินกินข้าว ไม่มีอุปกรณ์การเรียน หรือขาดเรียนไปช่วยพ่อแม่ทำงาน",
  },
  {
    id: "social",
    title: "3. S - Social",
    subtitle: "สังคม ค่านิยม และครอบครัวยุคใหม่",
    focus: "เทรนด์สังคม พฤติกรรมวัยรุ่น สภาพครอบครัว",
    opportunityPrompt:
      "มีกระแส เทรนด์ฮิต หรือความสนใจอะไรของเด็กยุคนี้ เช่น T-Pop กีฬา หรือเกม ที่คุณครูหยิบมาเป็น 'ตัวล่อ' แล้วดึงความสนใจให้เขาอยากเรียนกับเราได้สำเร็จบ้างครับ?",
    threatPrompt:
      "ปัญหาครอบครัว หรือค่านิยมทางสังคมบางอย่างจากโซเชียลมีเดีย เรื่องไหนที่กระทบกับสมาธิ พฤติกรรม หรือความสม่ำเสมอในการเรียนของเด็กๆ มากที่สุดในตอนนี้ครับ?",
  },
  {
    id: "technological",
    title: "4. T - Technological",
    subtitle: "คลื่นเทคโนโลยีและโลกดิจิทัล",
    focus: "เครื่องมือ AI โซเชียลมีเดีย ความพร้อมด้านอุปกรณ์",
    opportunityPrompt:
      "มีเทคโนโลยี หรือ AI ตัวไหนที่กำลังมาแรง แล้วคุณครูมองว่าถ้าเอามาประยุกต์ใช้กับห้องเรียนของเรา มันต้อง 'ปัง' และช่วยเปิดโลกให้เด็กๆ ได้แน่ๆ ครับ?",
    threatPrompt:
      "ความเหลื่อมล้ำทางเทคโนโลยี เช่น เด็กบางคนไม่มีมือถือหรือเน็ต หรือปัญหาภัยไซเบอร์อย่างเด็กติดเกมและโดนบูลลี่ออนไลน์ สร้างความหนักใจมากแค่ไหนครับ?",
  },
  {
    id: "environmental",
    title: "5. E - Environmental",
    subtitle: "สภาพแวดล้อม ธรรมชาติ และพื้นที่กายภาพ",
    focus: "สภาพอากาศ ฝุ่น PM2.5 พื้นที่ใช้สอยรอบโรงเรียน",
    opportunityPrompt:
      "สภาพแวดล้อม ชุมชน หรือธรรมชาติรอบๆ โรงเรียน มีจุดไหนที่เราสามารถดึงมาเป็น 'แหล่งเรียนรู้นอกห้องเรียน' ให้เด็กๆ ได้ลงมือทำจริงอย่างน่าสนใจบ้างครับ?",
    threatPrompt:
      "ปัญหาเรื่องสภาพแวดล้อม เช่น อากาศร้อนจัด ฝุ่น PM2.5 หรือโครงสร้างตึกเรียนที่ทรุดโทรม กระทบต่อสุขภาพและสมาธิในการเรียนของเด็กๆ รวมถึงตัวคุณครูเองบ่อยแค่ไหนครับ?",
  },
  {
    id: "legal",
    title: "6. L - Legal",
    subtitle: "กฎหมาย กติกา และความปลอดภัย",
    focus: "กฎหมายคุ้มครองเด็ก กฎระเบียบโรงเรียน ข้อบังคับทางวิชาชีพ",
    opportunityPrompt:
      "มีกฎระเบียบหรือมาตรการความปลอดภัยข้อไหนของโรงเรียน ที่ช่วยปกป้องตัวครูและเด็กๆ ทำให้เราทำงานร่วมกันได้อย่างสบายใจและเป็นระบบระเบียบมากขึ้นบ้างครับ?",
    threatPrompt:
      "มีข้อกฎหมายหรือความอ่อนไหวทางสังคมยุคนี้ เช่น PDPA การถ่ายรูปเด็ก กฎการทำโทษ หรือสิทธิมนุษยชน ที่ทำให้คุณครูแอบเกร็งหรือรู้สึกว่าทำตัวไม่ถูกเวลาต้องจัดการปัญหาพฤติกรรมเด็กไหมครับ?",
  },
];

const makeQuestionItem = ({
  id,
  lensTitle,
  focus,
  prompt,
  lensCode,
  dimensionId,
  hint,
}) => ({
  id,
  lensTitle,
  focus,
  prompt,
  lensCode,
  dimensionId,
  hint,
});

const missionOneParts = [
  {
    id: "m1-part-strengths",
    title: "Part 1: Strength Scan",
    description: "เก็บจุดแข็ง 9 มิติของห้องเรียนให้ครบก่อน เพื่อเห็นพลังที่เรามีอยู่จริง",
    rewardLabel: "Heart Light",
    lensCode: "S",
    questions: classroomDimensions.map((dimension) =>
      makeQuestionItem({
        id: `strength-${dimension.id}`,
        lensTitle: dimension.title,
        focus: dimension.focus,
        prompt: dimension.strengthPrompt,
        lensCode: "S",
        dimensionId: dimension.id,
        hint: "เล่าจากห้องเรียนจริง เหตุการณ์จริง หรือวิธีที่ใช้ประจำก็ได้",
      }),
    ),
  },
  {
    id: "m1-part-weaknesses",
    title: "Part 2: Friction Scan",
    description: "มองจุดอ่อนแบบไม่ตัดสินตัวเอง เพื่อเห็นสิ่งที่ต้องออกแบบความช่วยเหลือ",
    rewardLabel: "Truth Lens",
    lensCode: "W",
    questions: classroomDimensions.map((dimension) =>
      makeQuestionItem({
        id: `weakness-${dimension.id}`,
        lensTitle: dimension.title,
        focus: dimension.focus,
        prompt: dimension.weaknessPrompt,
        lensCode: "W",
        dimensionId: dimension.id,
        hint: "ตอบแบบตรงไปตรงมาได้เลย ยิ่งชัดยิ่งช่วยออกแบบกลยุทธ์ได้แม่น",
      }),
    ),
  },
];

const missionTwoParts = [
  {
    id: "m2-part-opportunities",
    title: "Part 1: Opportunity Radar",
    description: "เก็บโอกาสจากภายนอกให้ครบทั้ง PESTEL เพื่อหาลมใต้ปีกของห้องเรียนเรา",
    rewardLabel: "Wind Map",
    lensCode: "O",
    questions: pestelDimensions.map((dimension) =>
      makeQuestionItem({
        id: `opportunity-${dimension.id}`,
        lensTitle: `${dimension.title} - ${dimension.subtitle}`,
        focus: dimension.focus,
        prompt: dimension.opportunityPrompt,
        lensCode: "O",
        dimensionId: dimension.id,
        hint: "ลองมองให้ครบทั้งโรงเรียน ชุมชน นโยบาย และเทคโนโลยีรอบตัว",
      }),
    ),
  },
  {
    id: "m2-part-threats",
    title: "Part 2: Threat Radar",
    description: "มองพายุที่กระทบการสอนตรงๆ เพื่อเตรียมเกมรับอย่างมีสติ",
    rewardLabel: "Storm Sense",
    lensCode: "T",
    questions: pestelDimensions.map((dimension) =>
      makeQuestionItem({
        id: `threat-${dimension.id}`,
        lensTitle: `${dimension.title} - ${dimension.subtitle}`,
        focus: dimension.focus,
        prompt: dimension.threatPrompt,
        lensCode: "T",
        dimensionId: dimension.id,
        hint: "บอกความเสี่ยงที่ส่งผลจริงกับเด็ก กับครู หรือกับคุณภาพการเรียนรู้",
      }),
    ),
  },
];

export const moduleOnePostTestQuestions = [
  {
    id: "module1-posttest-1",
    question: "SWOT ใน Module 1 แบ่งปัจจัยภายในและภายนอกได้ถูกต้องตามข้อใด",
    options: [
      "S และ O เป็นภายใน ส่วน W และ T เป็นภายนอก",
      "S และ W เป็นภายใน ส่วน O และ T เป็นภายนอก",
      "S เป็นภายนอก ส่วน O, W, T เป็นภายใน",
      "ทุกตัวเป็นปัจจัยภายนอกทั้งหมด",
    ],
    correctAnswer: 1,
  },
  {
    id: "module1-posttest-2",
    question: "Mission 2 ใช้กรอบคิดใดเพื่อมองปัจจัยภายนอกที่กระทบห้องเรียนอย่างรอบด้าน",
    options: ["PDCA", "SMART", "PESTEL", "AAR"],
    correctAnswer: 2,
  },
  {
    id: "module1-posttest-3",
    question: "Mission 3 Strategy Fusion มีเป้าหมายหลักอะไร",
    options: [
      "เขียนรายงานสรุปอย่างเดียว",
      "จับคู่ข้อมูล SWOT เพื่อสร้างกลยุทธ์ที่ลงมือได้จริง",
      "สอบทฤษฎีเรื่องห้องเรียนใหม่อีกครั้ง",
      "บันทึกคะแนนประเมินครู",
    ],
    correctAnswer: 1,
  },
  {
    id: "module1-posttest-4",
    question: "Mission 4 Needs Detective ช่วยตัดสินใจอย่างไร",
    options: [
      "สุ่มเลือกกลยุทธ์ที่น่าสนใจที่สุด",
      "เลือกกลยุทธ์ที่ใช้เวลาน้อยที่สุดเท่านั้น",
      "ให้คะแนนแต่ละกลยุทธ์แล้วเลือก 1 กลยุทธ์ไปต่อยอดเป็น Action Plan",
      "ข้ามไปทำ PDCA ได้เลยโดยไม่ต้องเลือก",
    ],
    correctAnswer: 2,
  },
  {
    id: "module1-posttest-5",
    question: "ข้อใดเรียงลำดับวงจร PDCA ได้ถูกต้อง",
    options: [
      "Plan - Do - Check - Act",
      "Plan - Check - Do - Act",
      "Do - Plan - Act - Check",
      "Check - Act - Do - Plan",
    ],
    correctAnswer: 0,
  },
];

const moduleOneMentor = {
  briefing: {
    intro: "AI Mentor: ก่อนเริ่มภารกิจ ลองฟังบทเรียนนี้ให้เห็นภาพรวมก่อนนะครับ แล้วค่อยกลับมาจับโจทย์กับห้องเรียนของเราแบบลงลึก",
    probe: "ลองมองมุมนี้ดูไหมครับ ว่าข้อไหนในบทเรียนกำลังสะกิดห้องเรียนจริงของเราอยู่มากที่สุด",
    reward: "Blueprint unlocked",
  },
  missionOne: {
    intro: "AI Mentor: เยี่ยมมากครับ เราจะยังไม่รีบแก้ปัญหา แต่จะมองให้ครบก่อนว่าห้องเรียนของเรามีพลังอะไร และติดตรงไหนจริงๆ",
    probe: "ถ้าต้องเล่าให้เพื่อนครูฟังใน 1 นาที ว่าห้องเรียนนี้ 'เก่งเรื่องอะไร' และ 'สะดุดตรงไหน' คุณครูจะหยิบเรื่องไหนขึ้นมาก่อนครับ?",
    reward: "Insight shard +120 XP",
  },
  missionTwo: {
    intro: "AI Mentor: ตอนนี้เราจะถอยออกมามองกว้างขึ้นอีกนิดนะครับ ว่าสภาพแวดล้อมภายนอกกำลังเป็นลมใต้ปีก หรือเป็นพายุของห้องเรียนเรา",
    probe: "ถ้าปัจจัยภายนอกเปลี่ยนเพียงอย่างเดียวแล้วช่วยห้องเรียนได้มากที่สุด คุณครูอยากให้เรื่องไหนขยับก่อนครับ?",
    reward: "Radar ping +140 XP",
  },
  missionThree: {
    intro: "AI Mentor: ถึงเวลาจับคู่ข้อมูลแล้วครับ เอาจุดแข็ง จุดอ่อน โอกาส และอุปสรรคมาชนกันให้เกิดกลยุทธ์ที่มีหน้าตาชัดเจน",
    probe: "ลองมองมุมนี้ดูไหมครับ ว่ากลยุทธ์ไหนใช้ของที่เรามีอยู่แล้วได้คุ้มที่สุด และกลยุทธ์ไหนช่วยอุดช่องโหว่ได้ไวที่สุด",
    reward: "Fusion complete +180 XP",
  },
  missionFour: {
    intro: "AI Mentor: เรามีหลายทางเลือกแล้วครับ แต่จะไปต่อด้วยทางไหน ต้องเลือกด้วยเหตุผล ไม่ใช่แค่ความชอบส่วนตัว",
    probe: "ถ้าต้องเริ่มภายในสัปดาห์หน้า กลยุทธ์ไหนทั้งคุ้มแรง เห็นผล และยังพาเพื่อนร่วมทางมาด้วยได้ครับ?",
    reward: "Priority lock +120 XP",
  },
  missionFive: {
    intro: "AI Mentor: เยี่ยมมากครับ ตอนนี้เราจะเปลี่ยนกลยุทธ์ที่เลือกไว้ ให้กลายเป็น Action Plan แบบ PDCA ที่พาไปลงมือจริงได้",
    probe: "ลองมองมุมนี้ดูไหมครับ ว่าหลักฐานแบบไหนจะบอกเราได้เร็วที่สุดว่าแผนนี้เริ่มเวิร์กหรือยัง",
    reward: "Action plan forged +200 XP",
  },
  posttest: {
    intro: "AI Mentor: ด่านสุดท้ายของ Module 1 แล้วครับ ทบทวนสิ่งที่เห็น สิ่งที่เลือก และสิ่งที่พร้อมลงมือทำ จากนั้นเก็บคะแนนให้ผ่านด่านนี้ไปด้วยกัน",
    probe: "ถ้าต้องสรุปแก่นของ Module 1 ในประโยคเดียว คุณครูคิดว่ามันคืออะไรครับ?",
    reward: "Badge ready",
  },
};

export const moduleOneModuleMeta = {
  title: "Module 1: In-Sight : เปิดตา เปิดใจ ค้นหาความต้องการ",
  description:
    "เปิดตา เปิดใจ มองให้ครบทั้งในห้องเรียนและนอกห้องเรียน ก่อนคัดกลยุทธ์ที่ใช่ แล้วแตกออกมาเป็นแผนลงมือทำที่จับต้องได้จริง",
  campaignName: "In-Sight Expedition",
};

export const moduleOneLessons = [
  {
    id: "m1-lesson-brief",
    title: "1.0 In-Sight Lesson Brief",
    type: "video",
    iconName: "PlayCircle",
    content: {
      videoUrl:
        "https://www.canva.com/design/DAHFgpFnz8E/VXANS3zHrTRdvU7XGSIG8Q/watch?embed",
      frameLabel: "In-Sight Lesson Deck",
      externalUrl:
        "https://www.canva.com/design/DAHFgpFnz8E/VXANS3zHrTRdvU7XGSIG8Q/watch?embed",
      description:
        "บทเรียนเตรียมมุมมองสำหรับ Module 1 หลังจบ pre-test ให้ดูภาพรวมนี้ก่อน แล้วค่อยเข้าสู่ภารกิจสำรวจภายใน ภายนอก และการออกแบบแผนลงมือทำ",
      campaignStep: 1,
      aiMentor: moduleOneMentor.briefing,
      gamification: checkpointProfile({
        arc: "In-Sight Briefing",
        xp: 70,
        reward: "Lesson deck + mission map",
        badge: "Sightline",
        objective: "ดูบทเรียนเปิดทางและเตรียมตัวเข้าสู่ภารกิจ Module 1",
      }),
    },
  },
  {
    id: "m1-mission-1",
    title: "Mission 1: 9 มิติของการจัดการชั้นเรียน",
    type: "activity",
    activityType: "module1_reflection",
    iconName: "PenTool",
    content: {
      missionKey: "missionOne",
      campaignStep: 1,
      aiMentor: moduleOneMentor.missionOne,
      parts: missionOneParts,
      gamification: missionProfile({
        arc: "Open Eyes",
        xp: 180,
        reward: "Insight shard + coach-ready SWOT inputs",
        badge: "Classroom Observer",
        objective:
          "เก็บข้อมูลภายในห้องเรียนให้ครบทั้งจุดแข็งและจุดอ่อน จาก 9 มิติสำคัญของการจัดการชั้นเรียน",
        deliverable:
          "คำตอบ 18 ข้อที่สะท้อนภาพจริงของห้องเรียนแบบเห็นทั้งพลังและแรงเสียดทาน",
        duSignal:
          "DU จะเห็นว่าคุณครูต้องการแรงหนุนด้านใดจากภาพห้องเรียนจริง ไม่ใช่จากการคาดเดา",
        checkpoints: [
          "ตอบ Part 1 ครบทั้ง 9 มิติ",
          "ตอบ Part 2 ครบทั้ง 9 มิติ",
          "สรุปภาพในห้องเรียนที่ชัดขึ้นหลังสำรวจ",
        ],
      }),
    },
  },
  {
    id: "m1-mission-2",
    title: "Mission 2: Look Out Of The Room",
    type: "activity",
    activityType: "module1_reflection",
    iconName: "Sparkles",
    content: {
      missionKey: "missionTwo",
      campaignStep: 2,
      aiMentor: moduleOneMentor.missionTwo,
      introduction:
        "เราคุยเรื่องในห้องเรียนกันไปแล้ว ทีนี้ลองถอยออกมามองกว้างขึ้นอีกนิดนะครับ มาดูกันว่าสภาพแวดล้อม นโยบาย หรือสังคมยุคนี้ มันเป็นลมใต้ปีกที่ช่วยดันเรา หรือเป็นพายุที่ทำให้เราสอนเหนื่อยขึ้นกันแน่ เล่าได้เต็มที่เลยนะครับ",
      analysisHint:
        "ทริคต่อยอด SWOT: สิ่งที่เป็นเรื่องดีๆ ให้จับคู่กับจุดแข็งเพื่อสร้างกลยุทธ์เชิงรุก ส่วนสิ่งที่เป็นเรื่องปวดหัวให้จับคู่กับจุดอ่อนเพื่อสร้างเกมรับหรือระบบป้องกัน",
      parts: missionTwoParts,
      gamification: missionProfile({
        arc: "Open Wide",
        xp: 200,
        reward: "Opportunity radar + threat watch",
        badge: "Context Scout",
        objective:
          "มองให้ครบว่าโลกภายนอกกำลังหนุน หรือกดทับห้องเรียนเราอยู่ในด้านใดบ้าง ผ่านกรอบ PESTEL",
        deliverable:
          "ชุดข้อมูล O และ T จากปัจจัยภายนอกครบ 12 ข้อ ที่พร้อมนำไปจับคู่ใน TOW Matrix",
        duSignal:
          "DU จะเห็นปัจจัยเชิงระบบที่โรงเรียนหรือเครือข่ายควรเข้ามาช่วยหนุนคุณครู",
        checkpoints: [
          "เก็บโอกาสจากภายนอกครบ 6 มิติ",
          "เก็บอุปสรรคจากภายนอกครบ 6 มิติ",
          "เห็นภาพว่าอะไรคือพายุ และอะไรคือลมใต้ปีก",
        ],
      }),
    },
  },
  {
    id: "m1-mission-3",
    title: "Mission 3: Strategy Fusion (TOW Matrix)",
    type: "activity",
    activityType: "module1_strategy_fusion",
    iconName: "PenTool",
    content: {
      campaignStep: 3,
      aiMentor: moduleOneMentor.missionThree,
      strategyTypes: [
        { value: "SO", label: "SO - ใช้จุดแข็งคว้าโอกาส" },
        { value: "ST", label: "ST - ใช้จุดแข็งรับมืออุปสรรค" },
        { value: "WO", label: "WO - ใช้โอกาสอุดจุดอ่อน" },
        { value: "WT", label: "WT - ลดความเสี่ยงจากจุดอ่อนและอุปสรรค" },
      ],
      starterSlots: ["strategy-a", "strategy-b", "strategy-c"],
      gamification: missionProfile({
        arc: "Fuse Strategy",
        xp: 220,
        reward: "3 strategy cards ready for selection",
        badge: "Pattern Maker",
        objective:
          "จับคู่ข้อมูล SWOT ให้เกิด 3 กลยุทธ์ที่มีหน้าตาชัดเจนและพร้อมเอาไปชั่งน้ำหนักต่อ",
        deliverable:
          "กลยุทธ์อย่างน้อย 3 แบบ พร้อมคู่ข้อมูลที่ใช้คิด และผลลัพธ์ที่อยากเห็น",
        duSignal:
          "DU จะมองเห็นว่าคุณครูพร้อมขยับเรื่องไหนก่อน และต้องการทรัพยากรแบบใดเพื่อพากลยุทธ์ไปต่อ",
        checkpoints: [
          "สร้างกลยุทธ์ครบ 3 ใบ",
          "ระบุคู่องค์ประกอบ SWOT ที่ใช้ในแต่ละใบ",
          "บอกผลลัพธ์หรือหลักฐานที่อยากเห็นจากแต่ละกลยุทธ์",
        ],
      }),
    },
  },
  {
    id: "m1-mission-4",
    title: "Mission 4: Needs Detective",
    type: "activity",
    activityType: "module1_needs_detective",
    iconName: "CheckSquare",
    content: {
      campaignStep: 3,
      aiMentor: moduleOneMentor.missionFour,
      ratingCriteria: [
        { id: "impact", label: "Impact", helper: "ทำแล้วกระทบผู้เรียนหรือห้องเรียนมากแค่ไหน" },
        { id: "feasibility", label: "Feasibility", helper: "ทำได้จริงแค่ไหนในบริบทตอนนี้" },
        { id: "urgency", label: "Urgency", helper: "ถ้าไม่ทำตอนนี้จะเสียโอกาสหรือเสี่ยงมากไหม" },
        { id: "energy_fit", label: "Energy Fit", helper: "สอดคล้องกับพลัง ทีม และทรัพยากรของเราแค่ไหน" },
      ],
      gamification: missionProfile({
        arc: "Priority Lock",
        xp: 150,
        reward: "1 priority strategy selected",
        badge: "Needs Detective",
        objective:
          "ให้คะแนนกลยุทธ์จาก Mission 3 แล้วเลือก 1 กลยุทธ์ที่คุ้มแรงและควรนำไปออกแบบแผนลงมือทำ",
        deliverable:
          "ตารางให้คะแนนกลยุทธ์ 3 ใบ พร้อมเหตุผลประกอบการเลือกกลยุทธ์หลัก 1 ใบ",
        duSignal:
          "DU จะเห็นว่าคุณครูกำลังต้องการแรงสนับสนุนเพื่อทำกลยุทธ์ไหนให้สำเร็จเป็นอันดับแรก",
        checkpoints: [
          "ให้คะแนนทุกกลยุทธ์ตามเกณฑ์ที่กำหนด",
          "เลือก 1 กลยุทธ์หลัก",
          "บอกเหตุผลว่าทำไมกลยุทธ์นี้ควรเริ่มก่อน",
        ],
      }),
    },
  },
  {
    id: "m1-mission-5",
    title: "Mission 5: Action Plan (PDCA)",
    type: "activity",
    activityType: "module1_pdca_action",
    iconName: "PenTool",
    content: {
      campaignStep: 4,
      aiMentor: moduleOneMentor.missionFive,
      pdcaPrompts: [
        {
          id: "plan",
          title: "Plan",
          helper: "เขียนเป้าหมายย่อย สิ่งที่จะทำ ตัวชี้วัด และคนที่จะชวนมาช่วย",
        },
        {
          id: "do",
          title: "Do",
          helper: "ระบุการทดลองหรือกิจกรรมแรกที่ต้องเริ่ม พร้อมกรอบเวลาเริ่มต้น",
        },
        {
          id: "check",
          title: "Check",
          helper: "กำหนดหลักฐาน วิธีติดตาม และจังหวะทบทวนผล",
        },
        {
          id: "act",
          title: "Act",
          helper: "บอกเกณฑ์การปรับแผน ถ้าผลยังไม่ถึง หรือถ้าเห็นสัญญาณบวกแล้วจะต่อยอดอย่างไร",
        },
      ],
      gamification: missionProfile({
        arc: "Launch Plan",
        xp: 240,
        reward: "PDCA action blueprint",
        badge: "Action Designer",
        objective:
          "เปลี่ยนกลยุทธ์ที่เลือกไว้ให้กลายเป็น Action Plan แบบ PDCA ที่พร้อมพาไปลงมือทำจริง",
        deliverable:
          "แผน PDCA 1 ชุด พร้อมช่วงเวลา หลักฐานติดตาม และทรัพยากรสนับสนุนที่ต้องการ",
        duSignal:
          "DU จะใช้แผนนี้เพื่อติดตาม ช่วยเคลียร์อุปสรรค และให้ข้อเสนอแนะต่อเนื่องอย่างตรงจุด",
        checkpoints: [
          "เขียน Plan / Do / Check / Act ครบ",
          "กำหนดวันเริ่มและวันทบทวน",
          "ระบุความช่วยเหลือที่ต้องการจาก DU หรือเครือข่าย",
        ],
      }),
    },
  },
  {
    id: "m1-posttest",
    title: "Post-test: In-Sight Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPosttest: true,
      passScore: 3,
      maxAttempts: 5,
      questionsCount: 5,
      questions: moduleOnePostTestQuestions,
      campaignStep: 4,
      aiMentor: moduleOneMentor.posttest,
      badgeReward: MODULE_ONE_BADGE,
      unlockTitle: MODULE_ONE_UNLOCK_TITLE,
      description:
        "ตอบคำถาม 5 ข้อ เก็บอย่างน้อย 3 คะแนน เพื่อปิด Module 1 รับ In-Sight Badge และปลดล็อก Module 2",
      gamification: checkpointProfile({
        arc: "Final Insight Check",
        xp: 130,
        reward: "In-Sight Badge + Module 2 unlock",
        badge: "Insight Finisher",
        objective:
          "ทบทวนสิ่งที่เห็น เลือก และออกแบบไว้จากทั้ง Module 1 ก่อนเข้าสู่การออกแบบเชิงลึกใน Module 2",
      }),
    },
  },
];

const missionTitleById = Object.fromEntries(
  moduleOneLessons.map((lesson) => [lesson.id, lesson.title]),
);

export const buildModuleOneReportCard = (missionResponses = {}, postTest = {}, trainee = {}) => {
  const generatedAt = new Date().toISOString();
  const missionOne = missionResponses["m1-mission-1"] || {};
  const missionTwo = missionResponses["m1-mission-2"] || {};
  const missionThree = missionResponses["m1-mission-3"] || {};
  const missionFour = missionResponses["m1-mission-4"] || {};
  const missionFive = missionResponses["m1-mission-5"] || {};

  const selectedStrategy =
    missionFour.selectedStrategy ||
    missionThree.strategies?.find((strategy) => strategy.id === missionFour.selectedStrategyId) ||
    null;

  return {
    generatedAt,
    badge: MODULE_ONE_BADGE,
    unlockedModule: MODULE_ONE_UNLOCK_TITLE,
    traineeName: trainee.name || trainee.displayName || trainee.email || "InSPIRE Learner",
    traineeEmail: trainee.email || "",
    cardSerial:
      trainee.cardSerial ||
      generateModuleOneCardSerial(trainee.uid || trainee.email || "USER", generatedAt),
    score: postTest.score ?? 0,
    totalQuestions: postTest.totalQuestions ?? moduleOnePostTestQuestions.length,
    title: moduleOneModuleMeta.title,
    focusStrategy: selectedStrategy?.title || missionFive.strategyTitle || "",
    sections: [
      {
        kind: "answers",
        title: missionTitleById["m1-mission-1"],
        parts: missionOne.parts || [],
        summary: missionOne.summary || "",
      },
      {
        kind: "answers",
        title: missionTitleById["m1-mission-2"],
        parts: missionTwo.parts || [],
        summary: missionTwo.summary || "",
      },
      {
        kind: "strategies",
        title: missionTitleById["m1-mission-3"],
        items: missionThree.strategies || [],
        reflection: missionThree.reflection || "",
      },
      {
        kind: "rating",
        title: missionTitleById["m1-mission-4"],
        scores: missionFour.strategyScores || [],
        selectedStrategy,
        selectionReason: missionFour.selectionReason || "",
      },
      {
        kind: "pdca",
        title: missionTitleById["m1-mission-5"],
        actionPlan: missionFive,
      },
    ],
  };
};
