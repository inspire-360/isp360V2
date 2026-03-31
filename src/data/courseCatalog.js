export const courseCatalog = [
  {
    id: "course-teacher",
    title: "InSPIRE360 สำหรับครู",
    shortTitle: "เส้นทางครู",
    eyebrow: "รุ่นหลักของแพลตฟอร์ม",
    audience: "สำหรับครู ผู้บริหาร และบุคลากรทางการศึกษา",
    description:
      "หลักสูตร 5 โมดูลเพื่อพาครูสำรวจปัญหาจริง ออกแบบทางออก สร้างเครือข่าย ทดลองนวัตกรรม และสะท้อนผลอย่างเป็นระบบ",
    modules: 5,
    hours: 30,
    iconName: "BookOpen",
    requiresCode: true,
    accessCode: "TEACHER360",
    path: "/course/teacher",
    accessLabel: "ห้องเรียนสำหรับรุ่นเฉพาะ",
    outcomes: [
      "มีภารกิจที่ต่อเนื่องตั้งแต่ Needs Assessment จนถึง Reflection",
      "สรุปเป็นรายงานรายโมดูล พร้อม Badge และปลดล็อกโมดูลถัดไป",
      "ออกแบบ Action Plan และนวัตกรรมที่นำไปใช้จริงในห้องเรียนได้",
    ],
    theme: {
      line: "bg-sky-400/45",
      ring: "ring-sky-300/25",
      glow: "from-sky-500/18 via-sky-500/5 to-transparent",
      chip: "border-sky-300/25 bg-sky-400/10 text-sky-200",
      iconWrap: "bg-sky-400/12 text-sky-200",
      button: "bg-sky-400 text-slate-950 hover:bg-sky-300",
      text: "text-sky-200",
      subtle: "text-sky-100/70",
    },
  },
  {
    id: "course-student",
    title: "InSPIRE Space สำหรับผู้เรียน",
    shortTitle: "พื้นที่ผู้เรียน",
    eyebrow: "พื้นที่เรียนรู้แบบเปิด",
    audience: "สำหรับนักเรียนที่ต้องการพื้นที่เรียนรู้และดูแลใจ",
    description:
      "พื้นที่เรียนรู้แบบเปิดที่เน้นความสบายใจ เข้าถึงง่าย และต่อยอดการเรียนรู้ร่วมกับครูในระบบเดียวกัน",
    modules: 8,
    hours: 12,
    iconName: "Layout",
    requiresCode: false,
    accessCode: "",
    path: "/course/student",
    accessLabel: "เข้าใช้งานได้ทันที",
    outcomes: [
      "เข้าใช้งานง่ายบนมือถือและเดสก์ท็อป",
      "เหมาะกับการเรียนรู้แบบสำรวจตัวเองและพัฒนาทักษะชีวิต",
      "เชื่อมประสบการณ์กับพื้นที่ของครูได้อย่างไม่ซับซ้อน",
    ],
    theme: {
      line: "bg-emerald-400/45",
      ring: "ring-emerald-300/25",
      glow: "from-emerald-500/18 via-emerald-500/5 to-transparent",
      chip: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
      iconWrap: "bg-emerald-400/12 text-emerald-200",
      button: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
      text: "text-emerald-200",
      subtle: "text-emerald-100/70",
    },
  },
  {
    id: "course-ai",
    title: "AI & Innovation",
    shortTitle: "AI Era",
    eyebrow: "กำลังเตรียมเปิดตัว",
    audience: "สำหรับการต่อยอดทักษะดิจิทัลและนวัตกรรมยุค AI",
    description:
      "ห้องเรียนต้นแบบสำหรับทดลองใช้ AI ในงานสอน การออกแบบกิจกรรม และการใช้นวัตกรรมอย่างมีจริยธรรม",
    modules: 4,
    hours: 10,
    iconName: "Zap",
    requiresCode: false,
    accessCode: "",
    path: "/course/ai-era",
    accessLabel: "กำลังเปิดตัว",
    outcomes: [
      "ต่อยอดสมรรถนะด้าน AI สำหรับครูยุคใหม่",
      "มีกรอบคิดเรื่องจริยธรรมและการทดลองใช้อย่างปลอดภัย",
      "รองรับการขยายแพลตฟอร์มในระยะถัดไป",
    ],
    theme: {
      line: "bg-amber-300/55",
      ring: "ring-amber-300/25",
      glow: "from-amber-400/18 via-amber-400/5 to-transparent",
      chip: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      iconWrap: "bg-amber-300/12 text-amber-100",
      button: "bg-amber-300 text-slate-950 hover:bg-amber-200",
      text: "text-amber-100",
      subtle: "text-amber-50/70",
    },
  },
];

export const courseCatalogById = Object.fromEntries(
  courseCatalog.map((course) => [course.id, course]),
);

export const platformSignals = [
  { label: "เส้นทางหลัก", value: "5 โมดูล" },
  { label: "พื้นที่สนับสนุน", value: "Admin + SOS" },
  { label: "ประสบการณ์", value: "ไทยเต็มระบบ" },
];

export const landingWorkflow = [
  {
    title: "เริ่มจากตัวตนที่ถูกต้อง",
    description:
      "รองรับอีเมล Google และ LINE พร้อมข้อมูลโปรไฟล์ที่ต่อยอดสู่การใช้งานจริงได้ทันที",
  },
  {
    title: "เข้าห้องเรียนที่ตรงบริบท",
    description:
      "แยกห้องเรียนเฉพาะรุ่น พื้นที่ผู้เรียน และทางลัดสำหรับการช่วยเหลือไว้อย่างชัดเจน",
  },
  {
    title: "ดูแลจากศูนย์กลางเดียว",
    description:
      "ติดตามการเรียน ความเคลื่อนไหว SOS และงานดูแลระบบได้จาก workspace เดียว",
  },
];

export const operatorNotes = [
  "เมนูและข้อความหลักถูกปรับเป็นภาษาไทยเพื่อให้ใช้งานจริงได้ทันที",
  "Admin สามารถติดตามผู้ใช้ คำร้อง SOS และรีเซ็ตความก้าวหน้าได้จากหน้าเดียว",
  "ข้อมูลคอร์สครูถูกย้ายไปอยู่ในโครงสร้างแบบ data-driven เพื่อขยายต่อได้ง่ายขึ้น",
];

export const getCourseById = (courseId) => courseCatalogById[courseId];
