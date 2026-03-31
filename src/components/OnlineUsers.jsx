import React, { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { Circle, Users } from "lucide-react";
import { db } from "../lib/firebase";
import { getRoleLabel, getUserStatusLabel } from "../data/profileOptions";

function getPresenceMeta(user) {
  if (user.isOnline) {
    return { label: "กำลังใช้งาน", tone: "text-emerald-300" };
  }

  return { label: "เพิ่งใช้งานล่าสุด", tone: "text-slate-400" };
}

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), limit(12));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const nextUsers = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data();
          const lastSeenDate = data.lastSeen?.toDate?.() || null;
          const diffMinutes = lastSeenDate
            ? (Date.now() - lastSeenDate.getTime()) / 1000 / 60
            : 999;

          return {
            id: docSnapshot.id,
            ...data,
            isOnline: diffMinutes < 3,
          };
        })
        .sort((a, b) => {
          const aTime = a.lastSeen?.toDate?.()?.getTime?.() || 0;
          const bTime = b.lastSeen?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

      setUsers(nextUsers);
    });

    return () => unsubscribe();
  }, []);

  const onlineCount = useMemo(
    () => users.filter((user) => user.isOnline).length,
    [users],
  );

  return (
    <section className="dark-panel overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
            สถานะการใช้งาน
          </p>
          <h3 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
            <Users size={20} className="text-amber-200" />
            ผู้ใช้งานล่าสุด
          </h3>
        </div>
        <div className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
          ออนไลน์ {onlineCount} คน
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {users.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            ข้อมูลผู้ใช้งานจะปรากฏเมื่อมีการซิงก์สถานะเข้าระบบแล้ว
          </div>
        ) : (
          users.map((user) => {
            const presence = getPresenceMeta(user);
            const avatarUrl =
              user.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name || "User",
              )}&background=0f172a&color=fff`;

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={user.name || "User"}
                    className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <Circle
                    size={10}
                    className={`absolute -bottom-0.5 -right-0.5 fill-current ${
                      user.isOnline ? "text-emerald-400" : "text-slate-500"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name || "ไม่ระบุชื่อ"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">
                      {getRoleLabel(user.role || "teacher")}
                    </span>
                    <span className="text-slate-500">
                      {getUserStatusLabel(user.status || "active")}
                    </span>
                    <span className={presence.tone}>{presence.label}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
