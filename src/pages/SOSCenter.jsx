import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import {
  LifeBuoy,
  Loader2,
  RefreshCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

const CATEGORY_OPTIONS = [
  { value: "student-support", label: "ดูแลช่วยเหลือนักเรียน" },
  { value: "learning-design", label: "ออกแบบการเรียนรู้ / หลักสูตร" },
  { value: "system-help", label: "ปัญหาการใช้งานระบบ" },
  { value: "urgent-case", label: "กรณีเร่งด่วน / ต้องประสานต่อ" },
  { value: "other", label: "อื่นๆ" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "ทั่วไป" },
  { value: "medium", label: "สำคัญ" },
  { value: "high", label: "เร่งด่วน" },
];

const STATUS_LABELS = {
  new: "รับเรื่องแล้ว",
  in_review: "กำลังตรวจสอบ",
  escalated: "ส่งต่อ DU แล้ว",
  resolved: "ดำเนินการเสร็จสิ้น",
};

function formatThaiDate(value) {
  if (!value) {
    return "-";
  }

  const date = value?.toDate ? value.toDate() : value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SOSCenter() {
  const { currentUser, profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    category: "student-support",
    urgency: "medium",
    details: "",
    expectedSupport: "",
    preferredContact: "",
    attachmentLink: "",
  });

  const loadRequests = async () => {
    if (!currentUser) {
      return;
    }

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "sosRequests"));
      const rows = snapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter((item) => item.requesterId === currentUser.uid)
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

      setRequests(rows);
    } catch (error) {
      console.error("Error loading SOS requests:", error);
      setMessage({
        type: "error",
        text: "ไม่สามารถดึงประวัติคำร้องได้ในขณะนี้",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  const activeCount = useMemo(
    () =>
      requests.filter((item) =>
        ["new", "in_review", "escalated"].includes(item.status || "new"),
      ).length,
    [requests],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    if (!formData.title.trim() || !formData.details.trim()) {
      setMessage({
        type: "error",
        text: "กรุณากรอกหัวข้อและรายละเอียดคำร้องให้ครบก่อนส่ง",
      });
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "sosRequests"), {
        requesterId: currentUser.uid,
        requesterName:
          profile?.name || currentUser.displayName || currentUser.email || "ไม่ระบุชื่อ",
        requesterEmail: profile?.email || currentUser.email || "",
        school: profile?.school || "",
        category: formData.category,
        urgency: formData.urgency,
        title: formData.title.trim(),
        details: formData.details.trim(),
        expectedSupport: formData.expectedSupport.trim(),
        preferredContact: formData.preferredContact.trim(),
        attachmentLink: formData.attachmentLink.trim(),
        status: "new",
        adminNote: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setFormData({
        title: "",
        category: "student-support",
        urgency: "medium",
        details: "",
        expectedSupport: "",
        preferredContact: "",
        attachmentLink: "",
      });

      setMessage({
        type: "success",
        text: "ส่งคำร้อง SOS to DU เรียบร้อยแล้ว ทีมงานจะเข้ามาตรวจสอบให้เร็วที่สุด",
      });
      await loadRequests();
    } catch (error) {
      console.error("Error creating SOS request:", error);
      setMessage({
        type: "error",
        text: "ไม่สามารถส่งคำร้องได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <section className="dark-panel p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
              SOS to DU
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
              ส่งคำร้อง ขอข้อมูล หรือขอรับการช่วยเหลือ
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              ใช้พื้นที่นี้สำหรับส่งกรณีที่ต้องการการประสานงาน การสนับสนุนเชิงวิชาการ
              หรือปัญหาการใช้งานระบบ โดยคำร้องทุกฉบับจะถูกเก็บประวัติและติดตามสถานะได้
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                คำร้องทั้งหมดของฉัน
              </p>
              <div className="mt-2 font-display text-3xl font-semibold text-white">
                {requests.length}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                กำลังติดตามอยู่
              </p>
              <div className="mt-2 font-display text-3xl font-semibold text-white">
                {activeCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleSubmit} className="surface-panel p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h3 className="font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                แบบฟอร์มคำร้อง
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                เล่าให้ครบพอที่ทีม DU จะเห็นภาพและช่วยเหลือได้เร็วขึ้น
              </p>
            </div>
          </div>

          {message.text && (
            <div
              className={`mt-6 rounded-[22px] px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label className="field-label">หัวข้อคำร้อง</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="field-input"
                placeholder="เช่น ขอคำปรึกษากรณีนักเรียนกลุ่มเสี่ยง / ระบบเข้าเรียนไม่ได้"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">ประเภทคำร้อง</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="field-select"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">ระดับความเร่งด่วน</label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="field-select"
                >
                  {URGENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">รายละเอียดคำร้อง</label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                rows={6}
                className="field-input min-h-[180px]"
                placeholder="อธิบายเหตุการณ์ บริบท กลุ่มเป้าหมาย และสิ่งที่เกิดขึ้นให้ชัดที่สุด"
              />
            </div>

            <div>
              <label className="field-label">สิ่งที่อยากให้ช่วย</label>
              <textarea
                name="expectedSupport"
                value={formData.expectedSupport}
                onChange={handleChange}
                rows={4}
                className="field-input min-h-[140px]"
                placeholder="เช่น อยากให้ช่วยให้คำปรึกษา ประสานผู้เชี่ยวชาญ หรือตรวจสอบระบบ"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">ช่องทางติดต่อกลับที่สะดวก</label>
                <input
                  name="preferredContact"
                  value={formData.preferredContact}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="เช่น เบอร์โทร, LINE ID, อีเมล"
                />
              </div>
              <div>
                <label className="field-label">ลิงก์เอกสารแนบ (ถ้ามี)</label>
                <input
                  name="attachmentLink"
                  value={formData.attachmentLink}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="เช่น Google Drive / ภาพประกอบ"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              สำหรับกรณีฉุกเฉินจริงในชีวิตประจำวัน ควรประสานสายงานที่เกี่ยวข้องพร้อมกันด้วย
            </div>
            <button type="submit" disabled={submitting} className="primary-button">
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังส่งคำร้อง
                </>
              ) : (
                <>
                  <Send size={16} />
                  ส่งคำร้อง
                </>
              )}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="surface-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  ประวัติคำร้อง
                </p>
                <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                  ติดตามสถานะของฉัน
                </h3>
              </div>
              <button
                type="button"
                onClick={loadRequests}
                className="secondary-button"
              >
                <RefreshCcw size={16} />
                รีเฟรช
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  กำลังโหลดคำร้องของคุณ
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  ยังไม่มีคำร้องในระบบ คุณสามารถเริ่มส่งคำร้องฉบับแรกได้จากแบบฟอร์มด้านซ้าย
                </div>
              ) : (
                requests.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {STATUS_LABELS[item.status || "new"]}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {
                          CATEGORY_OPTIONS.find(
                            (option) => option.value === item.category,
                          )?.label
                        }
                      </span>
                    </div>

                    <h4 className="mt-4 text-lg font-semibold text-slate-950">
                      {item.title}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {item.details}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>ส่งเมื่อ {formatThaiDate(item.createdAt)}</span>
                      <span>อัปเดตล่าสุด {formatThaiDate(item.updatedAt || item.createdAt)}</span>
                    </div>

                    {item.adminNote && (
                      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                        หมายเหตุจากทีมงาน: {item.adminNote}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="dark-panel p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-400/10 p-3 text-red-200">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  แนวทางใช้งาน
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  กรุณาใช้ข้อมูลที่จำเป็นต่อการช่วยเหลือเท่านั้น และหลีกเลี่ยงการส่งข้อมูลอ่อนไหวเกินจำเป็น
                  หากเป็นกรณีคุ้มครองเด็กหรือเหตุเร่งด่วน ควรประสานผู้บังคับบัญชาและหน่วยงานที่เกี่ยวข้องควบคู่กัน
                </p>
                {isAdmin && (
                  <p className="mt-3 text-sm text-amber-200">
                    คุณมีสิทธิ์ผู้ดูแลระบบ สามารถติดตามคำร้องทั้งหมดได้จากหน้า Admin
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
