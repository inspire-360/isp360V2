import {
  buildAuthFallbackUserProfile,
  buildTeacherUserProfileCreateData,
  buildTeacherUserProfileMergeData,
  buildUserDisplayName,
  DEFAULT_TEACHER_ACTIVE_PATH,
  DEFAULT_TEACHER_ROLE,
  LEGACY_PROFILE_PROGRESS,
  LEGACY_PROFILE_STATUS,
} from "../services/firebase/mappers/userMapper";

export const บทบาทผู้ใช้เริ่มต้น = DEFAULT_TEACHER_ROLE;
export const เส้นทางเริ่มต้นครู = DEFAULT_TEACHER_ACTIVE_PATH;
export const ความก้าวหน้าเริ่มต้น = LEGACY_PROFILE_PROGRESS;
export const เปอร์เซ็นต์ความก้าวหน้าเริ่มต้น = LEGACY_PROFILE_PROGRESS;
export const สถานะการเรียนเริ่มต้น = LEGACY_PROFILE_STATUS;

export const สร้างชื่อเต็มผู้ใช้ = buildUserDisplayName;
export const สร้างโปรไฟล์สำรองจากบัญชีผู้ใช้ = buildAuthFallbackUserProfile;
export const สร้างแพตช์ซ่อมโปรไฟล์ครู = buildTeacherUserProfileMergeData;

export const สร้างโปรไฟล์ครูเริ่มต้น = ({
  uid,
  prefix,
  firstName,
  lastName,
  position,
  school,
  email,
  photoURL,
  lineUserId,
  pdpaAccepted,
} = {}) =>
  buildTeacherUserProfileCreateData({
    user: {
      uid: uid || "",
      email: email || "",
      photoURL: photoURL || "",
    },
    prefix,
    firstName,
    lastName,
    position,
    school,
    email,
    photoURL,
    lineUserId,
    pdpaAccepted,
  });
