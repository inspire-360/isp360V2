import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ClipboardCheck,
  FileClock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useAuditHealthDashboard } from "../hooks/useAuditHealthDashboard";
import {
  formatAuditHealthDateTime,
  runMemberIntegrityCheck,
} from "../services/firebase/repositories/auditHealthRepository";

const severityStyles = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

const statusStyles = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  requires_review: "border-rose-200 bg-rose-50 text-rose-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  partial_failure: "border-rose-200 bg-rose-50 text-rose-700",
  started: "border-sky-200 bg-sky-50 text-sky-700",
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatLabel = (value = "") =>
  normalize(value)
    .split("_")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ") || "Unknown";

function StatusChip({ value }) {
  const key = normalize(value || "unknown");
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
        statusStyles[key] || "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {formatLabel(key)}
    </span>
  );
}

function Metric({ label, value, icon, tone = "default" }) {
  const Icon = icon;
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "good"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/70">
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function PanelMessage({ icon, title, body, tone = "default" }) {
  const IconComponent = icon;
  const toneClass = tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
          <IconComponent size={18} />
          </div>
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </section>
  );
}

export default function AuditSystemHealthV2() {
  const [tab, setTab] = useState("health");
  const [integrityResult, setIntegrityResult] = useState(null);
  const [integrityError, setIntegrityError] = useState("");
  const [checking, setChecking] = useState(false);
  const { auditLogs, healthDocs, auditError, healthError, loading } = useAuditHealthDashboard({
    enabled: true,
  });

  const memberIntegrity = useMemo(
    () => healthDocs.find((item) => item.id === "memberIntegrity") || null,
    [healthDocs],
  );
  const auditMetrics = useMemo(() => {
    const failed = auditLogs.filter((item) => ["failed", "partial_failure"].includes(normalize(item.status))).length;
    const completed = auditLogs.filter((item) => normalize(item.status) === "completed").length;
    return {
      total: auditLogs.length,
      completed,
      failed,
    };
  }, [auditLogs]);

  const runDryRun = async () => {
    setChecking(true);
    setIntegrityError("");
    setIntegrityResult(null);

    try {
      const result = await runMemberIntegrityCheck({
        write: false,
        limit: 1000,
      });
      setIntegrityResult(result);
    } catch (error) {
      console.error("Member integrity check failed", error);
      setIntegrityError(error.message || "Integrity check failed.");
    } finally {
      setChecking(false);
    }
  };

  const summary = integrityResult?.summary || memberIntegrity || {};
  const issues = integrityResult?.issues || [];
  const counts = summary.counts || {};

  return (
    <div className="min-h-[calc(100vh-48px)] rounded-lg border border-white/70 bg-white/80 p-4 shadow-[0_20px_70px_rgba(13,17,100,0.10)] backdrop-blur-xl md:p-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
              <Stethoscope size={15} />
              Audit & Health V2
            </span>
            <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              Read-only dashboard
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-ink md:text-3xl">Audit & System Health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Health checks run in dry-run mode unless a separate confirmed backend snapshot is requested.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runDryRun}
            disabled={checking}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Run dry check
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { id: "health", label: "System Health", icon: Stethoscope },
          { id: "audit", label: "Audit Log", icon: FileClock },
          { id: "repair", label: "Repair Plan", icon: ClipboardCheck },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                active ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:text-primary"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {integrityError ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {integrityError}
        </div>
      ) : null}

      {tab === "health" ? (
        <section className="mt-4 space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Auth users" value={counts.authUsersCount ?? "-"} icon={ShieldCheck} tone="good" />
            <Metric label="Firestore profiles" value={counts.firestoreUsersCount ?? "-"} icon={Activity} />
            <Metric
              label="Issues"
              value={counts.issueCount ?? "-"}
              icon={AlertCircle}
              tone={(counts.highRiskIssueCount || 0) > 0 ? "danger" : (counts.issueCount || 0) > 0 ? "warn" : "good"}
            />
            <Metric
              label="High risk"
              value={counts.highRiskIssueCount ?? "-"}
              icon={AlertCircle}
              tone={(counts.highRiskIssueCount || 0) > 0 ? "danger" : "good"}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Member integrity snapshot</p>
                <p className="text-sm text-slate-500">
                  Last checked {formatAuditHealthDateTime(summary.lastCheckedAt || summary.checkedAt)}
                </p>
              </div>
              <StatusChip value={summary.status || "unknown"} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Missing profiles" value={counts.missingProfilesCount ?? 0} icon={AlertCircle} tone={counts.missingProfilesCount ? "danger" : "good"} />
              <Metric label="Orphan profiles" value={counts.orphanProfilesCount ?? 0} icon={AlertCircle} tone={counts.orphanProfilesCount ? "danger" : "good"} />
              <Metric label="Role mismatch" value={counts.roleMismatchCount ?? 0} icon={AlertCircle} tone={counts.roleMismatchCount ? "danger" : "good"} />
              <Metric label="Stale presence" value={counts.stalePresenceCount ?? 0} icon={AlertCircle} tone={counts.stalePresenceCount ? "warn" : "good"} />
            </div>
          </section>

          {healthError ? (
            <PanelMessage icon={AlertCircle} title="Unable to load system health" body={healthError.message || "systemHealth read failed."} tone="danger" />
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">System health documents</p>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {healthDocs.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No system health snapshots loaded yet.</p>
              ) : (
                healthDocs.map((item) => (
                  <div key={item.id} className="grid gap-2 p-3 text-sm md:grid-cols-[220px_1fr_140px] md:items-center">
                    <p className="font-semibold text-slate-800">{item.id}</p>
                    <p className="text-slate-500">{formatAuditHealthDateTime(item.lastCheckedAt || item.checkedAt || item.updatedAt)}</p>
                    <StatusChip value={item.status || "unknown"} />
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className="mt-4 space-y-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric label="Loaded events" value={auditMetrics.total} icon={FileClock} />
            <Metric label="Completed" value={auditMetrics.completed} icon={ShieldCheck} tone="good" />
            <Metric label="Failed review" value={auditMetrics.failed} icon={AlertCircle} tone={auditMetrics.failed ? "danger" : "good"} />
          </section>

          {auditError ? (
            <PanelMessage icon={AlertCircle} title="Unable to load audit log" body={auditError.message || "auditLogs read failed."} tone="danger" />
          ) : null}

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[210px]" />
                  <col className="w-[140px]" />
                  <col className="w-[180px]" />
                  <col className="w-[180px]" />
                  <col className="w-[270px]" />
                </colgroup>
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-500">Event</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-500">Actor</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-500">Target</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-500">Reason / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                        Loading audit log
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                        No audit events loaded.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.type || "audit.event"}</p>
                          <p className="truncate text-xs text-slate-500">{item.id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusChip value={item.status || "completed"} />
                        </td>
                        <td className="px-3 py-3">
                          <p className="truncate text-sm text-slate-700">{item.actorUid || "-"}</p>
                          <p className="text-xs text-slate-500">{item.actorRole || "-"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="truncate text-sm text-slate-700">{item.targetUid || "-"}</p>
                          <p className="text-xs text-slate-500">{item.targetCollection || "-"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="line-clamp-2 text-sm text-slate-700">{item.reason || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatAuditHealthDateTime(item.createdAt)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {tab === "repair" ? (
        <section className="mt-4 space-y-4">
          <PanelMessage
            icon={ClipboardCheck}
            title="Repair actions are locked"
            body="Phase 9 exposes read-only findings first. Any repair must be a separate backend action with dry run, confirmation, audit log, and rollback plan."
          />

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Latest dry-run issues</p>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {issues.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Run a dry check to see repair candidates.</p>
              ) : (
                issues.map((issue, index) => (
                  <div key={`${issue.type}-${issue.uid}-${index}`} className="grid gap-2 p-3 text-sm md:grid-cols-[190px_1fr_120px] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{formatLabel(issue.type)}</p>
                      <p className="truncate text-xs text-slate-500">{issue.uid}</p>
                    </div>
                    <p className="text-slate-600">{issue.message}</p>
                    <span
                      className={`inline-flex justify-center rounded-md border px-2 py-1 text-xs font-semibold ${
                        severityStyles[issue.severity] || severityStyles.low
                      }`}
                    >
                      {formatLabel(issue.severity)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}
