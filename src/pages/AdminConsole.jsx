import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { createInitialTeacherEnrollment } from "../data/teacherProgress";
import {
  getRoleLabel,
  getUserStatusLabel,
  roleOptions,
} from "../data/profileOptions";

const SOS_STATUS_OPTIONS = [
  { value: "new", label: "รับเรื่องแล้ว" },
  { value: "in_review", label: "กำลังตรวจสอบ" },
  { value: "escalated", label: "ส่งต่อ DU แล้ว" },
  { value: "resolved", label: "ดำเนินการเสร็จสิ้น" },
];

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

export default function AdminConsole() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [users, setUsers] = useState([]);
  const [sosItems, setSosItems] = useState([]);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [roleDrafts, setRoleDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [sosStatusDrafts, setSosStatusDrafts] = useState({});
  const [sosNoteDrafts, setSosNoteDrafts] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, sosSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "sosRequests")),
      ]);

      const userRows = usersSnap.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .sort((a, b) => {
          const aTime = a.lastSeen?.toDate?.()?.getTime?.() || 0;
          const bTime = b.lastSeen?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

      const sosRows = sosSnap.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

      setUsers(userRows);
      setSosItems(sosRows);
      setRoleDrafts(
        Object.fromEntries(userRows.map((item) => [item.id, item.role || "teacher"])),
      );
      setStatusDrafts(
        Object.fromEntries(userRows.map((item) => [item.id, item.status || "active"])),
      );
      setSosStatusDrafts(
        Object.fromEntries(sosRows.map((item) => [item.id, item.status || "new"])),
      );
      setSosNoteDrafts(
        Object.fromEntries(sosRows.map((item) => [item.id, item.adminNote || ""])),
      );
    } catch (error) {
      console.error("Error loading admin data:", error);
      setFeedback({
        type: "error",
        text: "ไม่สามารถโหลดข้อมูลผู้ใช้หรือคำร้อง SOS ได้ในขณะนี้",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.school]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [search, users]);

  const systemStats = useMemo(
    () => [
      {
        label: "ผู้ใช้ทั้งหมด",
        value: users.length,
      },
      {
        label: "ครู / บุคลากร",
        value: users.filter((user) => user.role === "teacher").length,
      },
      {
        label: "ผู้ดูแลระบบ",
        value: users.filter((user) => user.role === "admin").length,
      },
      {
        label: "SOS ที่ยังเปิดอยู่",
        value: sosItems.filter((item) =>
          ["new", "in_review", "escalated"].includes(item.status || "new"),
        ).length,
      },
    ],
    [users, sosItems],
  );

  const saveUserAccess = async (userId) => {
    setBusyId(userId);
    setFeedback({ type: "", text: "" });

    try {
      await updateDoc(doc(db, "users", userId), {
        role: roleDrafts[userId],
        status: statusDrafts[userId],
        updatedAt: new Date(),
        updatedBy: currentUser?.uid || "",
      });

      setFeedback({
        type: "success",
        text: "บันทึกสิทธิ์ผู้ใช้เรียบร้อยแล้ว",
      });
      await loadData();
    } catch (error) {
      console.error("Error updating user access:", error);
      setFeedback({
        type: "error",
        text: "ไม่สามารถบันทึกสิทธิ์ผู้ใช้ได้",
      });
    } finally {
      setBusyId("");
    }
  };

  const resetTeacherProgress = async (userId) => {
    setBusyId(`reset-${userId}`);
    setFeedback({ type: "", text: "" });

    try {
      const enrollRef = doc(db, "users", userId, "enrollments", "course-teacher");
      const existing = await getDoc(enrollRef);
      const nextEnrollment = createInitialTeacherEnrollment({
        enrolledAt: existing.data()?.enrolledAt?.toDate?.() || new Date(),
      });

      await setDoc(enrollRef, nextEnrollment, { merge: false });

      setFeedback({
        type: "success",
        text: "รีเซ็ตความก้าวหน้าของคอร์สครูเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Error resetting teacher progress:", error);
      setFeedback({
        type: "error",
        text: "ไม่สามารถรีเซ็ตความก้าวหน้าได้",
      });
    } finally {
      setBusyId("");
    }
  };

  const disableUser = async (userId) => {
    setBusyId(`disable-${userId}`);
    setFeedback({ type: "", text: "" });

    try {
      await updateDoc(doc(db, "users", userId), {
        status: "disabled",
        deletedAt: new Date(),
        deletedBy: currentUser?.uid || "",
      });

      setFeedback({
        type: "success",
        text: "ปิดใช้งานผู้ใช้เรียบร้อยแล้ว",
      });
      await loadData();
    } catch (error) {
      console.error("Error disabling user:", error);
      setFeedback({
        type: "error",
        text: "ไม่สามารถปิดใช้งานผู้ใช้ได้",
      });
    } finally {
      setBusyId("");
    }
  };

  const saveSosUpdate = async (itemId) => {
    setBusyId(`sos-${itemId}`);
    setFeedback({ type: "", text: "" });

    try {
      await updateDoc(doc(db, "sosRequests", itemId), {
        status: sosStatusDrafts[itemId],
        adminNote: sosNoteDrafts[itemId] || "",
        updatedAt: new Date(),
        handledBy: currentUser?.uid || "",
      });

      setFeedback({
        type: "success",
        text: "อัปเดตคำร้อง SOS เรียบร้อยแล้ว",
      });
      await loadData();
    } catch (error) {
      console.error("Error updating SOS request:", error);
      setFeedback({
        type: "error",
        text: "ไม่สามารถอัปเดตคำร้อง SOS ได้",
      });
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <section className="dark-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
              ศูนย์ควบคุมผู้ดูแล
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
              ควบคุมและติดตามทั้งระบบ
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              ใช้หน้านี้ในการกำหนดบทบาทผู้ใช้ ปิดใช้งานบัญชี รีเซ็ตความก้าวหน้าคอร์สครู
              และติดตามคิว SOS to DU แบบรวมศูนย์
            </p>
          </div>

          <button type="button" onClick={loadData} className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10">
            <RefreshCcw size={16} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {systemStats.map((item) => (
          <article key={item.label} className="surface-panel p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              {item.label}
            </p>
            <div className="mt-3 font-display text-4xl font-semibold tracking-[-0.06em] text-slate-950">
              {item.value}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5" />
          <p className="leading-7">
            หมายเหตุ: ปุ่ม “ปิดใช้งานผู้ใช้” ในเวอร์ชันนี้เป็นการ soft delete ทางฝั่ง Firestore
            เพื่อหยุดการใช้งานในระบบแอป หากต้องการลบผู้ใช้ออกจาก Firebase Auth แบบถาวร
            จำเป็นต้องใช้ Cloud Functions หรือ Admin SDK เพิ่มเติม
          </p>
        </div>
      </section>

      {feedback.text && (
        <section
          className={`rounded-[24px] px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {feedback.text}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                ผู้ใช้งาน
              </p>
              <h3 className="mt-2 flex items-center gap-2 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                <Users size={22} />
                จัดการผู้ใช้
              </h3>
            </div>

            <div className="relative w-full max-w-sm">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field-input pl-11"
                placeholder="ค้นหาจากชื่อ อีเมล หรือโรงเรียน"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                กำลังโหลดข้อมูลผู้ใช้
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                ไม่พบผู้ใช้ตามคำค้นหา
              </div>
            ) : (
              filteredUsers.map((user) => (
                <article key={user.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold text-slate-950">
                          {user.name || user.email || "ไม่ระบุชื่อ"}
                        </h4>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {getRoleLabel(user.role || "teacher")}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {getUserStatusLabel(user.status || "active")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {user.email || "ไม่มีอีเมล"}{user.school ? ` • ${user.school}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        ใช้งานล่าสุด {formatThaiDate(user.lastSeen || user.updatedAt || user.createdAt)}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:w-[28rem]">
                      <div>
                        <label className="field-label">บทบาทผู้ใช้</label>
                        <select
                          value={roleDrafts[user.id] || "teacher"}
                          onChange={(event) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="field-select"
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="field-label">สถานะบัญชี</label>
                        <select
                          value={statusDrafts[user.id] || "active"}
                          onChange={(event) =>
                            setStatusDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="field-select"
                        >
                          <option value="active">ใช้งานปกติ</option>
                          <option value="pending">รอตรวจสอบ</option>
                          <option value="disabled">ปิดใช้งาน</option>
                          <option value="archived">เก็บถาวร</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => saveUserAccess(user.id)}
                      disabled={busyId === user.id}
                      className="primary-button"
                    >
                      {busyId === user.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังบันทึก
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          บันทึกสิทธิ์
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => resetTeacherProgress(user.id)}
                      disabled={busyId === `reset-${user.id}`}
                      className="secondary-button"
                    >
                      {busyId === `reset-${user.id}` ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังรีเซ็ต
                        </>
                      ) : (
                        "รีเซ็ตคอร์สครู"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => disableUser(user.id)}
                      disabled={busyId === `disable-${user.id}`}
                      className="secondary-button border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      {busyId === `disable-${user.id}` ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังปิดใช้งาน
                        </>
                      ) : (
                        "ปิดใช้งานผู้ใช้"
                      )}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="surface-panel p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            SOS Monitor
          </p>
          <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            ตรวจสอบ SOS to DU
          </h3>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                กำลังโหลดคำร้อง SOS
              </div>
            ) : sosItems.length === 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                ยังไม่มีคำร้อง SOS ในระบบ
              </div>
            ) : (
              sosItems.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {item.requesterName || "ไม่ระบุชื่อ"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {item.school || "ไม่ระบุโรงเรียน"}
                    </span>
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-950">
                    {item.title}
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {item.details}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    ส่งเมื่อ {formatThaiDate(item.createdAt)}
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="field-label">สถานะคำร้อง</label>
                      <select
                        value={sosStatusDrafts[item.id] || "new"}
                        onChange={(event) =>
                          setSosStatusDrafts((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="field-select"
                      >
                        {SOS_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">หมายเหตุจากผู้ดูแล</label>
                      <textarea
                        value={sosNoteDrafts[item.id] || ""}
                        onChange={(event) =>
                          setSosNoteDrafts((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        rows={4}
                        className="field-input min-h-[120px]"
                        placeholder="บันทึกสิ่งที่ดำเนินการแล้ว หรือข้อความแจ้งกลับให้ผู้ส่งคำร้อง"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => saveSosUpdate(item.id)}
                      disabled={busyId === `sos-${item.id}`}
                      className="primary-button"
                    >
                      {busyId === `sos-${item.id}` ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังอัปเดต
                        </>
                      ) : (
                        "บันทึกสถานะ SOS"
                      )}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
