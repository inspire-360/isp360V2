export const FINAL_POSTTEST_PASS_SCORE = 4;
export const FINAL_POSTTEST_MAX_ATTEMPTS = 3;
export const FINAL_POSTTEST_COOLDOWN_HOURS = 12;

export const finalPostTestQuestions = [
  {
    id: "final-posttest-1",
    question:
      "ข้อใดสะท้อนเป้าหมายของ InSPIRE360 ได้ครบที่สุดเมื่อครูพัฒนาบทเรียนของตนเอง",
    options: [
      "วิเคราะห์บริบท ออกแบบ ทดลองใช้ สะท้อนผล และต่อยอดอย่างเป็นระบบ",
      "ทำเอกสารให้ครบโดยไม่ต้องทดลองใช้จริง",
      "เน้นสอบผ่านอย่างเดียวโดยไม่ต้องมีแผนปฏิบัติ",
      "คัดลอกแผนของผู้อื่นมาใช้ทั้งชุด",
    ],
    correctAnswer: 0,
  },
  {
    id: "final-posttest-2",
    question:
      "Module 1 ช่วยครูมากที่สุดในด้านใด",
    options: [
      "มองเห็น pain point จุดแข็ง จุดอ่อน และบริบทภายใน-ภายนอกห้องเรียน",
      "ออกแบบ certificate ท้ายคอร์ส",
      "ทำสื่อดิจิทัลทันทีโดยไม่ต้องวิเคราะห์",
      "ข้ามขั้นตอนไปทำ PLC ก่อน",
    ],
    correctAnswer: 0,
  },
  {
    id: "final-posttest-3",
    question:
      "ถ้าต้องการให้แผน 30 วันมีคุณภาพจริง ครูควรเชื่อมข้อมูลจากส่วนใดเข้าหากัน",
    options: [
      "Pain point, เป้าหมาย, หลักฐาน, และ feedback จากการทดลองใช้",
      "เฉพาะคะแนนสอบปลายภาค",
      "เฉพาะงบประมาณของโรงเรียน",
      "เฉพาะความคิดเห็นของครูคนเดียว",
    ],
    correctAnswer: 0,
  },
  {
    id: "final-posttest-4",
    question:
      "บทบาทของ PLC ในเส้นทางนี้คืออะไร",
    options: [
      "สร้างการแลกเปลี่ยน feedback และมุมมองใหม่เพื่อทำให้แผนใช้งานได้จริงขึ้น",
      "เป็นขั้นตอนที่ข้ามได้เสมอ",
      "ใช้แทนการทดลองสอนจริงทั้งหมด",
      "ใช้เก็บคะแนนอย่างเดียว",
    ],
    correctAnswer: 0,
  },
  {
    id: "final-posttest-5",
    question:
      "เหตุใดช่วง Reflection และ Survey จึงสำคัญก่อนรับ Certificate",
    options: [
      "เพราะช่วยยืนยันผลลัพธ์ บันทึกบทเรียน และส่งเสียงสะท้อนกลับไปพัฒนาระบบรุ่นต่อไป",
      "เพราะเป็นขั้นตอนตกแต่งที่ไม่มีผลต่อการเรียนรู้",
      "เพราะใช้แทน post-test ได้ทั้งหมด",
      "เพราะมีไว้เพื่อดาวน์โหลดไฟล์เท่านั้น",
    ],
    correctAnswer: 0,
  },
];

export const generateCourseCertificateSerial = (
  uid = "USER",
  generatedAt = new Date().toISOString(),
) => {
  const safeUid =
    String(uid || "USER")
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(-6) || "USER99";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `INSPIRE360-${dateCode}-${safeUid}`;
};

export const buildCourseCertificate = (
  progressData = {},
  user = {},
  options = {},
) => {
  const generatedAt =
    options.generatedAt ||
    progressData?.missionResponses?.["final-survey"]?.submittedAt ||
    progressData?.missionResponses?.["final-survey"]?.updatedAt ||
    new Date().toISOString();

  const reportEntries = Object.values(progressData?.moduleReports || {}).filter(Boolean);
  const earnedBadges = Array.from(
    new Set(
      [
        ...(progressData?.earnedBadges || []),
        ...reportEntries.map((entry) => entry.badge).filter(Boolean),
      ].filter(Boolean),
    ),
  );

  return {
    title: "Certificate of InSPIRE360",
    courseTitle: "InSPIRE360 for Teacher",
    issuedAt: generatedAt,
    serialNumber:
      options.serialNumber ||
      generateCourseCertificateSerial(user.uid || user.email || "USER", generatedAt),
    traineeName:
      user.displayName || user.name || user.email?.split("@")[0] || "InSPIRE Learner",
    traineeEmail: user.email || "",
    statement:
      "for completing the InSPIRE360 teacher development journey, including insight discovery, design, PLC collaboration, innovation prototyping, classroom implementation, final assessment, and reflection.",
    badges: earnedBadges,
    moduleTitles: reportEntries.map((entry) => entry.title).filter(Boolean),
  };
};
