import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Ban,
  BookOpen,
  Clock,
  Edit3,
  FileSearch,
  KeyRound,
  Loader2,
  PanelRightClose,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMemberLearningDetails } from "../../hooks/useMemberLearningDetails";
import { useMemberAuditLogs, useMemberUsageDetails } from "../../hooks/useMemberV2DetailPanels";
import {
  formatMemberV2DateTime,
  hardDeleteMemberV2,
  reconcileMemberLifecycleMismatch,
  resetMemberLearningProgressV2,
  restoreMemberV2,
  setUserRoleV2,
  softDeleteMemberV2,
  suspendMemberV2,
  updateMemberProfileV2,
} from "../../services/firebase/repositories/memberV2Repository";
import {
  isMembersV2DeleteActionsEnabledForUser,
  isMembersV2LearningResetEnabledForUser,
  isMembersV2LifecycleActionsEnabledForUser,
  isMembersV2RoleEditorEnabledForUser,
} from "../../utils/memberManagementFlags";
import { isAdminRole, isSuperAdminRole } from "../../utils/userRoles";

const profileFields = [
  { key: "prefix", label: "Prefix", maxLength: 32 },
  { key: "firstName", label: "First name", maxLength: 80 },
  { key: "lastName", label: "Last name", maxLength: 80 },
  { key: "school", label: "School", maxLength: 160 },
  { key: "position", label: "Position", maxLength: 120 },
  { key: "photoURL", label: "Photo URL", maxLength: 500 },
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
const HARD_DELETE_CONFIRM = "PHASE6_HARD_DELETE";
const HARD_DELETE_SECOND_CONFIRM = "DELETE_PERMANENTLY";
const ROLE_CONFIRM = "PHASE8_SET_ROLE";
const LEARNING_RESET_CONFIRM = "MEMBER_LEARNING_RESET";
const roleEditorOptions = [
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
  { value: "member", label: "Member" },
];

const statusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
  deleted: "border-slate-300 bg-slate-100 text-slate-700",
  soft_deleted: "border-slate-300 bg-slate-100 text-slate-700",
  hard_deleted: "border-zinc-300 bg-zinc-100 text-zinc-700",
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

const normalize = (value) => String(value ?? "").trim();

const hasControlCharacters = (value) =>
  [...String(value || "")].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

const formatStatusLabel = (value = "") =>
  normalize(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ") || "Unknown";

const formatNumber = (value, fallback = "0") => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? new Intl.NumberFormat("th-TH").format(numberValue) : fallback;
};

const formatBoolean = (value) => (value ? "Yes" : "No");

const formatAuditValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value?.toDate === "function") return formatMemberV2DateTime(value);
  return JSON.stringify(value, null, 2);
};

const listObjectEntries = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];

const resolveOnlineBucket = (member) => {
  if (member.presence?.isStale || member.flags?.stalePresence) return "stale";
  if (member.presence?.state === "idle") return "idle";
  if (member.presence?.isOnline || member.presence?.state === "online") return "online";
  if (member.presence?.state === "offline" || member.presence?.state === "away") return "offline";
  return "unknown";
};

const buildProfileDraft = (member) => ({
  prefix: normalize(member?.profile?.prefix),
  firstName: normalize(member?.profile?.firstName),
  lastName: normalize(member?.profile?.lastName),
  school: normalize(member?.profile?.school),
  position: normalize(member?.profile?.position),
  photoURL: normalize(member?.photoURL),
});

const getChangedFields = (baseDraft, draft) =>
  profileFields
    .filter((field) => normalize(baseDraft[field.key]) !== normalize(draft[field.key]))
    .map((field) => ({
      ...field,
      before: normalize(baseDraft[field.key]),
      after: normalize(draft[field.key]),
    }));

const validateProfileDraft = ({ draft, reason, changedFields }) => {
  const errors = {};

  for (const field of profileFields) {
    const value = normalize(draft[field.key]);
    if (value.length > field.maxLength) {
      errors[field.key] = `${field.label} must be ${field.maxLength} characters or less.`;
    }
    if (hasControlCharacters(value)) {
      errors[field.key] = `${field.label} contains unsupported characters.`;
    }
  }

  if (draft.photoURL && !/^https?:\/\/[^\s]+$/i.test(draft.photoURL)) {
    errors.photoURL = "Photo URL must start with http:// or https://.";
  }
  if (changedFields.length > 0 && normalize(reason).length < 8) {
    errors.reason = "Reason is required before saving.";
  }
  if (normalize(reason).length > 500) {
    errors.reason = "Reason must be 500 characters or less.";
  }

  return errors;
};

const formatCallableError = (error) => {
  if (!error) return "";
  if (error.code === "functions/failed-precondition") {
    return "This member changed while the drawer was open. The form was reverted.";
  }
  if (error.code === "functions/permission-denied") {
    return "Your account is not allowed to update this member.";
  }
  if (error.code === "functions/not-found") {
    return "The member profile is missing or not ready for editing.";
  }
  return error.message || "Profile save failed.";
};

const formatLifecycleError = (error) => {
  if (!error) return "";
  if (error.code === "functions/failed-precondition") {
    return error.message || "Lifecycle state changed. Refresh the drawer and try again.";
  }
  if (error.code === "functions/permission-denied") {
    return "Your account is not allowed to suspend or restore this member.";
  }
  if (error.code === "functions/not-found") {
    return "The member Auth or profile record is missing.";
  }
  return error.message || "Lifecycle action failed.";
};

const formatDeleteError = (error) => {
  if (!error) return "";
  if (error.code === "functions/failed-precondition") {
    return error.message || "Delete precondition failed. Run a dry run and refresh the drawer.";
  }
  if (error.code === "functions/permission-denied") {
    return "Your account is not allowed to delete this member.";
  }
  if (error.code === "functions/not-found") {
    return "The target member no longer exists in the expected stores.";
  }
  if (error.code === "functions/invalid-argument") {
    return error.message || "The confirmation details are not valid.";
  }
  return error.message || "Delete action failed.";
};

const formatRoleError = (error) => {
  if (!error) return "";
  if (error.code === "functions/failed-precondition") {
    return error.message || "Role changed while the drawer was open. Refresh and try again.";
  }
  if (error.code === "functions/permission-denied") {
    return "Your account is not allowed to change this member role.";
  }
  if (error.code === "functions/not-found") {
    return "The member Auth or profile record is missing.";
  }
  if (error.code === "functions/invalid-argument") {
    return error.message || "Role change request is invalid.";
  }
  return error.message || "Role change failed.";
};

const getLifecycleImpact = (action) =>
  action === "suspend"
    ? [
        "Firebase Auth disabled will be set to true.",
        "Refresh tokens will be revoked.",
        "Firestore member status will become suspended.",
        "An audit log entry will be written.",
      ]
    : [
        "Firebase Auth disabled will be set to false.",
        "Firestore member status will become active.",
        "An audit log entry will be written.",
        "Existing sessions are not recreated automatically.",
      ];

const getDeleteImpact = (action) =>
  action === "soft_delete"
    ? [
        "Firebase Auth disabled will be set to true.",
        "Refresh tokens will be revoked.",
        "Firestore member status will become deleted.",
        "The member can be restored through the backend restore flow.",
        "An audit log entry will be written.",
      ]
    : [
        "Firebase Auth user will be deleted permanently.",
        "Firestore profile data will be anonymized.",
        "Presence data will be removed as ephemeral data.",
        "Audit logs and pre-delete snapshot will be preserved.",
        "This action is irreversible.",
      ];

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
  const key = normalize(value || "unknown").toLowerCase();
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

function DrawerField({ label, value }) {
  const displayValue = value === null || value === undefined || value === "" ? "-" : value;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{displayValue}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  const iconElement = React.createElement(Icon, { size: 18 });

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {iconElement}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

function InlineStatus({ tone = "default", children }) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${toneClass}`}>
      {children}
    </div>
  );
}

function ObjectSummary({ title, value, emptyLabel = "No data" }) {
  const entries = listObjectEntries(value);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {entries.map(([key, item]) => (
            <div key={key} className="grid gap-2 p-3 text-sm sm:grid-cols-[160px_1fr]">
              <p className="break-words font-semibold text-slate-600">{formatStatusLabel(key)}</p>
              <p className="min-w-0 whitespace-pre-wrap break-words font-medium text-slate-800">
                {formatAuditValue(item)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const moduleOneLensCopy = {
  S: { label: "Strength", className: "border-primary/20 bg-primary/10 text-primary" },
  W: { label: "Weakness", className: "border-amber-200 bg-amber-50 text-amber-800" },
  O: { label: "Opportunity", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  T: { label: "Threat", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const groupAnswersByPart = (answers = []) =>
  answers.reduce((groups, answer) => {
    const key = answer.partId || answer.partTitle || "answers";
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.answers.push(answer);
      return groups;
    }
    groups.push({
      key,
      title: answer.partTitle || "Saved answers",
      answers: [answer],
    });
    return groups;
  }, []);

function ModuleOnePainPointSignalsPanel({ painPointCloud = [], answerGroups = [] }) {
  const answerCount = answerGroups.reduce((total, group) => total + Number(group.answerCount || 0), 0);
  const characterCount = answerGroups.reduce((total, group) => total + Number(group.characterCount || 0), 0);
  const hasSignals = painPointCloud.length > 0;
  const hasAnswers = answerGroups.length > 0;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileSearch size={17} className="text-primary" />
              <p className="font-semibold text-slate-900">Module 1 pain point signals</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Full Module 1 response transcript grouped by mission, lens, and prompt.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg text-slate-900">{formatNumber(answerGroups.length)}</p>
              <p>missions</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg text-slate-900">{formatNumber(answerCount)}</p>
              <p>answers</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg text-slate-900">{formatNumber(characterCount)}</p>
              <p>chars</p>
            </div>
          </div>
        </div>
      </div>

      {!hasSignals && !hasAnswers ? (
        <div className="px-4 py-5">
          <PanelMessage icon={FileSearch} title="No Module 1 responses" body="No pain point signals or full answers were captured for this member yet." />
        </div>
      ) : null}

      {hasSignals ? (
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Signal summary</p>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
              {formatNumber(painPointCloud.length)} detected
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {painPointCloud.map((item) => (
              <span
                key={item.text}
                className={`max-w-full break-words rounded-md border px-3 py-2 font-semibold ${
                  item.weight >= 6
                    ? "border-primary/20 bg-primary/10 text-sm text-primary"
                    : "border-slate-200 bg-slate-50 text-xs text-slate-700"
                }`}
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hasAnswers ? (
        <div className="space-y-4 px-4 py-4">
          {answerGroups.map((group) => (
            <article key={group.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {group.courseTitle}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{group.missionTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {group.saveState || "saved"} | Updated {formatMemberV2DateTime(group.updatedAt)}
                    </p>
                  </div>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                    {formatNumber(group.answerCount)} answers
                  </span>
                </div>
                {group.summary ? (
                  <div className="mt-3 rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold text-primary">Summary</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{group.summary}</p>
                  </div>
                ) : null}
              </div>

              <div className="divide-y divide-slate-100">
                {groupAnswersByPart(group.answers).map((part) => (
                  <section key={part.key} className="px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{part.title}</p>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                        {formatNumber(part.answers.length)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {part.answers.map((answer) => {
                        const lens = moduleOneLensCopy[answer.lensCode] || {
                          label: answer.lensCode || "Answer",
                          className: "border-slate-200 bg-slate-50 text-slate-700",
                        };
                        return (
                          <div key={answer.id || answer.answer} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${lens.className}`}>
                                    {answer.lensCode || "-"} {lens.label}
                                  </span>
                                  {answer.focus ? <span className="text-xs font-semibold text-slate-500">{answer.focus}</span> : null}
                                </div>
                                <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                                  {answer.lensTitle || formatStatusLabel(answer.id)}
                                </p>
                              </div>
                            </div>
                            {answer.prompt ? (
                              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">{answer.prompt}</p>
                            ) : null}
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Full response</p>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{answer.answer}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AuditDiff({ before, after }) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (keys.length === 0) return null;

  return (
    <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
      {keys.map((key) => (
        <div key={key} className="grid gap-2 p-3 text-sm">
          <p className="font-semibold text-slate-700">{formatStatusLabel(key)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-400">Before</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{formatAuditValue(before?.[key])}</p>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2">
              <p className="text-xs font-semibold text-emerald-600">After</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">{formatAuditValue(after?.[key])}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileInput({ field, value, error, disabled, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
      {field.label}
      <input
        value={value}
        disabled={disabled}
        maxLength={field.maxLength}
        onChange={(event) => onChange(field.key, event.target.value)}
        className={`h-10 rounded-md border bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-500 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      />
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function PanelMessage({ icon: Icon, title, body, tone = "default" }) {
  const toneClass = tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500";
  const iconElement = React.createElement(Icon, { size: 18 });
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
          {iconElement}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </section>
  );
}

function LifecycleConfirmationModal({
  action,
  member,
  reason,
  saving,
  onReasonChange,
  onCancel,
  onConfirm,
}) {
  const isSuspend = action === "suspend";
  const title = isSuspend ? "Suspend member" : "Restore member";
  const confirmLabel = isSuspend ? "Suspend user" : "Restore user";
  const confirmDisabled = saving || normalize(reason).length < 8;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 px-4">
      <section className="w-full max-w-[520px] rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md ${
              isSuspend ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isSuspend ? <Ban size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 break-words text-sm text-slate-500">{member.displayName || member.email || member.uid}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Impact</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {getLifecycleImpact(action).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Reason
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            maxLength={500}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <span className={normalize(reason).length < 8 ? "text-rose-600" : "text-slate-400"}>
            Minimum 8 characters required.
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              isSuspend ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteConfirmationModal({
  action,
  member,
  reason,
  confirmationValue,
  secondConfirmationValue,
  plan,
  saving,
  onReasonChange,
  onConfirmationChange,
  onSecondConfirmationChange,
  onCancel,
  onDryRun,
  onConfirm,
}) {
  const isHardDelete = action === "hard_delete";
  const title = isHardDelete ? "Hard delete member" : "Soft delete member";
  const confirmLabel = isHardDelete ? "Hard delete permanently" : "Soft delete";
  const identityCandidates = [member.uid, member.email].map((item) => normalize(item).toLowerCase()).filter(Boolean);
  const confirmationMatches = identityCandidates.includes(normalize(confirmationValue).toLowerCase());
  const secondConfirmationMatches = secondConfirmationValue === HARD_DELETE_SECOND_CONFIRM;
  const dependencyBlocking = plan?.dependencies?.blocking || [];
  const dependencyErrors = plan?.dependencies?.errors || [];
  const hardDeleteReady =
    isHardDelete &&
    plan &&
    !plan.blocked &&
    confirmationMatches &&
    secondConfirmationMatches &&
    normalize(reason).length >= 8;
  const confirmDisabled = saving || (isHardDelete ? !hardDeleteReady : normalize(reason).length < 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 px-4">
      <section className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
            {isHardDelete ? <Trash2 size={20} /> : <Ban size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 break-words text-sm text-slate-500">{member.displayName || member.email || member.uid}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-semibold text-rose-900">Impact</p>
          <ul className="mt-2 space-y-1 text-sm text-rose-800">
            {getDeleteImpact(action === "hard_delete" ? "hard_delete" : "soft_delete").map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Reason
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            maxLength={500}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <span className={normalize(reason).length < 8 ? "text-rose-600" : "text-slate-400"}>
            Minimum 8 characters required.
          </span>
        </label>

        {isHardDelete ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={onDryRun}
              disabled={saving || normalize(reason).length < 8}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <FileSearch size={16} />}
              Run hard delete dry run
            </button>

            {plan ? (
              <div
                className={`rounded-lg border px-3 py-3 text-sm ${
                  plan.blocked ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                <p className="font-semibold">{plan.blocked ? "Dry run blocked" : "Dry run passed"}</p>
                <p className="mt-1">
                  Auth delete: {plan.operations?.deleteAuthUser ? "Yes" : "No"} | Presence delete:{" "}
                  {plan.operations?.deleteEphemeralDocs?.length ? "Yes" : "No"}
                </p>
                {dependencyBlocking.length > 0 ? (
                  <p className="mt-2">Blocking dependencies: {dependencyBlocking.length}</p>
                ) : null}
                {dependencyErrors.length > 0 ? <p className="mt-2">Dependency check errors: {dependencyErrors.length}</p> : null}
              </div>
            ) : null}

            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Type UID or email
              <input
                value={confirmationValue}
                onChange={(event) => onConfirmationChange(event.target.value)}
                className={`h-10 rounded-md border bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                  confirmationValue && !confirmationMatches ? "border-rose-300" : "border-slate-200"
                }`}
              />
              <span className={confirmationValue && !confirmationMatches ? "text-rose-600" : "text-slate-400"}>
                Must match {member.email ? "email or UID" : "UID"}.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Type DELETE_PERMANENTLY
              <input
                value={secondConfirmationValue}
                onChange={(event) => onSecondConfirmationChange(event.target.value)}
                className={`h-10 rounded-md border bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                  secondConfirmationValue && !secondConfirmationMatches ? "border-rose-300" : "border-slate-200"
                }`}
              />
              <span className={secondConfirmationValue && !secondConfirmationMatches ? "text-rose-600" : "text-slate-400"}>
                This is the second confirmation gate.
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function LearningResetConfirmationModal({
  member,
  courseLabel,
  reason,
  saving,
  onCancel,
  onConfirm,
}) {
  const confirmDisabled = saving || normalize(reason).length < 8;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 px-4">
      <section className="w-full max-w-[520px] rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <RefreshCw size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Reset learning progress</h3>
            <p className="mt-1 break-words text-sm text-slate-500">{member.displayName || member.email || member.uid}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Impact</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            <li>Selected target: {courseLabel}</li>
            <li>Enrollment progress will be reset to not_started.</li>
            <li>Mission response documents under the selected enrollment(s) will be removed.</li>
            <li>An audit log entry will be written by the backend.</li>
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Reason: <span className="font-semibold text-slate-800">{reason}</span>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Confirm reset
          </button>
        </div>
      </section>
    </div>
  );
}

export default function MemberDetailDrawerV2({ member, onClose }) {
  const { currentUser, userRole } = useAuth();
  const canViewSensitive = isAdminRole(userRole);
  const canEditProfile = isAdminRole(userRole);
  const lifecycleActionsEnabled = isMembersV2LifecycleActionsEnabledForUser({ currentUser, userRole });
  const deleteActionsEnabled = isMembersV2DeleteActionsEnabledForUser({ currentUser, userRole });
  const roleEditorEnabled = isMembersV2RoleEditorEnabledForUser({ currentUser, userRole });
  const learningResetEnabled = isMembersV2LearningResetEnabledForUser({ currentUser, userRole });
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildProfileDraft(member));
  const [baseDraft, setBaseDraft] = useState(() => buildProfileDraft(member));
  const [editBaseUpdatedAtMs, setEditBaseUpdatedAtMs] = useState(member?.updatedAtMs || 0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveResult, setSaveResult] = useState("");
  const [lifecycleModal, setLifecycleModal] = useState(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleSaving, setLifecycleSaving] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleResult, setLifecycleResult] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("");
  const [deleteSecondConfirmationValue, setDeleteSecondConfirmationValue] = useState("");
  const [deleteDryRunPlan, setDeleteDryRunPlan] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteResult, setDeleteResult] = useState("");
  const [roleDraft, setRoleDraft] = useState(() => normalize(member?.role || "member").toLowerCase());
  const [roleReason, setRoleReason] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleResult, setRoleResult] = useState("");
  const [reconcilePlan, setReconcilePlan] = useState(null);
  const [reconcileReason, setReconcileReason] = useState("");
  const [reconcileSaving, setReconcileSaving] = useState(false);
  const [reconcileError, setReconcileError] = useState("");
  const [reconcileResult, setReconcileResult] = useState("");
  const [learningResetCourseId, setLearningResetCourseId] = useState("all");
  const [learningResetReason, setLearningResetReason] = useState("");
  const [learningResetModalOpen, setLearningResetModalOpen] = useState(false);
  const [learningResetSaving, setLearningResetSaving] = useState(false);
  const [learningResetError, setLearningResetError] = useState("");
  const [learningResetResult, setLearningResetResult] = useState("");

  const usageState = useMemberUsageDetails(member?.uid, { enabled: tab === "usage" });
  const learningState = useMemberLearningDetails(member?.uid, { enabled: tab === "learning" });
  const auditState = useMemberAuditLogs(member?.uid, { enabled: tab === "audit" && canViewSensitive });
  const changedFields = useMemo(() => getChangedFields(baseDraft, draft), [baseDraft, draft]);
  const validationErrors = useMemo(
    () => validateProfileDraft({ draft, reason, changedFields }),
    [changedFields, draft, reason],
  );
  const canSave = editing && changedFields.length > 0 && Object.keys(validationErrors).length === 0 && !saving;

  if (!member) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: UserRound },
    { id: "profile", label: "Profile", icon: Edit3 },
    { id: "usage", label: "Usage", icon: Activity },
    { id: "learning", label: "Learning", icon: BookOpen },
    { id: "permissions", label: "Permissions", icon: ShieldCheck },
    ...(canViewSensitive
      ? [
          { id: "security", label: "Security", icon: ShieldCheck },
          { id: "audit", label: "Audit Log", icon: Clock },
          { id: "danger", label: "Danger Zone", icon: Ban },
        ]
      : []),
  ];
  const normalizedMemberStatus = normalize(member.status).toLowerCase();
  const softDeleted = ["deleted", "soft_deleted"].includes(normalizedMemberStatus);
  const hardDeleted = normalizedMemberStatus === "hard_deleted";
  const suspended = !hardDeleted && (member.status === "suspended" || member.auth?.disabled === true);
  const lifecycleAction = suspended ? "restore" : "suspend";
  const targetIsSuperAdmin = normalize(member.role).toLowerCase() === "super_admin";
  const actorIsSuperAdmin = normalize(userRole).toLowerCase() === "super_admin";
  const roleEditorBlockedReason =
    !roleEditorEnabled
      ? "Role editor is disabled by feature flag."
      : !isSuperAdminRole(userRole)
        ? "Only a super_admin can change roles."
        : currentUser?.uid === member.uid
          ? "Admins cannot change their own role."
          : targetIsSuperAdmin
            ? "super_admin role changes require a break-glass manual process."
            : "";
  const roleChanged = normalize(member.role).toLowerCase() !== normalize(roleDraft).toLowerCase();
  const canSaveRole =
    canViewSensitive && roleEditorEnabled && !roleEditorBlockedReason && roleChanged && normalize(roleReason).length >= 8 && !roleSaving;
  const lifecycleBlockedReason =
    hardDeleted
      ? "Hard-deleted members cannot be restored from the console."
      : currentUser?.uid === member.uid
      ? "Admins cannot suspend or restore themselves."
      : targetIsSuperAdmin && !actorIsSuperAdmin
        ? "Only a super_admin can change another super_admin lifecycle state."
        : !lifecycleActionsEnabled
          ? "Lifecycle actions are disabled by feature flag."
          : "";
  const canRunLifecycleAction = canViewSensitive && lifecycleActionsEnabled && !lifecycleBlockedReason;
  const deleteBlockedReason =
    currentUser?.uid === member.uid
      ? "Admins cannot delete themselves."
      : hardDeleted
        ? "This member is already hard deleted."
        : targetIsSuperAdmin && !actorIsSuperAdmin
          ? "Only a super_admin can delete another super_admin."
          : !deleteActionsEnabled
            ? "Delete actions are disabled by feature flag."
            : "";
  const canRunSoftDeleteAction =
    canViewSensitive && deleteActionsEnabled && !deleteBlockedReason && !softDeleted && !hardDeleted;
  const hardDeleteBlockedReason =
    hardDeleted
      ? "This member is already hard deleted."
      : !actorIsSuperAdmin
      ? "Hard delete requires super_admin role."
      : !softDeleted
        ? "Hard delete requires soft delete first."
        : deleteBlockedReason;
  const canRunHardDeleteAction =
    canViewSensitive && deleteActionsEnabled && actorIsSuperAdmin && softDeleted && !hardDeleteBlockedReason;
  const learningResetBlockedReason =
    hardDeleted
      ? "Hard-deleted members cannot have learning records reset."
      : currentUser?.uid === member.uid
        ? "Admins cannot reset their own learning record from this console."
        : !learningResetEnabled
          ? "Learning reset is disabled by feature flag."
          : "";
  const selectedLearningCourse =
    learningResetCourseId === "all"
      ? null
      : learningState.enrollmentInsights.find((enrollment) => enrollment.courseId === learningResetCourseId);
  const selectedLearningCourseLabel =
    learningResetCourseId === "all"
      ? "All enrollments"
      : selectedLearningCourse?.courseTitle || learningResetCourseId;
  const canReviewLearningReset =
    canViewSensitive &&
    learningResetEnabled &&
    !learningResetBlockedReason &&
    learningState.enrollmentInsights.length > 0 &&
    normalize(learningResetReason).length >= 8 &&
    !learningResetSaving;
  const integrityFlags = [
    { label: "Profile missing", active: member.flags?.profileMissing },
    { label: "Usage missing", active: member.flags?.usageMissing },
    { label: "Auth only", active: member.flags?.authOnly },
    { label: "Orphan profile", active: member.flags?.orphanProfile },
    { label: "Stale presence", active: member.flags?.stalePresence },
    { label: "Disabled mismatch", active: member.flags?.disabledMismatch },
    { label: "Role mismatch", active: member.flags?.roleMismatch },
    { label: "Requires review", active: member.flags?.requiresReview },
  ];
  const activeIntegrityFlags = integrityFlags.filter((flag) => flag.active);
  const usageDetails = usageState.usage || {};
  const featureUsageEntries = listObjectEntries(usageDetails.featureUsage);
  const reconcileMismatchCount = Number(reconcilePlan?.mismatchCount || 0);
  const canWriteReconciliation =
    canViewSensitive &&
    reconcilePlan &&
    reconcileMismatchCount > 0 &&
    normalize(reconcileReason).length >= 8 &&
    !reconcileSaving;

  const beginEdit = () => {
    const nextDraft = buildProfileDraft(member);
    setDraft(nextDraft);
    setBaseDraft(nextDraft);
    setEditBaseUpdatedAtMs(member.updatedAtMs || 0);
    setReason("");
    setSaveError("");
    setSaveResult("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(baseDraft);
    setReason("");
    setEditing(false);
  };

  const updateDraft = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setSaveError("");
    setSaveResult("");
  };

  const saveProfile = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError("");
    setSaveResult("");

    try {
      const result = await updateMemberProfileV2({
        targetUid: member.uid,
        profile: draft,
        reason,
        baseMembersV2UpdatedAtMs: editBaseUpdatedAtMs,
      });
      setEditing(false);
      setReason("");
      setBaseDraft(draft);
      setSaveResult(
        result?.changedFields?.length
          ? `Saved ${result.changedFields.length} field(s). Audit log: ${result.auditLogId || "not created"}`
          : "No profile changes were needed.",
      );
    } catch (error) {
      console.error("Member profile update failed", error);
      setDraft(buildProfileDraft(member));
      setBaseDraft(buildProfileDraft(member));
      setReason("");
      setEditing(false);
      setSaveError(formatCallableError(error));
    } finally {
      setSaving(false);
    }
  };

  const openLifecycleModal = (action) => {
    setLifecycleModal(action);
    setLifecycleReason("");
    setLifecycleError("");
    setLifecycleResult("");
  };

  const openDeleteModal = (action) => {
    setDeleteModal(action);
    setDeleteReason("");
    setDeleteConfirmationValue("");
    setDeleteSecondConfirmationValue("");
    setDeleteDryRunPlan(null);
    setDeleteError("");
    setDeleteResult("");
  };

  const confirmLifecycleAction = async () => {
    if (!lifecycleModal || normalize(lifecycleReason).length < 8) return;
    setLifecycleSaving(true);
    setLifecycleError("");
    setLifecycleResult("");

    try {
      const action = lifecycleModal;
      const runner = action === "suspend" ? suspendMemberV2 : restoreMemberV2;
      const result = await runner({
        targetUid: member.uid,
        reason: lifecycleReason,
      });
      setLifecycleResult(
        `${action === "suspend" ? "Suspended" : "Restored"} ${member.displayName || member.email || member.uid}. Audit log: ${
          result?.auditLogId || "-"
        }`,
      );
      setLifecycleModal(null);
      setLifecycleReason("");
    } catch (error) {
      console.error("Member lifecycle action failed", error);
      setLifecycleError(formatLifecycleError(error));
    } finally {
      setLifecycleSaving(false);
    }
  };

  const runHardDeleteDryRun = async () => {
    if (normalize(deleteReason).length < 8) return;
    setDeleteSaving(true);
    setDeleteError("");
    setDeleteResult("");

    try {
      const result = await hardDeleteMemberV2({
        targetUid: member.uid,
        reason: deleteReason,
        write: false,
      });
      setDeleteDryRunPlan(result?.plan || null);
      setDeleteResult(result?.blocked ? "Dry run found blocking dependencies." : "Dry run passed. Confirmations are now required.");
    } catch (error) {
      console.error("Hard delete dry run failed", error);
      setDeleteDryRunPlan(null);
      setDeleteError(formatDeleteError(error));
    } finally {
      setDeleteSaving(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteModal || normalize(deleteReason).length < 8) return;
    setDeleteSaving(true);
    setDeleteError("");
    setDeleteResult("");

    try {
      if (deleteModal === "soft_delete") {
        const result = await softDeleteMemberV2({
          targetUid: member.uid,
          reason: deleteReason,
        });
        setDeleteResult(`Soft deleted ${member.displayName || member.email || member.uid}. Audit log: ${result?.auditLogId || "-"}`);
      } else {
        const result = await hardDeleteMemberV2({
          targetUid: member.uid,
          reason: deleteReason,
          write: true,
          confirm: HARD_DELETE_CONFIRM,
          secondConfirm: deleteSecondConfirmationValue,
          confirmationValue: deleteConfirmationValue,
          dryRunReviewed: Boolean(deleteDryRunPlan && !deleteDryRunPlan.blocked),
        });
        setDeleteResult(
          `Hard delete completed. Audit log: ${result?.auditLogId || "-"} | Snapshot: ${result?.deletionExportId || "-"}`,
        );
      }

      setDeleteModal(null);
      setDeleteReason("");
      setDeleteConfirmationValue("");
      setDeleteSecondConfirmationValue("");
      setDeleteDryRunPlan(null);
    } catch (error) {
      console.error("Member delete action failed", error);
      setDeleteError(formatDeleteError(error));
    } finally {
      setDeleteSaving(false);
    }
  };

  const saveRole = async () => {
    if (!canSaveRole) return;
    setRoleSaving(true);
    setRoleError("");
    setRoleResult("");

    try {
      const result = await setUserRoleV2({
        targetUid: member.uid,
        role: roleDraft,
        reason: roleReason,
        confirm: ROLE_CONFIRM,
        baseMembersV2UpdatedAtMs: member.updatedAtMs || 0,
      });
      setRoleReason("");
      setRoleResult(
        result?.changed
          ? `Role changed to ${roleLabels[result.role] || formatStatusLabel(result.role)}. Audit log: ${result.auditLogId || "-"}`
          : "No role change was needed.",
      );
    } catch (error) {
      console.error("Member role update failed", error);
      setRoleDraft(normalize(member.role || "member").toLowerCase());
      setRoleReason("");
      setRoleError(formatRoleError(error));
    } finally {
      setRoleSaving(false);
    }
  };

  const confirmLearningReset = async () => {
    if (!canReviewLearningReset) return;
    setLearningResetSaving(true);
    setLearningResetError("");
    setLearningResetResult("");

    try {
      const result = await resetMemberLearningProgressV2({
        targetUid: member.uid,
        courseId: learningResetCourseId,
        reason: learningResetReason,
        confirm: LEARNING_RESET_CONFIRM,
      });
      setLearningResetModalOpen(false);
      setLearningResetReason("");
      setLearningResetResult(
        `Reset ${result?.enrollmentCount || 0} enrollment(s), removed ${result?.deletedMissionResponseCount || 0} mission response(s). Audit log: ${
          result?.auditLogId || "-"
        }`,
      );
    } catch (error) {
      console.error("Member learning reset failed", error);
      setLearningResetError(error.message || "Learning reset failed.");
    } finally {
      setLearningResetSaving(false);
    }
  };

  const runReconciliationDryRun = async () => {
    if (!member?.uid || reconcileSaving) return;
    setReconcileSaving(true);
    setReconcileError("");
    setReconcileResult("");

    try {
      const result = await reconcileMemberLifecycleMismatch({
        targetUid: member.uid,
        write: false,
      });
      setReconcilePlan(result);
      setReconcileResult(
        result.mismatchCount > 0
          ? `Dry run found ${result.mismatchCount} lifecycle mismatch(es).`
          : "Dry run passed. No lifecycle mismatch found.",
      );
    } catch (error) {
      console.error("Lifecycle reconciliation dry run failed", error);
      setReconcilePlan(null);
      setReconcileError(error.message || "Lifecycle reconciliation dry run failed.");
    } finally {
      setReconcileSaving(false);
    }
  };

  const writeReconciliation = async () => {
    if (!canWriteReconciliation) return;
    setReconcileSaving(true);
    setReconcileError("");
    setReconcileResult("");

    try {
      const result = await reconcileMemberLifecycleMismatch({
        targetUid: member.uid,
        write: true,
        confirm: "PHASE5_RECONCILE_WRITE",
        reason: reconcileReason,
      });
      setReconcilePlan(result);
      setReconcileReason("");
      setReconcileResult(`Reconciliation wrote ${result.writeCount || 0} update(s).`);
    } catch (error) {
      console.error("Lifecycle reconciliation write failed", error);
      setReconcileError(error.message || "Lifecycle reconciliation write failed.");
    } finally {
      setReconcileSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <button type="button" className="hidden flex-1 md:block" aria-label="Close member drawer" onClick={onClose} />
      <aside className="flex h-full w-full max-w-[620px] flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-4">
            <Avatar member={member} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-ink">{member.displayName}</h2>
                <StatusChip value={member.status} />
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">{member.email || member.uid}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <OnlineChip member={member} />
                <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {roleLabels[member.role] || formatStatusLabel(member.role)}
                </span>
                {member.flags?.requiresReview ? (
                  <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    Requires review
                  </span>
                ) : (
                  <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Integrity ok
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
              aria-label="Close drawer"
            >
              <PanelRightClose size={18} />
            </button>
          </div>
        </header>

        <div className="border-b border-slate-200 px-5 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
          {tab === "overview" ? (
            <section className="space-y-4">
              <SectionHeader
                icon={UserRound}
                title="Member snapshot"
                description="Canonical identity, lifecycle, activity, and data integrity state for this member."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="UID" value={member.uid} />
                <DrawerField label="Email" value={member.email} />
                <DrawerField label="Display name" value={member.displayName} />
                <DrawerField label="Phone" value={member.phoneNumber} />
                <DrawerField label="Role" value={roleLabels[member.role] || formatStatusLabel(member.role)} />
                <DrawerField label="Status" value={formatStatusLabel(member.status)} />
                <DrawerField label="Online state" value={formatStatusLabel(resolveOnlineBucket(member))} />
                <DrawerField label="Presence source" value={member.presence?.source || "legacy"} />
                <DrawerField
                  label="Last active"
                  value={formatMemberV2DateTime(
                    member.usageSummary?.lastActiveAt || member.presence?.lastActiveAt || member.presence?.lastHeartbeatAt,
                  )}
                />
                <DrawerField label="Last login" value={formatMemberV2DateTime(member.usageSummary?.lastLoginAt || member.auth?.lastSignInTime)} />
                <DrawerField label="Created" value={formatMemberV2DateTime(member.createdAt)} />
                <DrawerField label="Updated" value={formatMemberV2DateTime(member.updatedAt)} />
                <DrawerField label="Schema version" value={member.schemaVersion} />
                <DrawerField label="Updated by" value={member.updatedBy} />
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Integrity state</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Flags come from additive backfill, health checks, and lifecycle reconciliation.
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-md border px-3 py-1 text-sm font-semibold ${
                      activeIntegrityFlags.length
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {activeIntegrityFlags.length ? `${activeIntegrityFlags.length} flag(s)` : "Healthy"}
                  </span>
                </div>

                {activeIntegrityFlags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeIntegrityFlags.map((flag) => (
                      <span key={flag.label} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {flag.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No integrity flags are currently active for this member.</p>
                )}
              </section>
            </section>
          ) : null}

          {tab === "profile" ? (
            <section className="space-y-4">
              <SectionHeader
                icon={Edit3}
                title="Profile management"
                description="Edits safe personal fields through the backend callable and writes an audit log."
              />

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Profile editor</p>
                  <p className="text-sm text-slate-500">Personal profile fields only</p>
                </div>
                {canEditProfile ? (
                  <div className="flex flex-wrap gap-2">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"
                        >
                          <X size={15} />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={!canSave}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={beginEdit}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary"
                      >
                        <Edit3 size={15} />
                        Edit profile
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {!canEditProfile ? (
                <InlineStatus tone="warn">Your role can view this profile but cannot edit member profile fields.</InlineStatus>
              ) : null}

              {saveError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {saveError}
                </div>
              ) : null}
              {saveResult ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {saveResult}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {profileFields.map((field) => (
                  <ProfileInput
                    key={field.key}
                    field={field}
                    value={editing ? draft[field.key] : buildProfileDraft(member)[field.key]}
                    error={validationErrors[field.key]}
                    disabled={!editing || saving}
                    onChange={updateDraft}
                  />
                ))}
              </div>

              {editing ? (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                    Reason
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      maxLength={500}
                      className={`rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                        validationErrors.reason ? "border-rose-300" : "border-slate-200"
                      }`}
                    />
                    {validationErrors.reason ? (
                      <span className="text-xs font-medium text-rose-600">{validationErrors.reason}</span>
                    ) : null}
                  </label>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">Changed fields</p>
                    {changedFields.length > 0 ? (
                      <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {changedFields.map((field) => (
                          <div key={field.key} className="grid gap-2 p-3 text-sm sm:grid-cols-[120px_1fr]">
                            <p className="font-semibold text-slate-600">{field.label}</p>
                            <p className="break-words text-slate-700">
                              <span className="text-slate-400">{field.before || "-"}</span>
                              <span className="px-2 text-primary">to</span>
                              <span className="font-semibold">{field.after || "-"}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No changes yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "usage" ? (
            <section className="space-y-4">
              <SectionHeader
                icon={Activity}
                title="Usage data"
                description="Reads userUsage/{uid} lazily when this tab opens, with members_v2 summary as fallback."
              />

              {usageState.loading ? (
                <PanelMessage icon={Loader2} title="Loading usage data" body="Reading this member's usage document." />
              ) : null}
              {usageState.error ? (
                <PanelMessage icon={AlertCircle} title="Unable to load usage data" body={usageState.error.message || "userUsage read failed."} tone="danger" />
              ) : null}
              {!usageState.loading && !usageState.error && !usageState.usage ? (
                <PanelMessage icon={Activity} title="No userUsage document" body="Showing members_v2 usageSummary fallback where available." />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="Enrollments" value={formatNumber(usageDetails.enrollmentCount ?? member.usageSummary?.enrollmentCount)} />
                <DrawerField label="Mission responses" value={formatNumber(usageDetails.missionResponseCount ?? member.usageSummary?.missionResponseCount)} />
                <DrawerField label="Login count" value={formatNumber(usageDetails.loginCount ?? 0)} />
                <DrawerField label="Total sessions" value={formatNumber(usageDetails.totalSessions ?? member.usageSummary?.totalSessions)} />
                <DrawerField label="Total actions" value={formatNumber(usageDetails.totalActions ?? member.usageSummary?.totalActions)} />
                <DrawerField label="Last active" value={formatMemberV2DateTime(usageDetails.lastActiveAt || member.usageSummary?.lastActiveAt)} />
                <DrawerField label="Last login" value={formatMemberV2DateTime(usageDetails.lastLoginAt || member.usageSummary?.lastLoginAt || member.auth?.lastSignInTime)} />
                <DrawerField label="Last learning reset" value={formatMemberV2DateTime(usageDetails.lastLearningResetAt)} />
                <DrawerField label="Generated from enrollments" value={formatBoolean(usageDetails.generatedFrom?.enrollments)} />
                <DrawerField label="Generated from presence" value={formatBoolean(usageDetails.generatedFrom?.presence)} />
              </div>

              <ObjectSummary title="Feature usage" value={usageDetails.featureUsage} emptyLabel="No feature usage counters were recorded." />

              {featureUsageEntries.length > 0 ? (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">Feature usage ranking</p>
                  <div className="mt-3 space-y-2">
                    {featureUsageEntries
                      .map(([key, value]) => ({ key, value: Number(value) || 0 }))
                      .sort((left, right) => right.value - left.value)
                      .slice(0, 8)
                      .map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{formatStatusLabel(item.key)}</p>
                          <p className="text-sm font-semibold text-slate-900">{formatNumber(item.value)}</p>
                        </div>
                      ))}
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {tab === "learning" ? (
            <section className="space-y-4">
              <SectionHeader
                icon={BookOpen}
                title="Learning progress"
                description="Loads this member's enrollments and mission responses only while the Learning tab is open."
              />

              {learningState.error ? (
                <PanelMessage icon={AlertCircle} title="Unable to load learning data" body={learningState.error.message || "Enrollment read failed."} tone="danger" />
              ) : null}

              {learningState.loading ? (
                <PanelMessage icon={Loader2} title="Loading learning data" body="Reading this member's enrollment summaries and mission responses." />
              ) : null}

              {!learningState.loading && !learningState.error && learningState.enrollmentInsights.length === 0 ? (
                <PanelMessage icon={BookOpen} title="No tracked enrollments" body="This member has not enrolled in a tracked course yet." />
              ) : null}

              {learningState.enrollmentInsights.length > 0 ? (
                <section className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {learningState.enrollmentInsights.map((enrollment) => (
                      <article key={enrollment.courseId} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{enrollment.courseTitle}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {enrollment.activeModuleTitle || "Waiting module"} | {enrollment.activeLessonTitle || "No active lesson"}
                            </p>
                          </div>
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-700">
                            {enrollment.progressPercent}%
                          </span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${enrollment.progressPercent}%` }} />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          Last saved: {formatMemberV2DateTime(enrollment.lastSavedAt || enrollment.lastAccess)}
                        </p>
                      </article>
                    ))}
                  </div>

                  <ModuleOnePainPointSignalsPanel
                    painPointCloud={learningState.painPointCloud}
                    answerGroups={learningState.moduleOneAnswerGroups}
                  />

                  <section className="rounded-lg border border-amber-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <RefreshCw size={17} className="text-amber-700" />
                          <p className="font-semibold text-slate-900">Reset learning progress</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Backend-only recovery tool for enrollment progress and mission responses.
                        </p>
                        {learningResetBlockedReason ? (
                          <p className="mt-2 text-sm font-semibold text-amber-700">{learningResetBlockedReason}</p>
                        ) : null}
                      </div>
                    </div>

                    {learningResetError ? (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                        {learningResetError}
                      </div>
                    ) : null}
                    {learningResetResult ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        {learningResetResult}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                        Reset target
                        <select
                          value={learningResetCourseId}
                          onChange={(event) => {
                            setLearningResetCourseId(event.target.value);
                            setLearningResetError("");
                            setLearningResetResult("");
                          }}
                          disabled={Boolean(learningResetBlockedReason) || learningResetSaving}
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="all">All enrollments</option>
                          {learningState.enrollmentInsights.map((enrollment) => (
                            <option key={enrollment.courseId} value={enrollment.courseId}>
                              {enrollment.courseTitle}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-500">Impact preview</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{selectedLearningCourseLabel}</p>
                      </div>
                    </div>

                    <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-slate-500">
                      Reason
                      <textarea
                        value={learningResetReason}
                        onChange={(event) => {
                          setLearningResetReason(event.target.value);
                          setLearningResetError("");
                          setLearningResetResult("");
                        }}
                        disabled={Boolean(learningResetBlockedReason) || learningResetSaving}
                        rows={3}
                        maxLength={500}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <span className={normalize(learningResetReason).length < 8 ? "text-rose-600" : "text-slate-400"}>
                        Minimum 8 characters required.
                      </span>
                    </label>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setLearningResetModalOpen(true)}
                        disabled={!canReviewLearningReset}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {learningResetSaving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Review reset
                      </button>
                    </div>
                  </section>
                </section>
              ) : null}
            </section>
          ) : null}

          {tab === "permissions" ? (
            <section className="space-y-4">
              <SectionHeader
                icon={ShieldCheck}
                title="Permissions and RBAC"
                description="Role changes are enforced by backend validation and mirrored to Firebase custom claims."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="Role" value={roleLabels[member.role] || formatStatusLabel(member.role)} />
                <DrawerField label="Claims source" value={member.rbac?.source || "Firestore mirror"} />
                <DrawerField label="Claims synced" value={formatMemberV2DateTime(member.rbac?.customClaimsSyncedAt || member.rbac?.updatedAt)} />
                <DrawerField label="Claims role" value={roleLabels[member.rbac?.role] || formatStatusLabel(member.rbac?.role || member.role)} />
                <DrawerField label="Legacy member status" value={member.legacy?.memberStatus} />
                <DrawerField label="V2 lifecycle status" value={formatStatusLabel(member.status)} />
              </div>

              <ObjectSummary title="RBAC metadata" value={member.rbac} emptyLabel="No RBAC metadata is mirrored on this member yet." />

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound size={17} className="text-primary" />
                      <p className="font-semibold text-slate-900">Role editor</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Updates Firebase custom claims, mirrors the role to Firestore, revokes refresh tokens, and writes audit log.
                    </p>
                    {roleEditorBlockedReason ? (
                      <p className="mt-2 text-sm font-semibold text-amber-700">{roleEditorBlockedReason}</p>
                    ) : null}
                  </div>
                </div>

                {roleError ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {roleError}
                  </div>
                ) : null}
                {roleResult ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {roleResult}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                    New role
                    <select
                      value={roleDraft}
                      onChange={(event) => {
                        setRoleDraft(event.target.value);
                        setRoleError("");
                        setRoleResult("");
                      }}
                      disabled={Boolean(roleEditorBlockedReason) || roleSaving}
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {roleEditorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">Change preview</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {roleLabels[member.role] || formatStatusLabel(member.role)}
                      <span className="px-2 text-primary">to</span>
                      {roleLabels[roleDraft] || formatStatusLabel(roleDraft)}
                    </p>
                  </div>
                </div>

                <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-slate-500">
                  Reason
                  <textarea
                    value={roleReason}
                    onChange={(event) => {
                      setRoleReason(event.target.value);
                      setRoleError("");
                      setRoleResult("");
                    }}
                    disabled={Boolean(roleEditorBlockedReason) || roleSaving}
                    rows={3}
                    maxLength={500}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <span className={normalize(roleReason).length < 8 ? "text-rose-600" : "text-slate-400"}>
                    Minimum 8 characters required.
                  </span>
                </label>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={saveRole}
                    disabled={!canSaveRole}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {roleSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    Save role
                  </button>
                </div>
              </section>
            </section>
          ) : null}

          {tab === "security" && canViewSensitive ? (
            <section className="space-y-4">
              <SectionHeader
                icon={ShieldCheck}
                title="Security posture"
                description="Read-only Auth, presence, and integrity signals with a backend reconciliation tool for lifecycle mismatch."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="Auth disabled" value={formatBoolean(member.auth?.disabled)} />
                <DrawerField label="Email verified" value={formatBoolean(member.auth?.emailVerified)} />
                <DrawerField label="Provider IDs" value={(member.auth?.providerIds || []).join(", ")} />
                <DrawerField label="Auth created" value={formatMemberV2DateTime(member.auth?.creationTime)} />
                <DrawerField label="Auth last sign-in" value={formatMemberV2DateTime(member.auth?.lastSignInTime)} />
                <DrawerField label="Presence source" value={member.presence?.source || "legacy"} />
                <DrawerField label="Presence state" value={formatStatusLabel(member.presence?.state)} />
                <DrawerField label="Connections" value={formatNumber(member.presence?.connectionCount ?? 0)} />
                <DrawerField label="Active connections" value={formatNumber(member.presence?.activeConnectionCount ?? 0)} />
                <DrawerField label="Last heartbeat" value={formatMemberV2DateTime(member.presence?.lastHeartbeatAt)} />
                <DrawerField label="Last seen" value={formatMemberV2DateTime(member.presence?.lastSeenAt)} />
                <DrawerField label="Aggregated at" value={formatMemberV2DateTime(member.presence?.aggregatedAt)} />
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Integrity flags</p>
                    <p className="mt-1 text-sm text-slate-500">Use reconciliation only when Auth and Firestore lifecycle state diverge.</p>
                  </div>
                  <span
                    className={`rounded-md border px-3 py-1 text-sm font-semibold ${
                      activeIntegrityFlags.length
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {activeIntegrityFlags.length ? `${activeIntegrityFlags.length} active` : "No active flags"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {integrityFlags.map((flag) => (
                    <div key={flag.label} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-700">{flag.label}</span>
                      <span className={`text-sm font-semibold ${flag.active ? "text-amber-700" : "text-emerald-700"}`}>
                        {flag.active ? "Yes" : "No"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw size={17} className="text-primary" />
                      <p className="font-semibold text-slate-900">Lifecycle reconciliation</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Dry run compares Firebase Auth disabled state with users and members_v2 status for this UID.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runReconciliationDryRun}
                    disabled={reconcileSaving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reconcileSaving ? <Loader2 size={16} className="animate-spin" /> : <FileSearch size={16} />}
                    Run dry run
                  </button>
                </div>

                {reconcileError ? <InlineStatus tone="danger">{reconcileError}</InlineStatus> : null}
                {reconcileResult ? <div className="mt-3"><InlineStatus tone={reconcileMismatchCount ? "warn" : "success"}>{reconcileResult}</InlineStatus></div> : null}

                {reconcilePlan ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DrawerField label="Checked" value={formatNumber(reconcilePlan.checkedCount)} />
                      <DrawerField label="Mismatches" value={formatNumber(reconcilePlan.mismatchCount)} />
                      <DrawerField label="Errors" value={formatNumber(reconcilePlan.errors?.length || 0)} />
                    </div>

                    {reconcilePlan.mismatches?.length > 0 ? (
                      <ObjectSummary title="Mismatch detail" value={Object.fromEntries(reconcilePlan.mismatches.map((item) => [item.uid, item]))} />
                    ) : null}

                    {reconcilePlan.errors?.length > 0 ? (
                      <ObjectSummary title="Reconciliation errors" value={Object.fromEntries(reconcilePlan.errors.map((item, index) => [item.uid || `error_${index + 1}`, item]))} />
                    ) : null}

                    {reconcileMismatchCount > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-amber-800">
                          Write-mode reason
                          <textarea
                            value={reconcileReason}
                            onChange={(event) => {
                              setReconcileReason(event.target.value);
                              setReconcileError("");
                            }}
                            rows={3}
                            maxLength={500}
                            className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                          <span className={normalize(reconcileReason).length < 8 ? "text-rose-600" : "text-amber-700"}>
                            Minimum 8 characters required before write mode.
                          </span>
                        </label>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={writeReconciliation}
                            disabled={!canWriteReconciliation}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {reconcileSaving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            Write reconciliation
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </section>
          ) : null}

          {tab === "audit" && canViewSensitive ? (
            <section className="space-y-3">
              <SectionHeader
                icon={Clock}
                title="Audit timeline"
                description="Backend-written member events for profile, role, lifecycle, delete, learning reset, and reconciliation actions."
              />

              {auditState.loading ? (
                <PanelMessage icon={Loader2} title="Loading audit log" body="Reading recent auditLogs for this member." />
              ) : null}
              {auditState.error ? (
                <PanelMessage icon={AlertCircle} title="Unable to load audit log" body={auditState.error.message || "Audit log read failed."} tone="danger" />
              ) : null}
              {!auditState.loading && !auditState.error && auditState.auditLogs.length === 0 ? (
                <PanelMessage icon={Clock} title="No audit events loaded" body="Audit entries will appear after backend operations write auditLogs." />
              ) : null}
              {auditState.auditLogs.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.type || "audit.event"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Request: {item.requestId || item.id}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{formatMemberV2DateTime(item.createdAt)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <DrawerField label="Status" value={item.status || "completed"} />
                    <DrawerField label="Actor" value={item.actorUid || "-"} />
                    <DrawerField label="Actor role" value={roleLabels[item.actorRole] || formatStatusLabel(item.actorRole)} />
                    <DrawerField label="Reason" value={item.reason || "-"} />
                  </div>
                  <AuditDiff before={item.before} after={item.after} />
                  {item.error ? <ObjectSummary title="Error detail" value={item.error} /> : null}
                </article>
              ))}
            </section>
          ) : null}

          {tab === "danger" && canViewSensitive ? (
            <section className="space-y-3">
              <SectionHeader
                icon={Ban}
                title="Danger Zone"
                description="High-impact backend operations. Every action requires permission checks, confirmation, reason, and audit log."
              />

              {lifecycleError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {lifecycleError}
                </div>
              ) : null}
              {lifecycleResult ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {lifecycleResult}
                </div>
              ) : null}
              {deleteError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {deleteError}
                </div>
              ) : null}
              {deleteResult ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {deleteResult}
                </div>
              ) : null}

              <section className="rounded-lg border border-rose-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Ban size={17} className="text-rose-600" />
                      <p className="font-semibold text-slate-900">
                        {lifecycleAction === "suspend" ? "Suspend access" : "Restore access"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {lifecycleAction === "suspend"
                        ? "Disables Firebase Auth, revokes refresh tokens, updates Firestore status, and writes audit log."
                        : "Enables Firebase Auth, updates Firestore status, and writes audit log."}
                    </p>
                    {lifecycleBlockedReason ? (
                      <p className="mt-2 text-sm font-semibold text-amber-700">{lifecycleBlockedReason}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openLifecycleModal(lifecycleAction)}
                    disabled={!canRunLifecycleAction}
                    className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      lifecycleAction === "suspend" ? "bg-rose-600" : "bg-emerald-600"
                    }`}
                  >
                    {lifecycleAction === "suspend" ? "Suspend" : "Restore"}
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-rose-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Ban size={17} className="text-rose-600" />
                      <p className="font-semibold text-slate-900">Soft delete</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Default delete path. Disables Auth, revokes tokens, marks status deleted, and keeps the action reversible.
                    </p>
                    {softDeleted ? <p className="mt-2 text-sm font-semibold text-amber-700">This member is already soft deleted.</p> : null}
                    {deleteBlockedReason ? <p className="mt-2 text-sm font-semibold text-amber-700">{deleteBlockedReason}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openDeleteModal("soft_delete")}
                    disabled={!canRunSoftDeleteAction}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Ban size={16} />
                    Soft delete
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-300 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trash2 size={17} className="text-zinc-700" />
                      <p className="font-semibold text-slate-900">Hard delete</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Super admin only. Requires soft delete first, dry run, typed UID or email, second confirmation, snapshot, and audit log.
                    </p>
                    {hardDeleteBlockedReason ? (
                      <p className="mt-2 text-sm font-semibold text-amber-700">{hardDeleteBlockedReason}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openDeleteModal("hard_delete")}
                    disabled={!canRunHardDeleteAction}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-800 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Hard delete
                  </button>
                </div>
              </section>
            </section>
          ) : null}

          {!canViewSensitive && ["security", "audit", "danger"].includes(tab) ? (
            <PanelMessage icon={ShieldCheck} title="Restricted" body="This panel is visible only to authorized admin roles." />
          ) : null}
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
          Signed in as {currentUser?.email || currentUser?.uid || "unknown"}
        </footer>
      </aside>

      {lifecycleModal ? (
        <LifecycleConfirmationModal
          action={lifecycleModal}
          member={member}
          reason={lifecycleReason}
          saving={lifecycleSaving}
          onReasonChange={setLifecycleReason}
          onCancel={() => {
            if (lifecycleSaving) return;
            setLifecycleModal(null);
            setLifecycleReason("");
          }}
          onConfirm={confirmLifecycleAction}
        />
      ) : null}
      {deleteModal ? (
        <DeleteConfirmationModal
          action={deleteModal}
          member={member}
          reason={deleteReason}
          confirmationValue={deleteConfirmationValue}
          secondConfirmationValue={deleteSecondConfirmationValue}
          plan={deleteDryRunPlan}
          saving={deleteSaving}
          onReasonChange={setDeleteReason}
          onConfirmationChange={setDeleteConfirmationValue}
          onSecondConfirmationChange={setDeleteSecondConfirmationValue}
          onCancel={() => {
            if (deleteSaving) return;
            setDeleteModal(null);
            setDeleteReason("");
            setDeleteConfirmationValue("");
            setDeleteSecondConfirmationValue("");
            setDeleteDryRunPlan(null);
          }}
          onDryRun={runHardDeleteDryRun}
          onConfirm={confirmDeleteAction}
        />
      ) : null}
      {learningResetModalOpen ? (
        <LearningResetConfirmationModal
          member={member}
          courseLabel={selectedLearningCourseLabel}
          reason={learningResetReason}
          saving={learningResetSaving}
          onCancel={() => {
            if (learningResetSaving) return;
            setLearningResetModalOpen(false);
          }}
          onConfirm={confirmLearningReset}
        />
      ) : null}
    </div>
  );
}
