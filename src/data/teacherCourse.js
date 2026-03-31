const mcq = (id, question, options, correctAnswer) => ({
  id,
  question,
  options,
  correctAnswer,
});

const textareaField = (id, label, placeholder, options = {}) => ({
  id,
  label,
  type: "textarea",
  placeholder,
  helper: options.helper || "",
  rows: options.rows || 4,
  required: options.required !== false,
});

const textField = (id, label, placeholder, options = {}) => ({
  id,
  label,
  type: options.type || "text",
  placeholder,
  helper: options.helper || "",
  required: options.required !== false,
});

const urlField = (id, label, placeholder, options = {}) =>
  textField(id, label, placeholder, { ...options, type: "url" });

const selectField = (id, label, options, helper = "") => ({
  id,
  label,
  type: "select",
  options,
  helper,
  required: true,
});

const ratingField = (id, label, helper = "") => ({
  id,
  label,
  type: "rating",
  helper,
  min: 1,
  max: 5,
  required: true,
});

const quizLesson = ({
  id,
  title,
  step,
  description,
  mentorTip,
  questions,
  passScore = 0,
  mode = "pretest",
  maxAttempts = null,
}) => ({
  id,
  title,
  type: "quiz",
  step,
  iconName: "ClipboardCheck",
  content: {
    description,
    mentorTip,
    questions,
    passScore,
    mode,
    maxAttempts,
  },
});

const iframeLesson = ({ id, title, step, url, description, mentorTip }) => ({
  id,
  title,
  type: "iframe",
  step,
  iconName: "Video",
  content: {
    url,
    description,
    mentorTip,
  },
});

const questionnaireLesson = ({
  id,
  title,
  step,
  description,
  mentorTip,
  sections,
}) => ({
  id,
  title,
  type: "form",
  step,
  iconName: "PenTool",
  content: {
    renderType: "questionnaire",
    description,
    mentorTip,
    sections,
  },
});

const strategyChoiceLesson = ({
  id,
  title,
  step,
  description,
  mentorTip,
  sourceLessonId,
  sourceFields,
}) => ({
  id,
  title,
  type: "form",
  step,
  iconName: "Layout",
  content: {
    renderType: "strategyChoice",
    description,
    mentorTip,
    sourceLessonId,
    sourceFields,
    criteria: [
      { id: "impact", label: "ผลกระทบต่อผู้เรียน" },
      { id: "feasibility", label: "ทำได้จริงในบริบทโรงเรียน" },
      { id: "urgency", label: "ความเร่งด่วนต่อ Pain Point" },
    ],
  },
});

const reportLesson = ({
  id,
  title,
  badgeName,
  description,
  mentorTip,
}) => ({
  id,
  title,
  type: "report",
  step: 4,
  iconName: "Award",
  content: {
    badgeName,
    description,
    mentorTip,
  },
});

const certificateLesson = ({ id, title, description, mentorTip }) => ({
  id,
  title,
  type: "certificate",
  step: 4,
  iconName: "Award",
  content: {
    description,
    mentorTip,
  },
});

const canvaEmbed = (url) => `${url}?embed`;

export const teacherCourseData = {
  id: "course-teacher",
  title: "InSPIRE360 สำหรับครู",
  description:
    "เส้นทางการพัฒนาครูจากการมองเห็นปัญหา ออกแบบทางออก รวมพลังเครือข่าย สร้างนวัตกรรม และสะท้อนผลอย่างครบวงจร",
  modules: [
    {
      id: "module-1",
      title: "Module 1 : In-Sight",
      shortTitle: "เปิดตา เปิดใจ ค้นหาความต้องการ",
      badgeName: "In-Sight Badge",
      lessons: [
        quizLesson({
          id: "m1-pretest",
          title: "Pre-test Module 1",
          step: 1,
          mode: "pretest",
          description: "ประเมินความเข้าใจก่อนเริ่ม Module 1 โดยไม่มีเกณฑ์ผ่าน/ไม่ผ่าน",
          mentorTip:
            "เริ่มจากสิ่งที่คุณครูเห็นจริงในห้องเรียนก่อนนะครับ คำตอบชุดนี้จะช่วยให้เราเห็นจุดตั้งต้นชัดขึ้น",
          questions: [
            mcq(
              "m1-pre-1",
              "ข้อใดอธิบายเป้าหมายของการทำ Needs Assessment ได้ใกล้เคียงที่สุด",
              [
                "หาคนรับผิดชอบงานเอกสารเพิ่ม",
                "มองหาช่องว่างระหว่างสภาพจริงกับสิ่งที่ควรจะเป็น",
                "คัดเลือกนักเรียนที่เก่งที่สุดในชั้น",
                "กำหนดตารางเรียนใหม่ทุกภาคเรียน",
              ],
              1,
            ),
            mcq(
              "m1-pre-2",
              "SWOT Analysis ช่วยครูได้อย่างไร",
              [
                "ช่วยสรุปคะแนนสอบปลายภาค",
                "ช่วยวิเคราะห์จุดแข็ง จุดอ่อน โอกาส และอุปสรรคเพื่อวางกลยุทธ์",
                "ช่วยตัดสินใจแทนครูทุกสถานการณ์",
                "ช่วยลดชั่วโมงสอนอัตโนมัติ",
              ],
              1,
            ),
            mcq(
              "m1-pre-3",
              "เมื่อเริ่มวิเคราะห์ปัญหาห้องเรียน สิ่งสำคัญที่สุดคืออะไร",
              [
                "ใช้ความรู้สึกของครูอย่างเดียว",
                "เริ่มจากสิ่งที่ผู้บริหารอยากได้",
                "เริ่มจากข้อมูลจริงในบริบทของผู้เรียนและห้องเรียน",
                "ถามเฉพาะนักเรียนที่เก่งที่สุด",
              ],
              2,
            ),
            mcq(
              "m1-pre-4",
              "TOWS Matrix ใช้ทำอะไร",
              [
                "สุ่มกลุ่ม PLC",
                "จับคู่ข้อมูล SWOT เพื่อสร้างกลยุทธ์",
                "เก็บเวลาเข้าเรียน",
                "สรุปคะแนนประจำวัน",
              ],
              1,
            ),
            mcq(
              "m1-pre-5",
              "PDCA เหมาะกับภารกิจใดมากที่สุดใน Module 1",
              [
                "การสรุปบทเรียนเป็นวีดิทัศน์",
                "การออกแบบ Action Plan ที่ลงมือทำได้จริง",
                "การลงทะเบียนผู้ใช้ใหม่",
                "การสุ่มข้อสอบ",
              ],
              1,
            ),
          ],
        }),
        iframeLesson({
          id: "m1-lesson",
          title: "บทเรียน In-Sight",
          step: 2,
          url: canvaEmbed(
            "https://www.canva.com/design/DAHFgpFnz8E/VXANS3zHrTRdvU7XGSIG8Q/view",
          ),
          description: "ศึกษาบทเรียนหลักของ Module 1 ผ่าน Canva ก่อนเริ่มภารกิจ",
          mentorTip:
            "เยี่ยมมากครับ ลองจับตาดูว่าบทเรียนนี้สะกิดประเด็นไหนในบริบทของคุณมากที่สุด",
        }),
        questionnaireLesson({
          id: "m1-mission1-part1",
          title: "Mission 1 Part 1 : 9 มิติของการจัดการชั้นเรียน (จุดแข็ง)",
          step: 3,
          description:
            "ชวนคุยหาจุดแข็งของคุณครูผ่าน 9 มิติของการจัดการชั้นเรียน",
          mentorTip:
            "ขอชวนให้ขิงตัวเองอย่างมีเหตุผลหน่อยครับ จุดแข็งที่มองเห็นชัดจะกลายเป็นฐานพลังของแผนต่อไป",
          sections: [
            {
              title: "Part 1 : ชวนคุยหาจุดแข็ง",
              description: "ตอบให้ครบทั้ง 9 มิติจากประสบการณ์จริงของคุณครู",
              fields: [
                textareaField(
                  "teaching_strength",
                  "1. เทคนิคหรือกิจกรรมแบบไหนที่คุณครูจัดแล้วเด็กๆ 'ตาวาว' สนุกและอินมากที่สุด",
                  "เล่าตัวอย่างกิจกรรมหรือวิธีสอนที่ภูมิใจ",
                ),
                textareaField(
                  "environment_strength",
                  "2. การจัดโต๊ะเรียนหรือกฎเหล็กข้อไหนที่ช่วยให้ห้องสงบขึ้นอย่างเห็นได้ชัด",
                  "อธิบายวิธีจัดห้องและผลที่เกิดขึ้น",
                ),
                textareaField(
                  "system_strength",
                  "3. มีวิธีตรวจงานหรือให้คะแนนแบบไหนที่ทั้งประหยัดเวลาครูและเด็กเข้าใจชัด",
                  "เล่าระบบที่ใช้แล้วเวิร์ก",
                ),
                textareaField(
                  "relationship_strength",
                  "4. โมเมนต์ไหนในห้องเรียนที่ทำให้คุณครูใจฟูหายเหนื่อย",
                  "เล่าเหตุการณ์ที่สะท้อนความสัมพันธ์เชิงบวก",
                ),
                textareaField(
                  "leadership_strength",
                  "5. คุณครูคิดว่าตัวเองเป็นครูสไตล์ไหน และมุมไหนที่ทำให้เด็กกล้าเข้าหา",
                  "อธิบายสไตล์การนำของตัวเอง",
                ),
                textareaField(
                  "mastery_strength",
                  "6. สกิลไหนคือ 'ทีเด็ด' ของคุณครูที่ไม่มีใครเลียนแบบได้ง่าย",
                  "เล่าทักษะเฉพาะตัวที่โดดเด่น",
                ),
                textareaField(
                  "tech_strength",
                  "7. แอป เว็บไซต์ หรือสื่อตัวไหนที่เป็น 'ลูกรัก' ในการสอนตอนนี้",
                  "บอกชื่อเครื่องมือและเหตุผลที่ชอบ",
                ),
                textareaField(
                  "wellbeing_strength",
                  "8. คุณครูมีวิธีชาร์จแบตหรือฮีลใจตัวเองยังไงให้ยังมีแพสชันทุกวัน",
                  "แบ่งปันวิธีดูแลพลังงานของตัวเอง",
                ),
                textareaField(
                  "network_strength",
                  "9. เคยมีเคสไหนที่คุยกับผู้ปกครองหรือเพื่อนครูแล้วช่วยเด็กได้สำเร็จแบบพลิกฝ่ามือ",
                  "เล่ากรณีตัวอย่างของความร่วมมือที่ได้ผล",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m1-mission1-part2",
          title: "Mission 1 Part 2 : 9 มิติของการจัดการชั้นเรียน (จุดอ่อน)",
          step: 3,
          description:
            "สำรวจ Pain Point ของคุณครูผ่าน 9 มิติเดิมเพื่อเตรียมเข้าสู่การวิเคราะห์เชิงกลยุทธ์",
          mentorTip:
            "ลองมองมุมที่ยังคาใจแบบไม่ตัดสินตัวเองนะครับ จุดอ่อนที่มองเห็นชัดจะกลายเป็นจุดตั้งต้นของการเปลี่ยนแปลง",
          sections: [
            {
              title: "Part 2 : ชวนคุยหาจุดอ่อน",
              description: "ตอบอย่างตรงไปตรงมาเพื่อให้ระบบช่วยต่อยอดได้แม่นขึ้น",
              fields: [
                textareaField(
                  "teaching_weakness",
                  "1. เคยมีแผนการสอนไหนที่เตรียมมาดีแต่พอลงสนามจริงกลับแป้ก และคิดว่าเกิดจากอะไร",
                  "เล่า Pain Point ด้านการสอนและการดูแลเด็กเก่ง-อ่อนคละกัน",
                ),
                textareaField(
                  "environment_weakness",
                  "2. สภาพห้องเรียน อากาศ หรือจำนวนเด็กที่ล้นห้องเป็นอุปสรรคมากน้อยแค่ไหน",
                  "อธิบายข้อจำกัดด้านสภาพแวดล้อม",
                ),
                textareaField(
                  "system_weakness",
                  "3. ขั้นตอนไหนในระบบหลังบ้านที่สูบพลังงานคุณครูมากที่สุด",
                  "เช่น เอกสาร กรอกคะแนน หรือภาระงานอื่น",
                ),
                textareaField(
                  "relationship_weakness",
                  "4. มีพฤติกรรมหรือกำแพงไหนของเด็กที่เรายังพังเข้าไปไม่ถึงไหม",
                  "เล่าความท้าทายด้านความสัมพันธ์",
                ),
                textareaField(
                  "leadership_weakness",
                  "5. มีสถานการณ์แบบไหนที่สไตล์ของคุณครูแอบเอาไม่อยู่",
                  "เช่น เจอเด็กต่อต้านหรือห้องเงียบมาก",
                ),
                textareaField(
                  "mastery_weakness",
                  "6. สกิลหรือเรื่องใหม่ๆ อะไรที่คุณครูรู้สึกว่าอยากอัปเวลเพิ่มด่วน",
                  "บอกพื้นที่ที่อยากพัฒนาตัวเอง",
                ),
                textareaField(
                  "tech_weakness",
                  "7. ปัญหาเรื่องไอที อินเทอร์เน็ต หรืออุปกรณ์ มีส่วนไหนที่ทำให้หงุดหงิดบ่อย",
                  "อธิบายข้อจำกัดด้านเทคโนโลยี",
                ),
                textareaField(
                  "wellbeing_weakness",
                  "8. ตอนนี้มีงานหรือความเครียดเรื่องอะไรที่ดึงสมาธิและความสุขในการสอนมากที่สุด",
                  "พูดกันตรงๆ ได้เต็มที่",
                ),
                textareaField(
                  "network_weakness",
                  "9. การสื่อสารกับผู้ปกครองหรือการขอรับการซัพพอร์ตจากส่วนกลางมีช่องโหว่ตรงไหน",
                  "อธิบายสิ่งที่อยากให้ดีขึ้น",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m1-mission2-part1",
          title: "Mission 2 Part 1 : Look Out Of The Room (โอกาส)",
          step: 3,
          description:
            "เจาะลึกปัจจัยภายนอกแบบ PESTEL เพื่อมองเห็นโอกาสที่เป็นลมใต้ปีกของห้องเรียน",
          mentorTip:
            "เวลามองออกนอกห้อง ลองถามตัวเองว่าอะไรคือแรงหนุนที่เราหยิบมาใช้ได้เลยครับ",
          sections: [
            {
              title: "Part 1 : โอกาส (Opportunities)",
              description:
                "เกริ่นนำ: เราคุยเรื่องในห้องเรียนกันไปแล้ว ทีนี้ลองถอยออกมามองกว้างขึ้นอีกนิดนะครับ",
              fields: [
                textareaField(
                  "political_opportunity",
                  "1. นโยบายหรือทิศทางไหนของโรงเรียน/กระทรวงฯ ที่ช่วยให้เราสอนง่ายขึ้นหรือจัดกิจกรรมได้อิสระขึ้น",
                  "มองหาสิ่งที่ 'มาถูกทางแล้ว'",
                ),
                textareaField(
                  "economic_opportunity",
                  "2. ตอนนี้เรามีงบประมาณ เครือข่ายอุปถัมภ์ หรือกองทุนอะไรที่ช่วยซัพพอร์ตการสอนบ้าง",
                  "เล่าทรัพยากรที่หนุนการทำงาน",
                ),
                textareaField(
                  "social_opportunity",
                  "3. มีกระแสหรือความสนใจอะไรของเด็กยุคนี้ที่หยิบมาเป็นตัวล่อให้เขาอยากเรียนได้",
                  "เช่น T-Pop กีฬา เกม หรือเทรนด์ชุมชน",
                ),
                textareaField(
                  "tech_opportunity",
                  "4. มีเทคโนโลยีหรือ AI ตัวไหนที่คุณครูมองว่าถ้าเอามาใช้แล้วต้องปังแน่",
                  "เล่าเครื่องมือที่อยากทดลอง",
                ),
                textareaField(
                  "environment_opportunity",
                  "5. สภาพแวดล้อมหรือชุมชนรอบโรงเรียนมีจุดไหนที่ดึงมาเป็นแหล่งเรียนรู้นอกห้องเรียนได้",
                  "อธิบายพื้นที่หรือทรัพยากรในชุมชน",
                ),
                textareaField(
                  "legal_opportunity",
                  "6. มีกฎระเบียบหรือมาตรการความปลอดภัยข้อไหนที่ช่วยให้ครูและเด็กทำงานร่วมกันได้สบายใจขึ้น",
                  "เล่ากติกาที่ช่วยเสริมการทำงาน",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m1-mission2-part2",
          title: "Mission 2 Part 2 : Look Out Of The Room (อุปสรรค)",
          step: 3,
          description:
            "มองเห็นอุปสรรคภายนอกแบบ PESTEL เพื่อเตรียมกลยุทธ์เชิงรับและการป้องกัน",
          mentorTip:
            "ถ้าเรามองพายุชัด เราจะวางเกราะได้แม่นขึ้นครับ ลองเล่าตามจริงแบบไม่ต้องเกรงใจ",
          sections: [
            {
              title: "Part 2 : อุปสรรค (Threats)",
              description:
                "นำข้อมูลนี้ไปจับคู่กับจุดอ่อนเพื่อสร้างกลยุทธ์เชิงรับหรือระบบช่วยเหลือ",
              fields: [
                textareaField(
                  "political_threat",
                  "1. มีนโยบาย โครงการ หรือคำสั่งด่วนไหนที่ทำให้รู้สึกอึดอัด กระทบเวลาสอน หรือกลายเป็นภาระงาน",
                  "ระบุแรงกดดันจากนโยบาย",
                ),
                textareaField(
                  "economic_threat",
                  "2. สภาพเศรษฐกิจของครอบครัวเด็กส่งผลกระทบกับห้องเรียนอย่างไร",
                  "เช่น เด็กไม่มีเงินกินข้าว ไม่มีอุปกรณ์ หรือขาดเรียนไปช่วยงานที่บ้าน",
                ),
                textareaField(
                  "social_threat",
                  "3. ปัญหาครอบครัวหรือค่านิยมทางสังคมเรื่องไหนกระทบกับสมาธิ พฤติกรรม หรือความสม่ำเสมอของเด็กมากที่สุด",
                  "เล่าความท้าทายทางสังคมที่เห็นชัด",
                ),
                textareaField(
                  "tech_threat",
                  "4. ความเหลื่อมล้ำทางเทคโนโลยีหรือภัยไซเบอร์แบบไหนที่สร้างความหนักใจในการสอนมากที่สุด",
                  "เช่น ไม่มีมือถือ/เน็ต ติดเกม หรือบูลลี่ออนไลน์",
                ),
                textareaField(
                  "environment_threat",
                  "5. ปัญหาเรื่องสภาพแวดล้อม เช่น อากาศร้อน ฝุ่น PM2.5 หรืออาคารทรุดโทรม กระทบบ่อยแค่ไหน",
                  "อธิบายผลต่อสุขภาพและสมาธิของเด็ก/ครู",
                ),
                textareaField(
                  "legal_threat",
                  "6. มีกฎหมายหรือความอ่อนไหวทางสังคมเรื่องไหนที่ทำให้คุณครูแอบเกร็งเวลาจัดการปัญหาพฤติกรรมเด็ก",
                  "เช่น PDPA การถ่ายรูปเด็ก กฎการลงโทษ หรือสิทธิมนุษยชน",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m1-mission3",
          title: "Mission 3 : Strategy Fusion (TOWS Matrix)",
          step: 3,
          description:
            "จับคู่ข้อมูลจาก SWOT/TOWS เพื่อสร้างอย่างน้อย 3 กลยุทธ์ที่พร้อมนำไปคัดเลือก",
          mentorTip:
            "เยี่ยมมากครับ ตอนนี้ลองเปลี่ยนข้อมูลที่มีให้เป็นแนวทางลงมือทำจริง โดยมองทั้งรุก รับ และพลิกข้อจำกัด",
          sections: [
            {
              title: "สร้าง 3 กลยุทธ์",
              description:
                "อาจเป็น SO, WO, ST หรือ WT ก็ได้ ขอให้สอดคล้องกับคำตอบในภารกิจก่อนหน้า",
              fields: [
                textareaField(
                  "strategy_1",
                  "กลยุทธ์ที่ 1",
                  "เช่น SO - ใช้จุดแข็งด้านการเล่าเรื่องของครู + แหล่งเรียนรู้ชุมชน สร้างกิจกรรมเล่านิทานชายแดน",
                ),
                textareaField(
                  "strategy_2",
                  "กลยุทธ์ที่ 2",
                  "เขียนให้เห็นคู่ข้อมูลที่นำมาจับกันและผลลัพธ์ที่คาดหวัง",
                ),
                textareaField(
                  "strategy_3",
                  "กลยุทธ์ที่ 3",
                  "กลยุทธ์นี้ควรช่วยแก้ Pain Point และสอดคล้องกับบริบทจริง",
                ),
              ],
            },
          ],
        }),
        strategyChoiceLesson({
          id: "m1-mission4",
          title: "Mission 4 : Needs Detective",
          step: 3,
          description:
            "ให้คะแนนกลยุทธ์จาก Mission 3 แล้วเลือก 1 กลยุทธ์หลักสำหรับออกแบบ Action Plan",
          mentorTip:
            "ลองชั่งน้ำหนักอย่างใจเย็นนะครับ กลยุทธ์ที่ชนะไม่จำเป็นต้องใหญ่ที่สุด แต่ต้องเหมาะกับบริบทของเรา",
          sourceLessonId: "m1-mission3",
          sourceFields: ["strategy_1", "strategy_2", "strategy_3"],
        }),
        questionnaireLesson({
          id: "m1-mission5",
          title: "Mission 5 : Action Plan (PDCA)",
          step: 3,
          description:
            "ใช้ PDCA ออกแบบแผนปฏิบัติการจากกลยุทธ์ที่เลือกไว้ใน Mission 4",
          mentorTip:
            "สุดท้ายแล้วแผนที่ดีต้องลงมือได้จริง ลองเขียนให้เห็นว่าเริ่มตรงไหน เช็กอะไร และจะปรับยังไงครับ",
          sections: [
            {
              title: "PDCA Action Plan",
              description: "เขียนให้ครบทั้ง Plan, Do, Check, Act",
              fields: [
                textareaField("plan", "Plan", "เราจะเตรียมอะไร ใครเกี่ยวข้อง และเป้าหมายระยะสั้นคืออะไร"),
                textareaField("do", "Do", "เราจะเริ่มทดลองทำอะไรในห้องเรียนจริง"),
                textareaField("check", "Check", "เราจะวัดผลหรือเก็บหลักฐานอย่างไร"),
                textareaField("act", "Act", "ถ้าพบปัญหาหรือโอกาสใหม่ เราจะปรับแผนอย่างไร"),
              ],
            },
          ],
        }),
        quizLesson({
          id: "m1-posttest",
          title: "Post-test Module 1",
          step: 4,
          mode: "posttest",
          passScore: 3,
          description: "แบบทดสอบหลังเรียน Module 1 จำนวน 5 ข้อ ผ่านเมื่อได้อย่างน้อย 3 คะแนน",
          mentorTip:
            "เก็บเกี่ยวสิ่งที่ได้จากโมดูลนี้ให้เต็มที่นะครับ ถ้าพลาดรอบแรก เราทบทวนแล้วลองใหม่ได้เสมอ",
          questions: [
            mcq(
              "m1-post-1",
              "ข้อมูลในช่อง Strengths ของ SWOT ควรมาจากอะไร",
              [
                "ปัจจัยภายในที่เป็นจุดแข็งของครูหรือระบบงาน",
                "ข่าวจากภายนอกทั้งหมด",
                "ข้อสอบที่เด็กทำผิดมากที่สุดเท่านั้น",
                "ความคิดเห็นของคนเพียงคนเดียว",
              ],
              0,
            ),
            mcq(
              "m1-post-2",
              "ข้อมูลจาก PESTEL ควรนำไปจัดอยู่ในส่วนใดของ SWOT",
              [
                "Strengths และ Weaknesses เท่านั้น",
                "Opportunities และ Threats เป็นหลัก",
                "ไม่เกี่ยวข้องกัน",
                "ใช้แทน SWOT ได้ทั้งหมด",
              ],
              1,
            ),
            mcq(
              "m1-post-3",
              "ภารกิจ Strategy Fusion ต้องการผลลัพธ์ใด",
              [
                "ข้อสอบอีกหนึ่งชุด",
                "อย่างน้อย 3 กลยุทธ์ที่จับคู่ข้อมูล SWOT/TOWS",
                "แผนการเงินโรงเรียน",
                "วิดีโอนำเสนอ 1 นาที",
              ],
              1,
            ),
            mcq(
              "m1-post-4",
              "Needs Detective มีหน้าที่สำคัญที่สุดคืออะไร",
              [
                "เลือกกลยุทธ์ที่เหมาะที่สุดจากหลายทางเลือก",
                "สร้างคำถาม PESTEL ใหม่",
                "ปิดการเรียนโมดูลถัดไป",
                "แทนที่ PDCA",
              ],
              0,
            ),
            mcq(
              "m1-post-5",
              "Action Plan ในโมดูลนี้ใช้กรอบใด",
              ["OECD", "SMART", "PDCA", "5W1H"],
              2,
            ),
          ],
        }),
        reportLesson({
          id: "m1-report",
          title: "Report Card Module 1",
          badgeName: "In-Sight Badge",
          description:
            "สรุปคำตอบทั้งหมดของ Module 1 พร้อมปลดล็อก Module 2 เมื่อยืนยันรับรายงาน",
          mentorTip:
            "เยี่ยมมากครับ นี่คือภาพรวมความคิดและแผนตั้งต้นของคุณครู พร้อมพก In-Sight Badge ไปต่อยอดแล้ว",
        }),
      ],
    },
    {
      id: "module-2",
      title: "Module 2 : S-Design",
      shortTitle: "ออกแบบฝัน ปั้นแผนสู่การพัฒนา",
      badgeName: "S-Design Badge",
      lessons: [
        quizLesson({
          id: "m2-pretest",
          title: "Pre-test Module 2",
          step: 1,
          mode: "pretest",
          description: "ประเมินความเข้าใจก่อนเริ่มออกแบบโครงการใน Module 2",
          mentorTip:
            "ตอนนี้เราจะย้ายจากการมองเห็นปัญหาไปสู่การออกแบบทางออก ลองตอบตามความเข้าใจปัจจุบันก่อนนะครับ",
          questions: [
            mcq(
              "m2-pre-1",
              "Dream Lab ชวนให้ครูคิดแบบใด",
              [
                "คิดภายใต้กรอบงบประมาณเท่านั้น",
                "คิดไอเดียเชิงกลยุทธ์แบบไร้ข้อจำกัดก่อนกลับมาแปลงเป็นแผนจริง",
                "เลียนแบบโครงการเดิมทั้งหมด",
                "ตอบแบบสั้นที่สุด",
              ],
              1,
            ),
            mcq(
              "m2-pre-2",
              "SMART Objective เน้นสิ่งใด",
              [
                "ความรู้สึกที่ดีต่อโครงการอย่างเดียว",
                "เป้าหมายที่วัดผลได้ ทำได้จริง และมีกำหนดเวลา",
                "กิจกรรมที่ยิ่งใหญ่ที่สุดเสมอ",
                "การทำงานโดยไม่มีตัวชี้วัด",
              ],
              1,
            ),
            mcq(
              "m2-pre-3",
              "30-Day Sprint ควรให้ความสำคัญกับอะไร",
              [
                "Quick Win รายสัปดาห์",
                "ทำงานเฉพาะสัปดาห์สุดท้าย",
                "ตัด Feedback ออกทั้งหมด",
                "ขยายขอบเขตจนเกินจริง",
              ],
              0,
            ),
            mcq(
              "m2-pre-4",
              "5W1H ช่วยอะไรในโมดูลนี้",
              [
                "ทำให้คำอธิบายโครงการกระชับและชัดเจน",
                "แทนที่ทุกภารกิจก่อนหน้า",
                "ใช้เฉพาะกับรายวิชาคณิตศาสตร์",
                "ลดจำนวนผู้เรียน",
              ],
              0,
            ),
            mcq(
              "m2-pre-5",
              "The 3 Lenses of Impact ช่วยตรวจสอบอะไร",
              [
                "สีของสไลด์นำเสนอ",
                "ความเชื่อมโยงของโครงการกับเป้าหมายระดับโลก ระดับชาติ และระดับพื้นที่",
                "ความเร็วอินเทอร์เน็ต",
                "จำนวนโต๊ะในห้องเรียน",
              ],
              1,
            ),
          ],
        }),
        iframeLesson({
          id: "m2-lesson",
          title: "บทเรียน S-Design",
          step: 2,
          url: canvaEmbed(
            "https://www.canva.com/design/DAHFggQuQrA/wjrRXDYOTSIPJ65KkbAlLA/view",
          ),
          description: "ศึกษาบทเรียนหลักของ Module 2 ผ่าน Canva",
          mentorTip:
            "ลองถามตัวเองระหว่างดูบทเรียนว่า หากฝันได้เต็มที่ เราอยากเห็นอะไรเกิดขึ้นกับเด็กๆ ใน 30 วันข้างหน้า",
        }),
        questionnaireLesson({
          id: "m2-mission1",
          title: "Mission 1 : Dream Lab & TOWS Matrix",
          step: 3,
          description:
            "จำลองโลกไร้ข้อจำกัดเพื่อจุดประกายไอเดียเชิงกลยุทธ์ผ่านคำถาม 4 มุมมอง",
          mentorTip:
            "อย่าเพิ่งรีบเบรกตัวเองครับ ช่วงนี้คือพื้นที่ของการฝันอย่างมีทิศทาง แล้วค่อยดึงกลับมาใช้จริงทีหลัง",
          sections: [
            {
              title: "Dream Lab",
              description: "ตอบคำถามปลายเปิด 4 ข้อ",
              fields: [
                textareaField(
                  "so_idea",
                  "SO (รุกให้สุด)",
                  "ถ้าไร้ข้อจำกัด อยากดึงไม้ตายหรือความถนัดอะไรของตัวเองมาทำโปรเจกต์ในฝันให้เด็กๆ",
                ),
                textareaField(
                  "wo_idea",
                  "WO (พลิกจุดอ่อน)",
                  "ถ้ามีเวทมนตร์ลบปัญหาที่เหนื่อยที่สุดได้ 1 อย่าง โลกการทำงานจะเปลี่ยนไปแบบไหน และในโลกจริงเราจะใช้โอกาสอะไรมาช่วย",
                ),
                textareaField(
                  "st_idea",
                  "ST (ตั้งรับให้มั่น)",
                  "ท่ามกลางโลกที่เปลี่ยนไว จะใช้ความเก่งของตัวเองสร้างเกราะป้องกันหรือทักษะชีวิตให้เด็กได้อย่างไร",
                ),
                textareaField(
                  "wt_idea",
                  "WT (ถอยเพื่อสร้างเซฟโซน)",
                  "ถ้ายกเลิกระบบประเมินไปได้ อยากออกแบบวัฒนธรรมการทำงานใหม่แบบไหนให้ครูมีความสุขและเหนื่อยน้อยลง",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m2-mission2",
          title: "Mission 2 : Vibe Check",
          step: 3,
          description:
            "สร้างภาพจำของห้องเรียนในฝันผ่าน 3 ผัสสะ เพื่อกำหนด Mood & Tone ของโครงการ",
          mentorTip:
            "ลองจินตนาการให้ชัดจนเหมือนได้เดินเข้าไปอยู่ในห้องนั้นจริงๆ นะครับ ยิ่งเห็นภาพชัด แผนยิ่งมีพลัง",
          sections: [
            {
              title: "Sensory Board",
              description: "อธิบายบรรยากาศผ่านตา หู และใจ",
              fields: [
                textareaField(
                  "visual",
                  "Visual : ตาเห็นอะไร",
                  "สภาพแวดล้อม การจัดพื้นที่ หรือท่าทางของเด็กๆ เป็นอย่างไร",
                ),
                textareaField(
                  "audio",
                  "Audio : หูได้ยินอะไร",
                  "บทสนทนา เสียงหัวเราะ หรือระดับความครื้นเครงเป็นแบบไหน",
                ),
                textareaField(
                  "feeling",
                  "Feeling : ใจรู้สึกอย่างไร",
                  "มวลอารมณ์รวมของพื้นที่ เช่น ปลอดภัย เป็นอิสระ ท้าทาย",
                ),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m2-mission3",
          title: "Mission 3 : Mapping the Journey",
          step: 3,
          description:
            "ออกแบบแผนปฏิบัติการ 30 วันเพื่อแก้ Pain Point จาก Module 1 ผ่าน Quick Win 4 สัปดาห์",
          mentorTip:
            "ค่อยๆ แตกฝันให้เป็นก้าวเล็กที่ทำได้จริงนะครับ แผนที่ดีไม่จำเป็นต้องยิ่งใหญ่ แต่ต้องเริ่มได้ทันที",
          sections: [
            {
              title: "30-Day Sprint",
              description: "ออกแบบ 4 สัปดาห์ให้เห็นลำดับการลงมือ",
              fields: [
                textareaField("week1", "Week 1 (Set Up)", "การเตรียมความพร้อมด้านสื่อ พื้นที่ หรือข้อตกลงกับเด็กๆ"),
                textareaField("week2", "Week 2 (Pilot)", "กิจกรรมแรกที่ลงมือทดลองทำจริง"),
                textareaField("week3", "Week 3 (Feedback)", "วิธีการวัดผล รับฟังความรู้สึก และปรับแก้"),
                textareaField("week4", "Week 4 (Showcase)", "วิธีสรุปผลและเฉลิมฉลองความสำเร็จร่วมกัน"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m2-mission4",
          title: "Mission 4 : Define 5W1H",
          step: 3,
          description:
            "แปลงแผนจาก Mission 3 เป็นคำโปรยโปรเจกต์ที่อ่านจบแล้วเห็นภาพทันที",
          mentorTip:
            "ลองเล่าให้เหมือนกำลังชวนคนอื่นให้เห็นความเจ๋งของโปรเจกต์เราแบบกระชับและคมชัดครับ",
          sections: [
            {
              title: "The Pitch Deck",
              description: "ตอบ 5W1H แบบกระชับ",
              fields: [
                textareaField("who_what", "Who & What", "ใครคือกลุ่มเป้าหมาย และกิจกรรมหลักคืออะไร"),
                textareaField("where_when", "Where & When", "ใช้พื้นที่ไหน และกรอบเวลาใด"),
                textareaField("why", "Why", "ทำไมโปรเจกต์นี้ถึงสำคัญ และช่วยทุบ Pain Point อย่างไร"),
                textareaField("how", "How", "ไม้ตายหรือกระบวนการเด็ดที่จะทำให้เป้าหมายสำเร็จคืออะไร"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m2-mission5",
          title: "Mission 5 : SMART Objective",
          step: 3,
          description:
            "สรุปรายละเอียดทั้งหมดให้เป็นคำมั่นสัญญาของโปรเจกต์ 1-2 ประโยคตามหลัก SMART",
          mentorTip:
            "นี่คือหัวใจของการสื่อสารเป้าหมายครับ ลองเขียนให้ชัด วัดได้ และกระชับจนทุกคนเห็นภาพเดียวกัน",
          sections: [
            {
              title: "SMART Promise",
              description: "เขียนข้อความ 1-2 ประโยคที่เฉพาะ วัดได้ ทำได้จริง และมีเวลาแน่นอน",
              fields: [
                textareaField("smart_objective", "SMART Objective", "เขียนคำมั่นสัญญาของโปรเจกต์"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m2-mission6",
          title: "Mission 6 : SMART Quality Check",
          step: 3,
          description:
            "ตรวจสอบคุณภาพของ SMART Objective ผ่าน 3 มิติ ได้แก่ Global, National และ Local Lens",
          mentorTip:
            "เยี่ยมมากครับ ตอนนี้เราจะเช็กว่าแผนของเรามีพลังเชื่อมโยงทั้งโลก ประเทศ และพื้นที่จริงแค่ไหน",
          sections: [
            {
              title: "The 3 Lenses of Impact",
              description: "ตอบให้ชัดว่าโครงการนี้มีคุณค่าอย่างไรในแต่ละระดับ",
              fields: [
                textareaField(
                  "global_lens",
                  "Global Lens (OECD Learning Compass 2030)",
                  "โปรเจกต์นี้ช่วยสร้าง Student Agency หรือทักษะแห่งอนาคตให้ผู้เรียนอย่างไร",
                  { rows: 5 },
                ),
                textareaField(
                  "national_lens",
                  "National Lens (พระบรมราโชบาย ร.10)",
                  "โปรเจกต์นี้ปลูกฝังทัศนคติที่ถูกต้อง พื้นฐานชีวิตที่มั่นคง การมีอาชีพ หรือความเป็นพลเมืองดีในมิติใดบ้าง",
                  { rows: 5 },
                ),
                textareaField(
                  "local_lens",
                  "Local Lens (SEZ ชายแดนตาก)",
                  "โปรเจกต์นี้ช่วยเตรียมความพร้อมให้เด็กในพื้นที่ชายแดนด้านภาษา วัฒนธรรม ทักษะอาชีพ หรือการค้าชายแดนอย่างไร",
                  { rows: 5 },
                ),
              ],
            },
          ],
        }),
        quizLesson({
          id: "m2-posttest",
          title: "Post-test Module 2",
          step: 4,
          mode: "posttest",
          passScore: 3,
          description: "แบบทดสอบหลังเรียน Module 2 จำนวน 5 ข้อ ผ่านเมื่อได้อย่างน้อย 3 คะแนน",
          mentorTip:
            "ลองทบทวนเส้นทางที่คุณครูออกแบบไว้ครับ จุดสำคัญคือจากไอเดียสวยๆ ต้องกลับมาลงบนพื้นจริงได้",
          questions: [
            mcq("m2-post-1", "SO ใน TOWS Matrix หมายถึงอะไร", ["ใช้จุดแข็งเพื่อฉวยโอกาส", "ซ่อนจุดอ่อนทั้งหมด", "สร้างเป้าหมายลอยๆ", "หยุดโครงการชั่วคราว"], 0),
            mcq("m2-post-2", "Vibe Check ต้องการให้ครูอธิบายผ่านกี่ผัสสะ", ["1 ผัสสะ", "2 ผัสสะ", "3 ผัสสะ", "5 ผัสสะ"], 2),
            mcq("m2-post-3", "Week 3 ของ 30-Day Sprint ควรเน้นอะไร", ["Feedback และการปรับแก้", "การเปิดคอร์สใหม่", "การปิดโครงการทันที", "การสอบปลายภาค"], 0),
            mcq("m2-post-4", "ข้อใดเป็นองค์ประกอบของ SMART", ["Simple, Modern, Academic, Rapid, Timely", "Specific, Measurable, Achievable, Relevant, Time-bound", "Shared, Manageable, Adaptive, Real, Tested", "Strategic, Moral, Agile, Reflective, Trackable"], 1),
            mcq("m2-post-5", "Local Lens ของโมดูลนี้เน้นบริบทใด", ["เฉพาะนโยบายระดับโลก", "เขตพัฒนาพื้นที่เศรษฐกิจพิเศษชายแดนตาก", "เฉพาะการประเมินวิทยฐานะ", "งานธุรการโรงเรียน"], 1),
          ],
        }),
        reportLesson({
          id: "m2-report",
          title: "Report Card Module 2",
          badgeName: "S-Design Badge",
          description:
            "สรุป Road Map ของ Module 2 พร้อมปลดล็อก Module 3 เมื่อยืนยันรับรายงาน",
          mentorTip:
            "แผนของคุณครูเริ่มชัดขึ้นมากแล้วครับ รับ S-Design Badge แล้วเตรียมพกไอเดียนี้ไปเจอพลังจากเครือข่ายครูต่อได้เลย",
        }),
      ],
    },
    {
      id: "module-3",
      title: "Module 3 : P-PLC",
      shortTitle: "รวมพลัง สร้างเครือข่ายแห่งการเรียนรู้",
      badgeName: "P-PLC Badge",
      lessons: [
        quizLesson({
          id: "m3-pretest",
          title: "Pre-test Module 3",
          step: 1,
          mode: "pretest",
          description: "ประเมินความพร้อมก่อนเริ่มกระบวนการ PLC",
          mentorTip:
            "เครือข่ายที่ดีเริ่มจากใจที่เปิดครับ ลองสำรวจความพร้อมของตัวเองก่อนก้าวเข้าสู่วง PLC",
          questions: [
            mcq("m3-pre-1", "PLC ที่มีพลังควรมุ่งเน้นสิ่งใด", ["ประโยชน์ของผู้เรียนและการช่วยกันคิด", "การประชุมที่ยาวที่สุด", "การทำเอกสารเพียงอย่างเดียว", "การแข่งขันระหว่างครู"], 0),
            mcq("m3-pre-2", "บทบาท The Challenger ช่วยทีมอย่างไร", ["ทำให้ประชุมช้าลงอย่างเดียว", "ตั้งคำถามเชิงท้าทายเพื่อขัดเกลาไอเดีย", "แทนที่ผู้นำวงทั้งหมด", "เก็บภาพถ่ายเท่านั้น"], 1),
            mcq("m3-pre-3", "ก่อนเริ่มวง PLC ครูควรเตรียมอะไรไปแชร์", ["เฉพาะคะแนนสอบ", "Pain Point และแผน 30 วันจาก Module 2", "อุปกรณ์ทดลองวิทยาศาสตร์", "เอกสารราชการทั้งหมด"], 1),
            mcq("m3-pre-4", "Mission 3 ของ Module 3 ฝึกทักษะใดเด่นที่สุด", ["การทำบัญชี", "Pitching และการสื่อสารเชิงโน้มน้าว", "การเขียนโปรแกรม", "การสอบสัมภาษณ์"], 1),
            mcq("m3-pre-5", "หลักฐาน Vibe Check มีหน้าที่อะไร", ["ยืนยันบรรยากาศการทำ PLC จริง", "ใช้แทน One-Page Logbook", "แทนที่การนัดหมาย", "เป็นคะแนนสอบ"], 0),
          ],
        }),
        iframeLesson({
          id: "m3-lesson",
          title: "บทเรียน P-PLC",
          step: 2,
          url: canvaEmbed(
            "https://www.canva.com/design/DAHFglrceqA/WbTYzz93vBYgo8m30raOQg/view",
          ),
          description: "ศึกษาบทเรียนหลักของ Module 3 ผ่าน Canva",
          mentorTip:
            "ลองมองว่า PLC รอบนี้ไม่ใช่แค่การประชุม แต่คือการเติมมุมมองที่ช่วยให้แผนของเรามีชีวิตมากขึ้นครับ",
        }),
        questionnaireLesson({
          id: "m3-mission1",
          title: "Mission 1 : The Mastermind Match",
          step: 3,
          description:
            "รวมกลุ่ม 3-4 คน กำหนดบทบาท และเตรียมนัดหมายวง PLC ให้พร้อมก่อนประชุมจริง",
          mentorTip:
            "การเตรียมวงดีๆ คือครึ่งหนึ่งของความสำเร็จครับ ลองเลือกเพื่อนร่วมวงที่ช่วยขยายมุมมองให้กันได้จริง",
          sections: [
            {
              title: "The Gathering",
              description: "ระบุรูปแบบการนัดพบ ผู้ร่วมวง และบทบาทของแต่ละคน",
              fields: [
                selectField("meeting_mode", "รูปแบบการพบกัน", [{ label: "Online", value: "online" }, { label: "Offline", value: "offline" }], "เลือกให้ตรงกับการนัดหมายจริง"),
                textField("group_members", "รายชื่อสมาชิกกลุ่ม 3-4 คน", "เช่น ครูเอ, ครูบี, ครูซี"),
                textField("meeting_datetime", "วันและเวลานัดหมาย", "เช่น 12 เม.ย. 2569 เวลา 19:00 น."),
                textareaField("meeting_link_or_location", "ลิงก์ Google Meet/Zoom หรือพิกัดสถานที่นัดพบ", "วางลิงก์ห้องประชุม หรือระบุสถานที่นัดพบให้ชัดเจน"),
                textareaField("roles", "สรุปบทบาทของแต่ละคน", "ระบุว่าใครเป็น Facilitator, Time Keeper, Challenger และ Note Taker"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m3-mission2",
          title: "Mission 2 : The Alchemy Logbook",
          step: 3,
          description:
            "ลงมือทำ PLC จริง แล้วส่งหลักฐานเป็น One-Page Logbook และ Vibe Check Evidence",
          mentorTip:
            "วงสนทนาที่ดีไม่ต้องสมบูรณ์แบบครับ แค่ซื่อสัตย์กับสิ่งที่เรียนรู้จากกันและกันก็มีคุณค่ามากแล้ว",
          sections: [
            {
              title: "หลักฐานการประชุม PLC",
              description: "ส่งลิงก์ไฟล์สรุปและหลักฐานบรรยากาศ",
              fields: [
                urlField("logbook_link", "ลิงก์ One-Page Logbook", "วางลิงก์ Google Drive / Padlet / เอกสารสรุป"),
                urlField("vibe_link", "ลิงก์ภาพถ่ายหรือวิดีโอ Vibe Check", "วางลิงก์ภาพหน้าจอประชุม รูปกลุ่ม หรือวิดีโอสั้น"),
                textareaField("aha_moment", "Aha! Moment ที่ได้จากเพื่อนครู", "สรุปว่าได้ไอเดียปิ๊งแว้บอะไรจากวง PLC ไปปรับใช้บ้าง"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m3-mission3",
          title: "Mission 3 : The 60-Second Spell",
          step: 3,
          description:
            "ร่างสคริปต์ Pitching 1 นาที และแนบลิงก์ไฟล์เสียง/วิดีโอสำหรับขายไอเดียโปรเจกต์",
          mentorTip:
            "ลองเล่าให้เหมือนกำลังคุยกับคนที่อยากช่วยเราอยู่ครับ กระชับ ชัด และมีพลังพอให้เขาเห็นภาพตาม",
          sections: [
            {
              title: "Script Box",
              description: "เรียงเนื้อหา Hook > Pain Point > Solution > Impact",
              fields: [
                textareaField("hook", "Hook (10 วินาที)", "ประโยคเปิดที่ดึงความสนใจทันที"),
                textareaField("pain_point", "Pain Point (15 วินาที)", "สรุปปัญหาจาก Module 1"),
                textareaField("solution", "Solution (20 วินาที)", "สรุปเป้าหมาย SMART หรือโปรเจกต์ 30 วัน"),
                textareaField("impact", "Impact (15 วินาที)", "ผลลัพธ์ที่จะเกิดกับเด็กๆ และชุมชน"),
                urlField("media_link", "ลิงก์ไฟล์เสียงหรือวิดีโอ", "เช่น Google Drive, YouTube แบบ Unlisted หรือ TikTok"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m3-posttest",
          title: "Post-test Module 3 : The Reflection Mirror",
          step: 4,
          description:
            "สะท้อนความรู้สึกหลังผ่านกระบวนการ PLC ด้วยคำถามปลายเปิด 1 ข้อ",
          mentorTip:
            "หยุดมองย้อนกลับสักนิดนะครับ พลังของเครือข่ายมักซ่อนอยู่ในมุมที่เราไม่ทันสังเกต",
          sections: [
            {
              title: "Reflection",
              description:
                "จากการได้ร่วมวง PLC และแลกเปลี่ยนไอเดียกับเพื่อนครู คุณครูค้นพบพลังวิเศษหรือมุมมองใหม่อะไร",
              fields: [
                textareaField("reflection", "คำตอบของคุณครู", "เขียนสะท้อนว่าเครือข่ายช่วยเติมเต็มให้โปรเจกต์สมบูรณ์และเป็นไปได้จริงมากขึ้นอย่างไร", { rows: 6 }),
              ],
            },
          ],
        }),
        reportLesson({
          id: "m3-report",
          title: "Report Card Module 3",
          badgeName: "P-PLC Badge",
          description:
            "สรุปหลักฐานและบทเรียนจากวง PLC พร้อมปลดล็อก Module 4 เมื่อยืนยันรับรายงาน",
          mentorTip:
            "ยอดเยี่ยมมากครับ คุณครูไม่ได้เดินคนเดียวแล้ว รับ P-PLC Badge แล้วต่อยอดไอเดียให้เป็นนวัตกรรมจริงกันต่อ",
        }),
      ],
    },
    {
      id: "module-4",
      title: "Module 4 : I-Innovation",
      shortTitle: "ก้าวสู่ความพร้อม จุดประกายนวัตกรรม",
      badgeName: "In-Innovation Badge",
      lessons: [
        quizLesson({
          id: "m4-pretest",
          title: "Pre-test Module 4",
          step: 1,
          mode: "pretest",
          description: "ประเมินความเข้าใจก่อนสร้างนวัตกรรมการสอนใน Module 4",
          mentorTip:
            "นวัตกรรมไม่จำเป็นต้องใหญ่โตนะครับ แต่อยากให้ตั้งต้นด้วยโจทย์จริงและวิธีสอนที่เหมาะกับเด็กๆ ของเรา",
          questions: [
            mcq("m4-pre-1", "นวัตกรรมการสอนที่ดีตามโมดูลนี้เกิดจากอะไร", ["ใช้เทคโนโลยีแพงที่สุด", "ผสมเครื่องมือกับ pedagogy ที่เหมาะกับบริบทจริง", "ใช้ AI เสมอ", "เลียนแบบทั้งหมดจากอินเทอร์เน็ต"], 1),
            mcq("m4-pre-2", "One-Page Blueprint ช่วยอะไร", ["ทำให้แผนการสอนอ่านเห็นภาพเร็วและยืดหยุ่นขึ้น", "แทนที่การสอนจริง", "ใช้เฉพาะงานประชุม", "ลดจำนวนนักเรียนในห้อง"], 0),
            mcq("m4-pre-3", "Crafting Session คืออะไร", ["การสรุปผลสอบ", "การลงมือสร้างสื่อหรือชิ้นงานจริงจากพิมพ์เขียว", "การสุ่มจับคู่ครู", "การทำแบบสอบถามผู้ปกครอง"], 1),
            mcq("m4-pre-4", "Beta Test ช่วยอย่างไร", ["ทำให้ไม่ต้องรับฟังใคร", "ช่วยหาจุดเด่นและจุดปรับปรุงก่อนใช้จริงเต็มรูปแบบ", "ทำให้ไม่ต้องสร้างสื่อ", "เป็นเพียงขั้นตอนเสริมที่ไม่จำเป็น"], 1),
            mcq("m4-pre-5", "Hook, Action, Reflect คืออะไร", ["โครงสร้างสรุปการเงิน", "ช่วงสำคัญของคาบเรียนในพิมพ์เขียว", "ตัวชี้วัด OEECD", "ชื่อ Badge ของ Module 4"], 1),
          ],
        }),
        iframeLesson({
          id: "m4-lesson",
          title: "บทเรียน I-Innovation",
          step: 2,
          url: canvaEmbed(
            "https://www.canva.com/design/DAHFgi56U6Q/zlELbaa9zOznNXxcgepZdQ/view",
          ),
          description: "ศึกษาบทเรียนหลักของ Module 4 ผ่าน Canva",
          mentorTip:
            "ระหว่างดูบทเรียน ลองคิดไว้เลยครับว่าคุณครูอยากจับคู่เครื่องมืออะไรกับวิธีสอนแบบไหนเพื่อแก้ Pain Point เดิม",
        }),
        questionnaireLesson({
          id: "m4-mission1",
          title: "Mission 1 : Innovation Lab",
          step: 3,
          description:
            "จับคู่ 1 เครื่องมือเข้ากับ 1 กระบวนการ Active Learning พร้อมตั้งชื่อนวัตกรรมของตัวเอง",
          mentorTip:
            "ลองผสมสูตรที่เป็นตัวคุณครูจริงๆ ดูครับ สูตรที่ดีไม่ต้องล้ำที่สุด แต่ต้องเข้ากับเด็กและบริบทของเรา",
          sections: [
            {
              title: "สูตรผสมไอเทมลับ",
              description: "ระบุเครื่องมือ กระบวนการ และชื่อผลงานให้ชัดเจน",
              fields: [
                textField("tool", "เครื่องมือ (Hardware / Software)", "เช่น Canva, บอร์ดเกมทำมือ, แอปตอบคำถาม"),
                textField("pedagogy", "กระบวนการ Active Learning", "เช่น Roleplay, Project-Based Learning, Gamification"),
                textField("innovation_name", "ชื่อนวัตกรรม", "ตั้งชื่อให้น่าจดจำและสะท้อนบริบท"),
                textareaField("innovation_fit", "เหตุผลที่สูตรนี้ตอบโจทย์ Pain Point", "อธิบายว่าทำไมสูตรนี้จึงเหมาะกับปัญหาและเป้าหมายของคุณครู"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m4-mission2",
          title: "Mission 2 : The Master Blueprint",
          step: 3,
          description:
            "เขียน One-Page Blueprint โดยแบ่งเป็น Hook, Action, Reflect และแนบลิงก์แผนการสอน",
          mentorTip:
            "ลองทำให้คนอ่านเห็นภาพคาบเรียนได้ในหน้าเดียวครับ ว่าเด็กจะตื่นเต้นตรงไหน ลงมืออย่างไร และจบด้วยการคิดอะไรต่อ",
          sections: [
            {
              title: "One-Page Blueprint",
              description: "ออกแบบคาบเรียนให้กระชับและชัดเจน",
              fields: [
                textareaField("hook", "Hook (5 นาที)", "จะเปิดคาบอย่างไรให้เด็กตื่นเต้นและอยากเรียน"),
                textareaField("action", "Action (35 นาที)", "เด็กจะใช้นวัตกรรมอย่างไร และครูจะ facilitate แบบไหน"),
                textareaField("reflect", "Reflect (10 นาที)", "จะเช็กความเข้าใจหรือเชื่อมโยงกับชีวิตจริงอย่างไร"),
                urlField("blueprint_link", "ลิงก์ไฟล์แผนการสอน", "วางลิงก์ PDF, Word, Google Drive หรือภาพถ่ายแผน"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m4-mission3",
          title: "Mission 3 : Crafting Session",
          step: 3,
          description:
            "สร้างสื่อการสอนหรือชิ้นงานจริงที่จะใช้คู่กับแผนใน Mission 2",
          mentorTip:
            "ลงมือตีเหล็กกันแล้วครับ ลองทำชิ้นงานที่หยิบไปใช้ได้จริง มากกว่าทำเพื่อส่งอย่างเดียว",
          sections: [
            {
              title: "ชิ้นงานจริง",
              description: "ระบุประเภทสื่อ ลิงก์/ภาพ และคำอธิบายการใช้งาน",
              fields: [
                selectField("artifact_type", "ประเภทสื่อ", [{ label: "สื่อดิจิทัล", value: "digital" }, { label: "สื่อทำมือ/สื่อกายภาพ", value: "physical" }]),
                urlField("artifact_link", "ลิงก์ไฟล์หรือภาพประกอบ", "เช่น Canva, Google Drive, YouTube หรือไฟล์ภาพ"),
                textareaField("artifact_description", "คำอธิบายสั้นๆ", "สื่อชิ้นนี้ใช้ทำอะไรในคาบเรียน และช่วยเด็กอย่างไร"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m4-mission4",
          title: "Mission 4 : The Beta Test",
          step: 3,
          description:
            "นำสื่อไปทดลองกับเพื่อนครูหรือนักเรียนกลุ่มเล็ก แล้วสะท้อนจุดเด่นและสิ่งที่อยากอัปเกรด",
          mentorTip:
            "เก็บ Feedback แบบเปิดใจนะครับ จุดที่คนอื่นมองเห็นอาจเป็นของขวัญที่ช่วยให้นวัตกรรมเราแข็งแรงขึ้น",
          sections: [
            {
              title: "Version 1.0 Reflection",
              description: "ตอบคำถามสะท้อนคิด 2 ข้อ",
              fields: [
                textareaField("strongest_point", "1. จุดเด่นที่สุดของนวัตกรรม/สื่อชิ้นนี้คืออะไร", "ระบุสิ่งที่ทำได้ดีแล้ว"),
                textareaField("version_2", "2. ถ้าจะอัปเกรดเป็นเวอร์ชัน 2.0 อยากปรับอะไรเพิ่ม", "ระบุสิ่งที่ควรแก้หรือเติม"),
              ],
            },
          ],
        }),
        quizLesson({
          id: "m4-posttest",
          title: "Post-test Module 4",
          step: 4,
          mode: "posttest",
          passScore: 3,
          description: "แบบทดสอบหลังเรียน Module 4 จำนวน 5 ข้อ ผ่านเมื่อได้อย่างน้อย 3 คะแนน",
          mentorTip:
            "เก็บรายละเอียดของนวัตกรรมที่เพิ่งสร้างไว้ให้ดีนะครับ เพราะสิ่งนี้จะเป็นสะพานไปสู่การสอนจริงในโมดูลถัดไป",
          questions: [
            mcq("m4-post-1", "สูตรผสมใน Innovation Lab ต้องมีองค์ประกอบอย่างน้อยอะไร", ["ครู 2 คน", "เครื่องมือ 1 ชิ้น + กระบวนการ Active Learning 1 แบบ", "นักเรียน 10 คน", "งบประมาณ 1 แสนบาท"], 1),
            mcq("m4-post-2", "Hook ใน One-Page Blueprint มีหน้าที่ใด", ["ดึงความสนใจในช่วงต้นคาบ", "เก็บคะแนนปลายภาค", "ปิดคาบเรียน", "แทนที่ Action ทั้งหมด"], 0),
            mcq("m4-post-3", "Mission 3 ของ Module 4 เน้นอะไร", ["การสร้างชิ้นงานหรือสื่อจริง", "การประชุม PLC", "การเขียน Reflection", "การทำ SWOT ใหม่"], 0),
            mcq("m4-post-4", "Beta Test ควรทดลองกับใครได้บ้าง", ["เฉพาะผู้บริหาร", "เพื่อนครูหรือนักเรียนกลุ่มเล็ก", "คนภายนอกเท่านั้น", "ไม่ต้องทดลอง"], 1),
            mcq("m4-post-5", "ข้อมูลจาก Beta Test ควรถูกนำไปใช้เพื่ออะไร", ["ซ่อนข้อบกพร่องไว้", "วางแผนอัปเกรดเป็นเวอร์ชันถัดไป", "ยกเลิกนวัตกรรมทันที", "ลบหลักฐานทั้งหมด"], 1),
          ],
        }),
        reportLesson({
          id: "m4-report",
          title: "Report Card Module 4",
          badgeName: "In-Innovation Badge",
          description:
            "สรุปนวัตกรรมและหลักฐานต้นแบบของ Module 4 พร้อมปลดล็อก Module 5 เมื่อยืนยันรับรายงาน",
          mentorTip:
            "นวัตกรรมของคุณครูเริ่มจับต้องได้แล้วครับ รับ In-Innovation Badge แล้วเตรียมพาไปใช้จริงในห้องเรียนกัน",
        }),
      ],
    },
    {
      id: "module-5",
      title: "Module 5 : Re-Reflection",
      shortTitle: "สะท้อนผล",
      badgeName: "RE-Reflection Badge",
      lessons: [
        quizLesson({
          id: "m5-pretest",
          title: "Pre-test Module 5",
          step: 1,
          mode: "pretest",
          description: "ประเมินความพร้อมก่อนนำแผนไปใช้จริงและสะท้อนผลใน Module 5",
          mentorTip:
            "นี่คือช่วงเก็บเกี่ยวบทเรียนจากการลงมือจริงครับ ลองตั้งใจมองทั้งสิ่งที่สำเร็จและสิ่งที่ยังอยากปรับ",
          questions: [
            mcq("m5-pre-1", "หัวใจของ Re-Reflection คืออะไร", ["ดูเฉพาะคะแนนสอบ", "สะท้อนผลหลังใช้จริงและวางแผนต่อยอด", "ทำเอกสารให้ครบอย่างเดียว", "สร้างนวัตกรรมใหม่ทั้งหมด"], 1),
            mcq("m5-pre-2", "Mission 1 ของ Module 5 ต้องส่งอะไร", ["โปสเตอร์โครงการ", "คลิปสอนจริง 50-60 นาที", "ข้อสอบอีกชุด", "ไฟล์เสียง 1 นาที"], 1),
            mcq("m5-pre-3", "บันทึกหลังการใช้แผนมีประโยชน์อย่างไร", ["ใช้แทนการสอนจริง", "ช่วยให้เห็นสิ่งที่เวิร์กและสิ่งที่ควรปรับจากสถานการณ์จริง", "ใช้เฉพาะงานธุรการ", "ไม่มีผลต่อการพัฒนา"], 1),
            mcq("m5-pre-4", "การต่อยอดแผนการจัดการเรียนรู้ควรมองอะไรด้วย", ["เฉพาะสิ่งที่ครูชอบ", "ผลลัพธ์ของผู้เรียนและความเป็นไปได้ในบริบทจริง", "เฉพาะอุปกรณ์ที่แพงที่สุด", "จำนวนเอกสารที่ผลิตได้"], 1),
            mcq("m5-pre-5", "Module 5 เชื่อมไปสู่ขั้นตอนใดหลังจบ", ["เริ่ม Module 1 ใหม่ทันที", "Post-test สุดท้าย แบบประเมินความพึงพอใจ และรับ Certificate", "ยุติการเรียนโดยไม่มีสรุปผล", "เฉพาะ PLC รอบใหม่"], 1),
          ],
        }),
        iframeLesson({
          id: "m5-lesson",
          title: "บทเรียน Re-Reflection",
          step: 2,
          url: canvaEmbed(
            "https://www.canva.com/design/DAHFgqmbbOo/SOLFw8FFKEblrDUr3_1UQg/view",
          ),
          description: "ศึกษาบทเรียนหลักของ Module 5 ผ่าน Canva",
          mentorTip:
            "ขอชวนให้ดูบทเรียนนี้ด้วยสายตาของนักวิจัยในชั้นเรียนครับ เราจะใช้ข้อมูลจริงมาช่วยพัฒนารอบต่อไป",
        }),
        questionnaireLesson({
          id: "m5-mission1",
          title: "Mission 1 : สอนจริงและส่งคลิป",
          step: 3,
          description:
            "นำแผนที่ออกแบบไว้ไปใช้จริงในห้องเรียน และส่งคลิปความยาว 50-60 นาที",
          mentorTip:
            "ไม่ต้องรอให้ทุกอย่างเพอร์เฟกต์ก่อนลงสนามนะครับ คลิปจริงจะบอกเรื่องสำคัญที่เอกสารบอกไม่ได้",
          sections: [
            {
              title: "หลักฐานการสอนจริง",
              description: "แนบลิงก์คลิปพร้อมเล่าบริบทการใช้",
              fields: [
                urlField("teaching_clip", "ลิงก์คลิปการสอน 50-60 นาที", "วางลิงก์ Google Drive / YouTube / แพลตฟอร์มที่ใช้เก็บคลิป"),
                textareaField("class_context", "บริบทห้องเรียนที่ใช้จริง", "อธิบายระดับชั้น จำนวนนักเรียน และประเด็นที่ตั้งใจสังเกต"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m5-mission2",
          title: "Mission 2 : บันทึกหลังการใช้แผนการจัดการเรียนรู้",
          step: 3,
          description:
            "สะท้อนสิ่งที่เกิดขึ้นจริงหลังใช้แผนการจัดการเรียนรู้หรือนวัตกรรมในห้องเรียน",
          mentorTip:
            "ลองเล่าให้เหมือนกำลังคุยกับตัวเองหลังจบคาบนะครับ อะไรเวิร์ก อะไรสะดุด และเด็กตอบสนองอย่างไร",
          sections: [
            {
              title: "After Action Reflection",
              description: "เก็บทั้งข้อสังเกต ผลลัพธ์ และหลักฐานประกอบ",
              fields: [
                textareaField("reflection_note", "บันทึกหลังสอน", "สรุปสิ่งที่เกิดขึ้นจริงระหว่างใช้แผน"),
                textareaField("learner_response", "การตอบสนองของผู้เรียน", "เด็กๆ มีปฏิกิริยา ความเข้าใจ หรือการมีส่วนร่วมอย่างไร"),
                urlField("evidence_link", "ลิงก์หลักฐานเพิ่มเติม (ถ้ามี)", "เช่น ภาพงานนักเรียน แบบประเมิน หรือภาพบรรยากาศ"),
              ],
            },
          ],
        }),
        questionnaireLesson({
          id: "m5-mission3",
          title: "Mission 3 : แนวทางการพัฒนา/ต่อยอด",
          step: 3,
          description:
            "ออกแบบแนวทางการต่อยอดแผนการจัดการเรียนรู้หรือนวัตกรรมจากสิ่งที่เรียนรู้ใน Mission 1-2",
          mentorTip:
            "นี่คือโอกาสเปลี่ยนประสบการณ์ครั้งแรกให้กลายเป็นระบบที่ดีขึ้นครับ ลองคิดทั้งสิ่งที่จะคงไว้และสิ่งที่จะอัปเกรด",
          sections: [
            {
              title: "Next Iteration",
              description: "ระบุทั้งแผนต่อยอดและการสนับสนุนที่ต้องการ",
              fields: [
                textareaField("next_iteration", "แผนการพัฒนา/ต่อยอด", "ครั้งหน้าจะคงอะไร ปรับอะไร หรือเพิ่มอะไร"),
                textareaField("support_needed", "การสนับสนุนที่ต้องการ", "มีทรัพยากร เครือข่าย หรือการช่วยเหลืออะไรที่อยากได้เพิ่ม"),
              ],
            },
          ],
        }),
        quizLesson({
          id: "m5-posttest",
          title: "Post-test Module 5",
          step: 4,
          mode: "posttest",
          passScore: 3,
          description: "แบบทดสอบหลังเรียน Module 5 จำนวน 5 ข้อ ผ่านเมื่อได้อย่างน้อย 3 คะแนน",
          mentorTip:
            "สิ่งที่สำคัญไม่ใช่แค่การจบโมดูล แต่คือการมองเห็นว่าการสอนจริงสอนอะไรกลับมาหาเราได้บ้างครับ",
          questions: [
            mcq("m5-post-1", "ภารกิจแรกของ Module 5 ตรวจสอบอะไรได้ดีที่สุด", ["ความพร้อมก่อนเรียน", "การใช้แผนและนวัตกรรมกับห้องเรียนจริง", "การจัดงบประมาณ", "การประชุมฝ่ายบริหาร"], 1),
            mcq("m5-post-2", "บันทึกหลังสอนช่วยครูอย่างไร", ["ทำให้ไม่ต้องเก็บข้อมูลใดๆ", "สะท้อนทั้งจุดสำเร็จ ปัญหา และสิ่งที่ต้องปรับ", "ใช้แทนคลิปสอน", "ไม่เกี่ยวกับการพัฒนา"], 1),
            mcq("m5-post-3", "แนวทางการพัฒนาต่อยอดควรมาจากอะไร", ["ผลจากการทดลองใช้จริงและหลักฐานที่เก็บได้", "การคาดเดาอย่างเดียว", "คำสั่งจากเพื่อนครูเพียงคนเดียว", "การลบข้อเสนอแนะทั้งหมด"], 0),
            mcq("m5-post-4", "Reflection ที่ดีควรเชื่อมโยงกับอะไร", ["ความรู้สึกเพียงด้านเดียว", "ผลลัพธ์ของผู้เรียน บริบทชั้นเรียน และแผนรอบถัดไป", "จำนวนสไลด์ที่ใช้", "เวลาว่างของครูเท่านั้น"], 1),
            mcq("m5-post-5", "เมื่อจบ Module 5 แล้ว สิ่งที่ควรปลดล็อกคืออะไร", ["Badge และขั้นตอนสุดท้ายของแพลตฟอร์ม", "Module 2", "ห้องเรียนใหม่อีกวิชา", "รายงานทางการเงิน"], 0),
          ],
        }),
        reportLesson({
          id: "m5-report",
          title: "Report Card Module 5",
          badgeName: "RE-Reflection Badge",
          description:
            "สรุปหลักฐานการใช้จริงและ Reflection ของ Module 5 พร้อมปลดล็อก Post-test สุดท้าย",
          mentorTip:
            "คุณครูเดินมาครบวงจรแล้วครับ รับ RE-Reflection Badge แล้วไปปิดท้ายเส้นทางนี้อย่างภาคภูมิกัน",
        }),
      ],
    },
    {
      id: "final-stage",
      title: "Post-test และ Certificate of InSPIRE360",
      shortTitle: "สรุปเส้นทางทั้งหมด",
      lessons: [
        quizLesson({
          id: "final-exam",
          title: "Post-test สุดท้าย",
          step: 4,
          mode: "finalExam",
          passScore: 4,
          maxAttempts: 3,
          description:
            "แบบทดสอบสรุปหลักสูตรผ่านเกณฑ์ 80% หากไม่ผ่านครบ 3 ครั้ง ต้องรอ 12 ชั่วโมงก่อนทำใหม่",
          mentorTip:
            "นี่คือบทสรุปสุดท้ายครับ ถ้ายังไม่ผ่านในรอบแรกไม่เป็นไร เราจะใช้การทบทวนอย่างมีสติแล้วกลับมาลองใหม่",
          questions: [
            mcq("final-1", "Module 1 ของ InSPIRE360 มุ่งเน้นสิ่งใดเป็นหลัก", ["การออกแบบงบประมาณ", "การค้นหาความต้องการและวิเคราะห์บริบท", "การซื้ออุปกรณ์เทคโนโลยี", "การสอบสัมภาษณ์งาน"], 1),
            mcq("final-2", "SMART Objective อยู่ในโมดูลใด", ["Module 1", "Module 2", "Module 3", "Module 5"], 1),
            mcq("final-3", "The Mastermind Match เป็นภารกิจในโมดูลใด", ["Module 2", "Module 3", "Module 4", "Module 5"], 1),
            mcq("final-4", "Beta Test มีบทบาทสำคัญอย่างไรต่อการพัฒนานวัตกรรม", ["ทำให้ไม่ต้องรับฟังความคิดเห็นเพิ่ม", "ช่วยทดสอบต้นแบบและเก็บ Feedback ก่อนใช้งานจริงเต็มรูปแบบ", "ใช้แทนการออกแบบแผนการสอน", "ใช้เฉพาะการวัดผลปลายภาค"], 1),
            mcq("final-5", "หลังไม่ผ่าน Post-test สุดท้ายครบ 3 ครั้ง ระบบควรทำอย่างไร", ["ปิดบัญชีผู้ใช้ทันที", "เริ่มทั้งหมดใหม่ทันที", "ให้รอ 12 ชั่วโมงก่อนทำใหม่", "ข้ามไปออก Certificate ได้เลย"], 2),
          ],
        }),
        questionnaireLesson({
          id: "final-survey",
          title: "แบบประเมินความพึงพอใจการใช้ Platform",
          step: 4,
          description:
            "สะท้อนประสบการณ์การใช้แพลตฟอร์ม InSPIRE360 เพื่อใช้ปรับปรุงระบบต่อไป",
          mentorTip:
            "เสียงของคุณครูสำคัญมากครับ ลองเล่าให้ตรงไปตรงมาว่าอะไรช่วยได้จริง และอะไรที่ยังอยากให้ดีขึ้น",
          sections: [
            {
              title: "Satisfaction Survey",
              description: "ตอบแบบประเมินให้ครบเพื่อปลดล็อก Certificate",
              fields: [
                ratingField("ux_rating", "ความพึงพอใจต่อประสบการณ์ใช้งานโดยรวม"),
                ratingField("content_rating", "ความพึงพอใจต่อเนื้อหาและภารกิจการเรียนรู้"),
                ratingField("support_rating", "ความพึงพอใจต่อระบบช่วยเหลือและการติดตามความก้าวหน้า"),
                textareaField("most_helpful", "สิ่งที่มีประโยชน์ที่สุดในแพลตฟอร์มนี้", "เล่าส่วนที่ช่วยงานคุณครูได้มากที่สุด"),
                textareaField("suggestion", "ข้อเสนอแนะเพิ่มเติม", "มีฟีเจอร์หรือจุดไหนที่อยากให้พัฒนาต่อ"),
              ],
            },
          ],
        }),
        certificateLesson({
          id: "final-certificate",
          title: "Certificate of InSPIRE360",
          description:
            "เมื่อผ่าน Post-test สุดท้ายและทำแบบประเมินครบ ระบบจะเปิดให้ดาวน์โหลด Certificate of InSPIRE360",
          mentorTip:
            "ขอแสดงความยินดีกับการเดินทางครั้งนี้ล่วงหน้านะครับ อีกไม่กี่ก้าวคุณครูก็จะได้ปิดภารกิจอย่างสมบูรณ์แล้ว",
        }),
      ],
    },
  ],
};
