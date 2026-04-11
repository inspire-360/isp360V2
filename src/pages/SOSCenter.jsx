import React from "react";
import { LifeBuoy, ShieldCheck } from "lucide-react";
import SupportTicketWorkspace from "../components/SupportTicketWorkspace";
import { useAuth } from "../contexts/AuthContext";
import { isAdminRole } from "../utils/userRoles";

export default function SOSCenter() {
  const { userRole } = useAuth();
  const isAdminView = isAdminRole(userRole);

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="max-w-3xl space-y-4">
          <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]">
            {isAdminView ? <ShieldCheck size={14} /> : <LifeBuoy size={14} />}
            {isAdminView ? "แดชบอร์ดรับเรื่อง SOS ของ DU" : "ศูนย์ช่วยเหลือ SOS ถึง DU"}
          </span>
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold md:text-5xl">
              {isAdminView
                ? "คัดกรองคำร้อง ติดตามสถานะ และตอบกลับครูได้แบบเรียลไทม์"
                : "ส่งคำร้องขอความช่วยเหลืออย่างเป็นระบบและติดตามผลได้ทันที"}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
              {isAdminView
                ? "หน้านี้รวมตารางรับเรื่อง SOS ระบบมอบหมายผู้รับผิดชอบ และห้องสื่อสารสำหรับติดตามเคสที่ต้องการความช่วยเหลือจากทีม DU"
                : "กรอกข้อมูลให้ครบ เลือกหมวดหมู่และระดับความเร่งด่วนให้ตรงสถานการณ์ ระบบจะเก็บคำร้องของคุณอย่างปลอดภัยและเปิดช่องทางพูดคุยกับทีม DU ต่อเนื่อง"}
            </p>
          </div>
        </div>
      </section>

      <SupportTicketWorkspace isAdminView={isAdminView} />
    </div>
  );
}
