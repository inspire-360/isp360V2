import { serverTimestamp } from "firebase/firestore";
import { normalizeUserRole } from "./userRoles";

export const บทบาทผู้ใช้เริ่มต้น = "Teacher";
export const เส้นทางเริ่มต้นครู = "/course/teacher";
export const ความก้าวหน้าเริ่มต้น = 0;
export const เปอร์เซ็นต์ความก้าวหน้าเริ่มต้น = 0;
export const สถานะการเรียนเริ่มต้น = "active";

export const สร้างชื่อเต็มผู้ใช้ = ({
  prefix = "",
  firstName = "",
  lastName = "",
}) => {
  const คำนำหน้า = String(prefix || "").trim();
  const ชื่อ = String(firstName || "").trim();
  const นามสกุล = String(lastName || "").trim();
  const ชื่อเต็มไม่มีนามสกุล = `${คำนำหน้า}${ชื่อ}`.trim();

  return [ชื่อเต็มไม่มีนามสกุล, นามสกุล].filter(Boolean).join(" ").trim();
};

export const สร้างโปรไฟล์ครูเริ่มต้น = ({
  uid,
  prefix = "คุณ",
  firstName = "",
  lastName = "",
  position = "ครู",
  school = "",
  email = "",
  photoURL = "",
  lineUserId = "",
  pdpaAccepted = true,
}) => ({
  uid,
  prefix: String(prefix || "").trim() || "คุณ",
  firstName: String(firstName || "").trim(),
  lastName: String(lastName || "").trim(),
  name:
    สร้างชื่อเต็มผู้ใช้({
      prefix,
      firstName,
      lastName,
    }) || String(email || "").trim(),
  position: String(position || "").trim() || "ครู",
  school: String(school || "").trim(),
  email: String(email || "").trim(),
  role: บทบาทผู้ใช้เริ่มต้น,
  activePath: เส้นทางเริ่มต้นครู,
  progress: ความก้าวหน้าเริ่มต้น,
  progressPercent: เปอร์เซ็นต์ความก้าวหน้าเริ่มต้น,
  status: สถานะการเรียนเริ่มต้น,
  photoURL: String(photoURL || "").trim(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  lastLogin: serverTimestamp(),
  pdpaAccepted: Boolean(pdpaAccepted),
  pdpaAcceptedAt: serverTimestamp(),
  badges: [],
  lineUserId: String(lineUserId || "").trim(),
});

export const สร้างโปรไฟล์สำรองจากบัญชีผู้ใช้ = (user) => ({
  uid: user?.uid || "",
  email: String(user?.email || "").trim(),
  name: String(user?.displayName || user?.email || "").trim(),
  role: บทบาทผู้ใช้เริ่มต้น,
  activePath: เส้นทางเริ่มต้นครู,
  progress: ความก้าวหน้าเริ่มต้น,
  progressPercent: เปอร์เซ็นต์ความก้าวหน้าเริ่มต้น,
  status: สถานะการเรียนเริ่มต้น,
  photoURL: String(user?.photoURL || "").trim(),
  badges: [],
  lineUserId: "",
});

export const สร้างแพตช์ซ่อมโปรไฟล์ครู = (ข้อมูลผู้ใช้ = {}) => {
  const แพตช์ = {};
  const บทบาทปัจจุบัน = normalizeUserRole(ข้อมูลผู้ใช้.role);

  if (!ข้อมูลผู้ใช้.role || บทบาทปัจจุบัน === "learner") {
    แพตช์.role = บทบาทผู้ใช้เริ่มต้น;
  }

  if (!String(ข้อมูลผู้ใช้.activePath || "").trim()) {
    แพตช์.activePath = เส้นทางเริ่มต้นครู;
  }

  if (typeof ข้อมูลผู้ใช้.progress !== "number") {
    แพตช์.progress = ความก้าวหน้าเริ่มต้น;
  }

  if (typeof ข้อมูลผู้ใช้.progressPercent !== "number") {
    แพตช์.progressPercent = เปอร์เซ็นต์ความก้าวหน้าเริ่มต้น;
  }

  if (!String(ข้อมูลผู้ใช้.status || "").trim()) {
    แพตช์.status = สถานะการเรียนเริ่มต้น;
  }

  if (!Array.isArray(ข้อมูลผู้ใช้.badges)) {
    แพตช์.badges = [];
  }

  if (typeof ข้อมูลผู้ใช้.lineUserId !== "string") {
    แพตช์.lineUserId = "";
  }

  if (typeof ข้อมูลผู้ใช้.photoURL !== "string") {
    แพตช์.photoURL = "";
  }

  if (typeof ข้อมูลผู้ใช้.pdpaAccepted !== "boolean") {
    แพตช์.pdpaAccepted = true;
  }

  if (!ข้อมูลผู้ใช้.pdpaAcceptedAt) {
    แพตช์.pdpaAcceptedAt = serverTimestamp();
  }

  if (!String(ข้อมูลผู้ใช้.position || "").trim()) {
    แพตช์.position = "ครู";
  }

  if (!String(ข้อมูลผู้ใช้.name || "").trim()) {
    แพตช์.name =
      สร้างชื่อเต็มผู้ใช้(ข้อมูลผู้ใช้) ||
      String(ข้อมูลผู้ใช้.email || "").trim() ||
      "ครูผู้ใช้งาน";
  }

  if (!Object.keys(แพตช์).length) {
    return {};
  }

  return {
    ...แพตช์,
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };
};
