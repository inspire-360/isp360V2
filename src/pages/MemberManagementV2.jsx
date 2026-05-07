import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import MemberDetailDrawerV2 from "../components/admin/MemberDetailDrawerV2";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useMembersV2Realtime } from "../hooks/useMembersV2Realtime";
import {
  formatMemberV2DateTime,
  formatMemberV2RelativeTime,
} from "../services/firebase/repositories/memberV2Repository";

const savedViews = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "review", label: "Needs review" },
  { id: "stale", label: "Stale presence" },
  { id: "suspended", label: "Suspended" },
];

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  support: "Support",
  member: "Member",
  teacher: "Teacher",
  learner: "Learner",
  unknown: "Unknown",
};

const statusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
  soft_deleted: "border-slate-300 bg-slate-100 text-slate-700",
  incomplete: "border-amber-200 bg-amber-50 text-amber-700",
  unknown: "border-slate-200 bg-white text-slate-600",
};

const onlineStyles = {
  online: "border-emerald-200 bg-emerald-50 text-emerald-700",
  idle: "border-sky-200 bg-sky-50 text-sky-700",
  stale: "border-amber-200 bg-amber-50 text-amber-700",
  offline: "border-slate-200 bg-slate-50 text-slate-600",
  unknown: "border-slate-200 bg-white text-slate-500",
};

const pageSizeOptions = [20, 50, 100];

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatStatusLabel = (value = "") =>
  normalize(value)
    .split("_")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ") || "Unknown";

const resolveOnlineBucket = (member) => {
  if (member.presence?.isStale || member.flags?.stalePresence) return "stale";
  if (member.presence?.state === "idle") return "idle";
  if (member.presence?.isOnline || member.presence?.state === "online") return "online";
  if (member.presence?.state === "offline" || member.presence?.state === "away") return "offline";
  return "unknown";
};

const sortValue = (member, key) => {
  if (key === "user") return normalize(member.displayName || member.email || member.uid);
  if (key === "email") return normalize(member.email);
  if (key === "role") return normalize(member.role);
  if (key === "status") return normalize(member.status);
  if (key === "online") return resolveOnlineBucket(member);
  if (key === "lastActive") return member.lastActiveAtMs || member.lastLoginAtMs || 0;
  if (key === "created") return member.createdAtMs || 0;
  return "";
};

const formatErrorMessage = (error) => {
  if (!error) return "";
  if (error.code === "permission-denied") {
    return "Permission denied while reading members_v2. Check the feature flag and Firestore read rule before rollout.";
  }
  return error.message || "Unable to load members_v2.";
};

function Avatar({ member, size = "md" }) {
  const initials = (member.displayName || member.email || member.uid || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
  const sizeClass = size === "lg" ? "h-14 w-14 rounded-lg text-lg" : "h-10 w-10 rounded-md text-sm";

  if (member.photoURL) {
    return (
      <img
        src={member.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className={`${sizeClass} flex-shrink-0 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center bg-primary text-center font-semibold text-white`}
    >
      {initials || "?"}
    </div>
  );
}

function StatusChip({ value }) {
  const key = normalize(value || "unknown");
  return (
    <span
      className={`inline-flex min-w-0 items-center rounded-md border px-2 py-1 text-xs font-semibold ${
        statusStyles[key] || statusStyles.unknown
      }`}
    >
      {formatStatusLabel(key)}
    </span>
  );
}

function OnlineChip({ member }) {
  const bucket = resolveOnlineBucket(member);
  const Icon = bucket === "online" || bucket === "idle" ? Wifi : bucket === "stale" ? AlertCircle : WifiOff;
  const label =
    bucket === "online"
      ? "Online"
      : bucket === "idle"
        ? "Idle"
        : bucket === "stale"
          ? "Stale"
          : bucket === "offline"
            ? "Offline"
            : "Unknown";

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${
        onlineStyles[bucket]
      }`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}

function Metric({ label, value, icon, tone = "default" }) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-slate-200 bg-white text-slate-800";
  const iconElement = React.createElement(icon, { size: 17 });

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/70">
        {iconElement}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[150px] flex-col gap-1 text-xs font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortHeader({ label, field, sortConfig, onSort, align = "left" }) {
  const active = sortConfig.key === field;
  const direction = active ? sortConfig.direction : "";
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`flex w-full items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-primary ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {label}
      <span className="w-3 text-slate-400">{active ? (direction === "asc" ? "↑" : "↓") : ""}</span>
    </button>
  );
}

export default function MemberManagementV2() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [savedView, setSavedView] = useState("all");
  const [density, setDensity] = useState("compact");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "lastActive", direction: "desc" });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [copyState, setCopyState] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);

  const { members, loading, error, lastUpdatedAt } = useMembersV2Realtime({
    enabled: true,
    reloadKey,
  });

  const metrics = useMemo(() => {
    const onlineCount = members.filter((item) => resolveOnlineBucket(item) === "online").length;
    const staleCount = members.filter((item) => resolveOnlineBucket(item) === "stale").length;
    const reviewCount = members.filter((item) => item.flags?.requiresReview).length;

    return {
      total: members.length,
      online: onlineCount,
      stale: staleCount,
      review: reviewCount,
    };
  }, [members]);

  const roleOptions = useMemo(() => {
    const roles = [...new Set(members.map((item) => normalize(item.role)).filter(Boolean))].sort();
    return [{ value: "all", label: "All roles" }, ...roles.map((role) => ({ value: role, label: roleLabels[role] || role }))];
  }, [members]);

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(members.map((item) => normalize(item.status)).filter(Boolean))].sort();
    return [
      { value: "all", label: "All statuses" },
      ...statuses.map((status) => ({ value: status, label: formatStatusLabel(status) })),
    ];
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = normalize(debouncedSearchTerm);

    return members.filter((member) => {
      const onlineBucket = resolveOnlineBucket(member);
      if (savedView === "online" && onlineBucket !== "online") return false;
      if (savedView === "review" && !member.flags?.requiresReview) return false;
      if (savedView === "stale" && onlineBucket !== "stale") return false;
      if (savedView === "suspended" && member.status !== "suspended") return false;
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      if (onlineFilter !== "all" && onlineBucket !== onlineFilter) return false;
      if (!keyword) return true;

      return [
        member.displayName,
        member.email,
        member.uid,
        member.role,
        member.status,
        member.profile?.school,
        member.profile?.position,
        member.presence?.activePath,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [debouncedSearchTerm, members, onlineFilter, roleFilter, savedView, statusFilter]);

  const sortedMembers = useMemo(() => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return [...filteredMembers].sort((left, right) => {
      const leftValue = sortValue(left, sortConfig.key);
      const rightValue = sortValue(right, sortConfig.key);

      if (typeof leftValue === "number" || typeof rightValue === "number") {
        return ((leftValue || 0) - (rightValue || 0)) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue)) * direction;
    });
  }, [filteredMembers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleMembers = sortedMembers.slice(pageStart, pageStart + pageSize);
  const selectedMember = members.find((item) => item.uid === selectedMemberId || item.id === selectedMemberId) || null;
  const allVisibleSelected =
    visibleMembers.length > 0 && visibleMembers.every((member) => selectedIds.has(member.uid));
  const rowPadding = density === "compact" ? "py-2" : "py-3";

  const updateSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleSelected = (uid) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleMembers.forEach((member) => next.delete(member.uid));
      else visibleMembers.forEach((member) => next.add(member.uid));
      return next;
    });
  };

  const copySelectedUids = async () => {
    const value = [...selectedIds].join("\n");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState(""), 1400);
    } catch (copyError) {
      console.error("Unable to copy selected UIDs", copyError);
      setCopyState("failed");
      window.setTimeout(() => setCopyState(""), 1800);
    }
  };

  const updateSearchTerm = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const updateRoleFilter = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const updateStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const updateOnlineFilter = (value) => {
    setOnlineFilter(value);
    setPage(1);
  };

  const updateSavedView = (value) => {
    setSavedView(value);
    setPage(1);
  };

  const updatePageSize = (value) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-48px)] rounded-lg border border-white/70 bg-white/80 p-4 shadow-[0_20px_70px_rgba(13,17,100,0.10)] backdrop-blur-xl md:p-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
              <Users size={15} />
              Member Management
            </span>
            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              Unified
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-ink md:text-3xl">Member Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {lastUpdatedAt ? `Last realtime update ${formatMemberV2DateTime(lastUpdatedAt)}` : "Waiting for realtime snapshot"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDensity((value) => (value === "compact" ? "comfortable" : "compact"))}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <SlidersHorizontal size={16} />
            {density === "compact" ? "Compact" : "Comfortable"}
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Members" value={metrics.total} icon={Users} />
        <Metric label="Online" value={metrics.online} icon={Wifi} tone="good" />
        <Metric label="Stale presence" value={metrics.stale} icon={AlertCircle} tone={metrics.stale ? "warn" : "default"} />
        <Metric label="Needs review" value={metrics.review} icon={ShieldCheck} tone={metrics.review ? "warn" : "default"} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
            Search
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={searchTerm}
                onChange={(event) => updateSearchTerm(event.target.value)}
                placeholder="Name, email, UID, school"
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Role" value={roleFilter} onChange={updateRoleFilter} options={roleOptions} />
            <FilterSelect label="Status" value={statusFilter} onChange={updateStatusFilter} options={statusOptions} />
            <FilterSelect
              label="Online"
              value={onlineFilter}
              onChange={updateOnlineFilter}
              options={[
                { value: "all", label: "All states" },
                { value: "online", label: "Online" },
                { value: "idle", label: "Idle" },
                { value: "stale", label: "Stale" },
                { value: "offline", label: "Offline" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter size={15} />
            Saved views
          </span>
          {savedViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => updateSavedView(view.id)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                savedView === view.id ? "bg-primary text-white" : "bg-white text-slate-600 hover:text-primary"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </section>

      {selectedIds.size > 0 ? (
        <section className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-primary">{selectedIds.size} selected</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copySelectedUids}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-white px-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              <Copy size={15} />
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy UIDs"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 text-rose-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Unable to load members</p>
              <p className="mt-1 max-w-xl text-sm text-slate-500">{formatErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
            <RefreshCw size={28} className="animate-spin text-primary" />
            <p className="font-semibold text-slate-800">Loading realtime members</p>
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Users size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">No members found</p>
              <p className="mt-1 text-sm text-slate-500">Adjust the filters or search query.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full table-fixed text-left">
              <colgroup>
                <col className="w-[48px]" />
                <col className="w-[260px]" />
                <col className="w-[230px]" />
                <col className="w-[110px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
                <col className="w-[145px]" />
                <col className="w-[145px]" />
                <col className="w-[90px]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      aria-label="Select visible members"
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="User" field="user" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Email" field="email" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Role" field="role" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Status" field="status" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Online" field="online" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Last Active" field="lastActive" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3">
                    <SortHeader label="Created" field="created" sortConfig={sortConfig} onSort={updateSort} />
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMembers.map((member) => (
                  <tr
                    key={member.uid}
                    onClick={() => setSelectedMemberId(member.uid)}
                    className="cursor-pointer transition hover:bg-primary/5"
                  >
                    <td className={`px-3 ${rowPadding}`} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.uid)}
                        onChange={() => toggleSelected(member.uid)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        aria-label={`Select ${member.displayName}`}
                      />
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar member={member} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{member.displayName}</p>
                          <p className="truncate text-xs text-slate-500">{member.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                        <Mail size={15} className="flex-shrink-0 text-slate-400" />
                        <span className="truncate">{member.email || "-"}</span>
                      </div>
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <span className="text-sm font-semibold text-slate-700">
                        {roleLabels[member.role] || formatStatusLabel(member.role)}
                      </span>
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <StatusChip value={member.status} />
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <OnlineChip member={member} />
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <span className="text-sm text-slate-700">
                        {formatMemberV2RelativeTime(
                          member.usageSummary?.lastActiveAt
                            || member.presence?.lastActiveAt
                            || member.presence?.lastHeartbeatAt
                            || member.presence?.lastSeenAt,
                        )}
                      </span>
                    </td>
                    <td className={`px-3 ${rowPadding}`}>
                      <span className="text-sm text-slate-700">{formatMemberV2DateTime(member.createdAt)}</span>
                    </td>
                    <td className={`px-3 ${rowPadding} text-right`}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedMemberId(member.uid);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
                        aria-label={`Open ${member.displayName}`}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && !loading && sortedMembers.length > 0 ? (
          <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Showing {pageStart + 1}-{Math.min(pageStart + pageSize, sortedMembers.length)} of {sortedMembers.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => updatePageSize(Number(event.target.value))}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} rows
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-[84px] text-center text-sm font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      <MemberDetailDrawerV2
        key={selectedMember?.uid || "closed"}
        member={selectedMember}
        onClose={() => setSelectedMemberId("")}
      />
    </div>
  );
}
