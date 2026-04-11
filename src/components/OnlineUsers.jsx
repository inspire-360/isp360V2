import React, { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Activity, Users } from "lucide-react";
import { db } from "../lib/firebase";
import {
  getPresenceTimestamp,
  PRESENCE_COLLECTION,
  PRESENCE_TICK_MS,
  resolvePresenceMeta,
} from "../utils/presenceStatus";
import { getRoleLabel } from "../utils/userRoles";

const formatLastActive = (value, now) => {
  const timestamp = getPresenceTimestamp(value);
  if (!timestamp) return "ยังไม่มีการซิงก์";

  const diff = now - timestamp.getTime();
  if (diff < 60_000) return "อัปเดตเมื่อสักครู่";
  if (diff < 3_600_000) return `อัปเดตเมื่อ ${Math.max(1, Math.round(diff / 60_000))} นาทีที่แล้ว`;
  if (diff < 86_400_000) return `อัปเดตเมื่อ ${Math.max(1, Math.round(diff / 3_600_000))} ชั่วโมงที่แล้ว`;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const usersQuery = query(
      collection(db, PRESENCE_COLLECTION),
      orderBy("lastActive", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((userDocument) => ({ id: userDocument.id, ...userDocument.data() })));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const decoratedUsers = useMemo(
    () =>
      users
        .map((user) => ({
          ...user,
          presence: resolvePresenceMeta(user, now),
        }))
        .sort((left, right) => {
          if (left.presence.sortWeight !== right.presence.sortWeight) {
            return right.presence.sortWeight - left.presence.sortWeight;
          }

          const leftLastSeen = getPresenceTimestamp(left)?.getTime?.() || 0;
          const rightLastSeen = getPresenceTimestamp(right)?.getTime?.() || 0;
          return rightLastSeen - leftLastSeen;
        }),
    [now, users],
  );

  const onlineCount = useMemo(
    () => decoratedUsers.filter((user) => user.presence.status === "online").length,
    [decoratedUsers],
  );

  const offlineCount = Math.max(decoratedUsers.length - onlineCount, 0);

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5" aria-labelledby="presence-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3
            id="presence-heading"
            className="flex items-center gap-2 font-display text-xl font-bold text-ink"
          >
            <Users size={18} className="text-primary" />
            สถานะผู้ใช้งานแบบเรียลไทม์
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            ซิงก์จาก Firestore ด้วยหัวใจเต้นเป็นช่วงและตัดสถานะอัตโนมัติเมื่อไม่มีการอัปเดต
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            ออนไลน์ {onlineCount}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            ออฟไลน์ {offlineCount}
          </span>
        </div>
      </div>

      <div className="space-y-3" role="list" aria-label="รายการสถานะผู้ใช้งาน">
        {decoratedUsers.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm leading-7 text-slate-500">
            ยังไม่มีข้อมูลสถานะออนไลน์จากผู้ใช้ที่กำลังใช้งาน
          </div>
        ) : (
          decoratedUsers.map((user) => (
            <article
              key={user.id}
              role="listitem"
              className="flex items-start gap-3 rounded-[22px] border border-slate-100 bg-slate-50/70 p-3"
            >
              <div className="relative shrink-0">
                <img
                  src={
                    user.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "ผู้ใช้")}&background=0D1164&color=ffffff`
                  }
                  alt={user.name || "ผู้ใช้งาน"}
                  referrerPolicy="no-referrer"
                  className={`h-11 w-11 rounded-2xl object-cover ${
                    user.presence.status === "online"
                      ? "ring-2 ring-emerald-400"
                      : "opacity-80 grayscale"
                  }`}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${user.presence.dotTone}`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {user.name || "ผู้ใช้งานไม่ทราบชื่อ"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${user.presence.tone}`}
                  >
                    <Activity size={12} />
                    {user.presence.label}
                  </span>
                </div>
                <p className="mt-1 text-xs tracking-[0.08em] text-slate-400">{getRoleLabel(user.role)}</p>
                <p className="mt-2 truncate text-sm text-slate-500">
                  {user.activePath ? `หน้าใช้งานล่าสุด: ${user.activePath}` : "ยังไม่มีเส้นทางล่าสุด"}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatLastActive(user, now)}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
