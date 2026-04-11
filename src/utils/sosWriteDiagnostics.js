const sosErrorMessageByCode = {
  "permission-denied": "ระบบไม่อนุญาตให้บันทึกคำร้องนี้ กรุณาตรวจสอบสิทธิ์ผู้ใช้และกฎความปลอดภัยของ Firestore",
  unauthenticated: "กรุณาเข้าสู่ระบบใหม่ก่อนส่งคำร้องถึง DU",
  "failed-precondition": "ระบบฐานข้อมูลยังไม่พร้อมสำหรับคำสั่งนี้ กรุณาตรวจสอบดัชนีและกฎ Firestore",
  unavailable: "ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
  cancelled: "คำสั่งถูกยกเลิกก่อนบันทึกข้อมูลสำเร็จ กรุณาลองใหม่อีกครั้ง",
  deadline: "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองส่งคำร้องใหม่อีกครั้ง",
  "invalid-argument": "ข้อมูลที่ส่งไปยังฐานข้อมูลไม่ถูกต้อง กรุณาตรวจสอบค่าที่กรอกอีกครั้ง",
};

const summarizePayload = (payload = {}) => ({
  ticketId: payload.ticket?.id || payload.ticketId || "",
  topic: String(payload.topic || "").trim(),
  mainCategory: payload.mainCategory || "",
  subCategory: payload.subCategory || "",
  urgencyLevel: payload.urgencyLevel || "",
  isConfidential: Boolean(payload.isConfidential),
  detailLength: String(payload.details || "").trim().length,
  contactLength: String(payload.contactInfo || "").trim().length,
  messageLength: String(payload.body || "").trim().length,
  nextStatus: payload.nextStatus || "",
  assignedTo: String(payload.assignedTo || "").trim(),
});

export const getReadableSosFirestoreError = (error) =>
  sosErrorMessageByCode[error?.code] ||
  error?.userMessage ||
  "ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง";

export const logSosFirestoreError = ({
  phase,
  error,
  currentUser,
  userRole,
  payload,
}) => {
  console.error(`การทำงาน SOS ล้มเหลวในขั้นตอน: ${phase}`, {
    รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
    ข้อความระบบ: error?.message || "ไม่มีข้อความจากระบบ",
    ผู้ใช้งาน: currentUser?.uid || "ไม่พบรหัสผู้ใช้",
    บทบาทผู้ใช้: userRole || "ไม่พบบทบาท",
    ข้อมูลที่ส่ง: summarizePayload(payload),
  });
};
