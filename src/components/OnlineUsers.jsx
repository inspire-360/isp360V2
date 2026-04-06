import React, { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Activity, Users } from "lucide-react";
import { db } from "../lib/firebase";
import { PRESENCE_TICK_MS, resolvePresenceMeta } from "../utils/presenceStatus";
import { getRoleLabel } from "../utils/userRoles";

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), orderBy("lastSeen", "desc"), limit(20));

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
        .map((user) => ({ ...user, presence: resolvePresenceMeta(user, now) }))
        .sort((left, right) => {
          if (left.presence.sortWeight !== right.presence.sortWeight) {
            return right.presence.sortWeight - left.presence.sortWeight;
          }

          const leftLastSeen = left.lastSeen?.toMillis?.() || 0;
          const rightLastSeen = right.lastSeen?.toMillis?.() || 0;
          return rightLastSeen - leftLastSeen;
        }),
    [now, users],
  );

  const onlineCount = useMemo(
    () => decoratedUsers.filter((user) => user.presence.status === "online").length,
    [decoratedUsers],
  );
  const awayCount = useMemo(
    () => decoratedUsers.filter((user) => user.presence.status === "away").length,
    [decoratedUsers],
  );

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Users size={18} className="text-primary" />
            Online Pulse
          </h3>
          <p className="mt-1 text-sm text-slate-500">Real-time member activity synced from Firebase presence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {onlineCount} online
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {awayCount} away
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {decoratedUsers.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm leading-7 text-slate-500">
            Presence data is waiting for the first live user sync.
          </div>
        ) : (
          decoratedUsers.map((user) => (
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
                className={`h-11 w-11 rounded-2xl object-cover ${
                  user.presence.status === "online"
                    ? "ring-2 ring-emerald-400"
                    : user.presence.status === "away"
                      ? "ring-2 ring-amber-300"
                      : "opacity-75 grayscale"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{user.name || "Unknown user"}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${user.presence.tone}`}
                  >
                    <Activity size={12} />
                    {user.presence.label}
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {getRoleLabel(user.role)}
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
