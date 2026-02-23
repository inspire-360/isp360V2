// ฐานข้อมูลข้อสอบมาตรฐาน InSPIRE 360 (อ้างอิงจากไฟล์ Standardized_Test_InSPIRE)

const questionBank = [
  {
    id: 1,
    question: "การวิเคราะห์ความต้องการจำเป็น (Needs Assessment) มีความสำคัญอย่างไรต่อการพัฒนาโรงเรียน?",
    options: [
      "เพื่อใช้ของบประมาณจากกระทรวงฯ เท่านั้น",
      "เพื่อค้นหาช่องว่าง (Gap) ระหว่าง 'สิ่งที่เป็นอยู่' กับ 'สิ่งที่ควรจะเป็น'",
      "เพื่อใช้ประเมินผลการปฏิบัติงานของครูรายบุคคล",
      "เพื่อจัดทำตารางสอนให้ลงตัว"
    ],
    correctAnswer: 1, // ข.
    explanation: "Kaufman & English (1979) ระบุว่า Needs Assessment คือการหา Gap Analysis เพื่อระบุปัญหาที่แท้จริงก่อนวางแผน"
  },
  {
    id: 2,
    question: "ข้อใดกล่าวถูกต้องเกี่ยวกับ SWOT Analysis ในบริบทสถานศึกษา?",
    options: [
      "S และ W คือปัจจัยภายนอกที่ควบคุมไม่ได้",
      "O และ T คือปัจจัยภายในที่บริหารจัดการได้",
      "การวิเคราะห์สภาพแวดล้อมภายใน (S, W) และภายนอก (O, T) เพื่อกำหนดกลยุทธ์",
      "เป็นเครื่องมือสำหรับประเมินคุณภาพผู้เรียนรายบุคคล"
    ],
    correctAnswer: 2, // ค.
    explanation: "SWOT (Albert Humphrey) แบ่งเป็น Internal (Strengths, Weaknesses) และ External (Opportunities, Threats) เพื่อวางแผนกลยุทธ์"
  },
  {
    id: 3,
    question: "หัวใจสำคัญของการพัฒนาตนเองตามแนวทาง Competency-Based คืออะไร?",
    options: [
      "การสะสมเกียรติบัตรให้ได้มากที่สุด",
      "การพัฒนาสมรรถนะให้สามารถปฏิบัติงานได้จริงตามมาตรฐานวิชาชีพ",
      "การเข้าร่วมอบรมออนไลน์ให้ครบทุกหลักสูตร",
      "การสอบเลื่อนวิทยฐานะให้ผ่านเร็วที่สุด"
    ],
    correctAnswer: 1, // ข.
    explanation: "Competency-Based เน้นที่ Performance (การทำได้จริง) ไม่ใช่แค่ Knowledge (ความรู้) หรือ Certificate (ใบรับรอง)"
  },
  {
    id: 4,
    question: "ตามกรอบ OECD Learning Compass 2030 คำว่า 'Student Agency' หมายถึงสิ่งใด?",
    options: [
      "ตัวแทนจำหน่ายสินค้าของนักเรียน",
      "หน่วยงานราชการที่ดูแลนักเรียน",
      "ความสามารถของนักเรียนในการกำหนดเป้าหมายและลงมือทำเพื่อเปลี่ยนแปลงสิ่งต่างๆ",
      "ชมรมนักเรียนในโรงเรียน"
    ],
    correctAnswer: 2, // ค.
    explanation: "Student Agency คือ 'ความสามารถในการเป็นผู้กระทำการ' (Agency) ที่มีเป้าหมายและสร้างการเปลี่ยนแปลง (Transformative)"
  },
  {
    id: 5,
    question: "องค์ประกอบสำคัญที่สุดของชุมชนแห่งการเรียนรู้ทางวิชาชีพ (PLC) คือข้อใด?",
    options: [
      "การประชุมตามคำสั่งผู้อำนวยการ",
      "การรวมตัวกันเพื่อมุ่งเน้นที่การเรียนรู้ของผู้เรียน (Focus on Learning)",
      "การจับกลุ่มนินทาปัญหาในโรงเรียน",
      "การทำเอกสารรายงานการประชุมให้ครบถ้วน"
    ],
    correctAnswer: 1, // ข.
    explanation: "DuFour (2004) ระบุว่าหัวใจของ PLC คือ 'Focus on Learning' ไม่ใช่แค่ Focus on Teaching หรือ Meeting"
  },
  {
    id: 6,
    question: "ทฤษฎี Social Interdependence ในการสร้างเครือข่ายการเรียนรู้ เน้นย้ำเรื่องใด?",
    options: [
      "ต่างคนต่างอยู่ เพื่อลดความขัดแย้ง",
      "การพึ่งพาอาศัยกันเชิงบวก (Positive Interdependence) เพื่อความสำเร็จร่วมกัน",
      "การแข่งขันกันเรียนดี เพื่อกระตุ้นความพยายาม",
      "การพึ่งพาผู้นำกลุ่มเพียงคนเดียว"
    ],
    correctAnswer: 1, // ข.
    explanation: "ทฤษฎีนี้ระบุว่า ความสำเร็จของกลุ่มเกิดจากการที่สมาชิกตระหนักว่าตนเองจะสำเร็จได้ก็ต่อเมื่อเพื่อนสำเร็จด้วย (Sink or Swim Together)"
  },
  {
    id: 7,
    question: "ลักษณะสำคัญของการจัดการเรียนรู้แบบ Active Learning คืออะไร?",
    options: [
      "ผู้เรียนนั่งฟังบรรยายอย่างเงียบสงบ",
      "ผู้เรียนได้ลงมือกระทำและใช้กระบวนการคิดขั้นสูง (Thinking Tasks)",
      "ครูเดินไปมาทั่วห้องเรียนตลอดเวลา",
      "การเปิดโอกาสให้ผู้เรียนวิ่งเล่นได้อย่างอิสระ"
    ],
    correctAnswer: 1, // ข.
    explanation: "Active Learning ไม่ใช่แค่ Physically Active (ขยับตัว) แต่ต้อง Cognitively Active (ขยับสมอง/คิดวิเคราะห์) ตามแนวคิด Constructivism"
  },
  {
    id: 8,
    question: "ขั้นตอนแรกของกระบวนการ Design Thinking ที่ใช้ในการสร้างนวัตกรรมคืออะไร?",
    options: [
      "Empathize (ทำความเข้าใจกลุ่มเป้าหมายอย่างลึกซึ้ง)",
      "Define (ระบุปัญหา)",
      "Ideate (ระดมความคิด)",
      "Prototype (สร้างต้นแบบ)"
    ],
    correctAnswer: 0, // ก.
    explanation: "Design Thinking เริ่มต้นที่ Empathize เสมอ เพื่อเข้าใจ 'ผู้ใช้' (User) ก่อนแก้ปัญหา (Pain Point) ได้ตรงจุด"
  },
  {
    id: 9,
    question: "หลักการสำคัญของ Micro-teaching คืออะไร?",
    options: [
      "การสอนเนื้อหาทั้งหมดในเวลาจำกัด",
      "การย่อส่วนการสอน (ลดเวลา, ลดเนื้อหา) เพื่อฝึกทักษะเฉพาะอย่าง",
      "การใช้กล้องจุลทรรศน์ช่วยในการสอน",
      "การสอนนักเรียนกลุ่มใหญ่ด้วยไมโครโฟน"
    ],
    correctAnswer: 1, // ข.
    explanation: "'Micro' แปลว่าเล็ก/ย่อส่วน หลักการคือ Simplify สถานการณ์ซับซ้อนให้เหลือจุดโฟกัสเดียวเพื่อฝึกฝน (Stanford Model)"
  },
  {
    id: 10,
    question: "John Dewey กล่าวถึงความสำคัญของ Reflection (การสะท้อนคิด) ไว้อย่างไร?",
    options: [
      "ไม่จำเป็นต้องทำ ถ้าผลการสอนออกมาดีแล้ว",
      "ทำเพื่อให้ครบขั้นตอนเอกสารธุรการ",
      "การเรียนรู้เกิดจากประสบการณ์บวกกับการสะท้อนคิด (Experience + Reflection = Learning)",
      "เป็นการเสียเวลาสอน ควรเอาเวลาไปสอนเนื้อหาเพิ่ม"
    ],
    correctAnswer: 2, // ค.
    explanation: "Dewey ระบุว่า หากทำไปเรื่อยๆ โดยไม่คิดทบทวน (Reflection) เราจะไม่เกิดปัญญา (Wisdom) หรือการปรับปรุง"
  }
];

// ฟังก์ชันสุ่มข้อสอบ (Fisher-Yates Shuffle)
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// ฟังก์ชันสุ่มตัวเลือกในแต่ละข้อ
const shuffleOptions = (question) => {
  const optionsWithIndex = question.options.map((opt, index) => ({ text: opt, originalIndex: index }));
  const shuffledOptions = shuffleArray(optionsWithIndex);
  
  return {
    ...question,
    options: shuffledOptions.map(o => o.text),
    // เราต้อง map คำตอบที่ถูกไปยัง index ใหม่หลังสุ่ม
    correctAnswer: shuffledOptions.findIndex(o => o.originalIndex === question.correctAnswer)
  };
};

// Export สำหรับ Pre-test (เอาทั้งหมด 10 ข้อ หรือสุ่มก็ได้)
export const getPreTestQuestions = () => {
  // Pre-test อาจจะเอาข้อสอบทั้งหมดมาสุ่มลำดับ
  const shuffledQuestions = shuffleArray(questionBank);
  return shuffledQuestions.map(shuffleOptions);
};

// Export สำหรับ Post-test (สุ่มมา 10 ข้อ หรือตามจำนวนที่ต้องการ)
export const getPostTestQuestions = (count = 10) => {
  const shuffledQuestions = shuffleArray(questionBank);
  const selectedQuestions = shuffledQuestions.slice(0, count);
  return selectedQuestions.map(shuffleOptions);
};