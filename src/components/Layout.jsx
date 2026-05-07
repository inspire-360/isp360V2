import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLine } from "../contexts/LineContext";
import { usePresence } from "../hooks/usePresence";
import { isIgnorablePresenceSyncError, syncPresenceRecord } from "../utils/presenceSync";
import {
  isMembersV2EnabledForUser,
  isMembersV2HealthDashboardEnabledForUser,
} from "../utils/memberManagementFlags";
import { isAdminRole, isTeacherRole } from "../utils/userRoles";

export default function Layout() {
  const { currentUser, userRole, userProfile } = useAuth();
  const { logoutLine } = useLine();
  const navigate = useNavigate();

  usePresence();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userData, setUserData] = useState({
    name: "User",
    role: "Learner",
    photoURL: "",
  });
  const membersV2Enabled = isMembersV2EnabledForUser({ currentUser, userRole });
  const healthDashboardEnabled = isMembersV2HealthDashboardEnabledForUser({ currentUser, userRole });

  useEffect(() => {
    if (!currentUser) return undefined;

    setUserData({
      name: userProfile?.name || currentUser.displayName || currentUser.email?.split("@")[0],
      role: userProfile?.role || "Learner",
      photoURL: userProfile?.photoURL || currentUser.photoURL || "",
    });

    return undefined;
  }, [currentUser, userProfile]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      sessionStorage.setItem("manualLogout", "true");
      await syncPresenceRecord({
        user: currentUser,
        role: userRole,
        activePath: window.location.pathname,
        presenceState: "offline",
      });
      logoutLine();
      await auth.signOut();
      navigate("/", { replace: true });
    } catch (error) {
      if (isIgnorablePresenceSyncError(error)) {
        logoutLine();
        await auth.signOut();
        navigate("/", { replace: true });
        return;
      }
      console.error("Failed to log out", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen size={18} />, label: "My Courses", path: "/courses" },
    { icon: <Handshake size={18} />, label: "จับคู่ผู้เชี่ยวชาญ", path: "/du/matchmaker" },
    { icon: <LifeBuoy size={18} />, label: "SOS to DU", path: "/du/sos" },
    { icon: <User size={18} />, label: "Profile", path: "/profile" },
  ];

  if (!isAdminRole(userRole) && !isTeacherRole(userRole)) {
    menuItems.splice(2, 1);
  }

  if (isAdminRole(userRole)) {
    menuItems.splice(4, 0, {
      icon: <Activity size={18} />,
      label: "DU Console",
      path: "/du/admin",
    });
    menuItems.splice(5, 0, {
      icon: <Lightbulb size={18} />,
      label: "กระดานนวัตกรรม",
      path: "/du/innovations",
    });
    menuItems.splice(6, 0, {
      icon: <Users size={18} />,
      label: membersV2Enabled ? "Member Management" : "Member Control",
      path: "/du/members",
    });
    if (healthDashboardEnabled) {
      menuItems.splice(7, 0, {
        icon: <Stethoscope size={18} />,
        label: "Audit & Health",
        path: "/du/audit-health-v2",
      });
    }
  }

  return (
    <div className="brand-shell flex min-h-screen bg-transparent">
      {showWarning ? (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-3xl border border-warm/15 bg-white/90 px-4 py-3 text-sm shadow-[0_18px_45px_rgba(247,141,96,0.2)] backdrop-blur-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warm/15 text-[#a24619]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="font-semibold text-ink">Focus mode is back on</p>
            <p className="text-slate-500">ระบบบันทึกการกลับมาใช้งานของคุณแล้ว</p>
          </div>
        </div>
      ) : null}

      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/[0.35] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[310px] px-4 py-4 transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="brand-panel-strong flex h-full flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between rounded-[28px] border border-white/[0.12] bg-white/[0.06] px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">Mission Control</p>
              <h1 className="mt-1 font-display text-2xl font-bold">
                InSPIRE <span className="text-warm">360°</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-2xl border border-white/10 bg-white/[0.10] p-2 text-white/[0.70] md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 rounded-[28px] border border-white/[0.12] bg-white/[0.08] p-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  userData.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0D1164&color=ffffff`
                }
                alt="Profile"
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{userData.name}</p>
                <p className="mt-1 inline-flex rounded-full border border-white/[0.12] bg-white/[0.10] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/[0.70]">
                  {userData.role}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-[24px] px-4 py-3.5 transition-all ${
                    isActive
                      ? "bg-white text-ink shadow-[0_18px_45px_rgba(13,17,100,0.18)]"
                      : "text-white/[0.70] hover:bg-white/[0.10] hover:text-white"
                  }`
                }
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] transition group-hover:bg-white/15">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                <ChevronRight size={16} className="ml-auto opacity-40" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-[28px] border border-white/[0.12] bg-white/[0.08] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.45]">Live use</p>
            <p className="mt-2 text-sm leading-7 text-white/[0.72]">
              ใช้เมนู SOS เพื่อส่งเคสถึง DU และใช้ DU Console เพื่อติดตามคิวงานแบบรวมศูนย์
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.10] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.16] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:ml-[310px]">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 px-4 py-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mission Control</p>
              <p className="font-display text-lg font-bold text-ink">InSPIRE 360°</p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

