import React, { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Activity, Users } from "lucide-react";
import { db } from "../lib/firebase";

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

const resolveOnlineState = (user = {}) => {
  const lastSeen = user.lastSeen?.toDate?.() || null;
  if (!lastSeen) return false;
  return user.isOnline !== false && Date.now() - lastSeen.getTime() <= ACTIVE_WINDOW_MS;
};

const resolveRoleLabel = (role = "") => {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "admin" || normalized === "du admin") return "DU Admin";
  if (normalized === "teacher") return "Teacher";
  return "Learner";
};

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), orderBy("lastSeen", "desc"), limit(20));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      setUsers(
        snapshot.docs.map((userDocument) => {
          const data = userDocument.data();
          return {
            id: userDocument.id,
            ...data,
            isOnline: resolveOnlineState(data),
          };
        }),
      );
    });

    return () => unsubscribe();
  }, []);

  const onlineCount = useMemo(() => users.filter((user) => user.isOnline).length, [users]);

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Users size={18} className="text-primary" />
            Online Pulse
          </h3>
          <p className="mt-1 text-sm text-slate-500">สถานะออนไลน์ล่าสุดของผู้ใช้จาก presence แบบ real-time</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {onlineCount} online
        </span>
      </div>

      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm leading-7 text-slate-500">
            ยังไม่มีข้อมูล presence ของผู้ใช้ในตอนนี้
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-start gap-3 rounded-[22px] border border-slate-100 bg-slate-50/70 p-3"
            >
              <img
                src={
                  user.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=0D1164&color=ffffff`
                }
                alt={user.name || "User"}
                referrerPolicy="no-referrer"
                className={`h-11 w-11 rounded-2xl object-cover ${user.isOnline ? "ring-2 ring-emerald-400" : "opacity-75 grayscale"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{user.name || "Unknown user"}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      user.isOnline
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Activity size={12} />
                    {user.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {resolveRoleLabel(user.role)}
                </p>
                <p className="mt-2 truncate text-sm text-slate-500">{user.email || "No email"}</p>
                {user.activePath ? (
                  <p className="mt-1 truncate text-xs text-slate-400">Path: {user.activePath}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
