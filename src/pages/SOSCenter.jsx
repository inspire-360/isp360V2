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
            {isAdminView ? "ศูนย์ทิกเก็ต DU" : "SOS ถึง DU"}
          </span>
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold md:text-5xl">
              {isAdminView
                ? "ดูแลทิกเก็ตและตอบกลับผู้ใช้งานแบบเรียลไทม์"
                : "ส่งเรื่องขอความช่วยเหลือและติดตามผลได้ทันที"}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
              {isAdminView
                ? "ผู้ดูแลจะเห็นทิกเก็ตทั้งหมด สามารถเปลี่ยนสถานะ ตอบกลับ และติดตามห้องสนทนาแต่ละเรื่องได้ในหน้าจอเดียว"
                : "ผู้ใช้งานสามารถเปิดทิกเก็ตใหม่ ดูสถานะของตนเอง และคุยต่อกับทีม DU ผ่านห้องสนทนาเดียวกันได้ตลอดเวลา"}
            </p>
          </div>
        </div>
      </section>

      <SupportTicketWorkspace isAdminView={isAdminView} />
    </div>
  );
}
