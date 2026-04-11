import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { สร้างแพตช์ซ่อมโปรไฟล์ครู } from "./teacherUserProfile";

const จำนวนงานต่อชุด = 400;

export async function ซ่อมโปรไฟล์ครูเก่า(db) {
  const ผู้ใช้ทั้งหมด = await getDocs(collection(db, "users"));
  let จำนวนที่ตรวจสอบ = 0;
  let จำนวนที่ซ่อม = 0;
  let ชุดคำสั่ง = writeBatch(db);
  let จำนวนคำสั่งในชุด = 0;

  for (const เอกสารผู้ใช้ of ผู้ใช้ทั้งหมด.docs) {
    จำนวนที่ตรวจสอบ += 1;

    const แพตช์ = สร้างแพตช์ซ่อมโปรไฟล์ครู({
      id: เอกสารผู้ใช้.id,
      ...เอกสารผู้ใช้.data(),
    });

    if (!Object.keys(แพตช์).length) {
      continue;
    }

    ชุดคำสั่ง.set(doc(db, "users", เอกสารผู้ใช้.id), แพตช์, { merge: true });
    จำนวนที่ซ่อม += 1;
    จำนวนคำสั่งในชุด += 1;

    if (จำนวนคำสั่งในชุด >= จำนวนงานต่อชุด) {
      await ชุดคำสั่ง.commit();
      ชุดคำสั่ง = writeBatch(db);
      จำนวนคำสั่งในชุด = 0;
    }
  }

  if (จำนวนคำสั่งในชุด > 0) {
    await ชุดคำสั่ง.commit();
  }

  return {
    scannedCount: จำนวนที่ตรวจสอบ,
    repairedCount: จำนวนที่ซ่อม,
  };
}
