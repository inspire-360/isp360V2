import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Loader2,
  RadioTower,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  UserCog,
  Users,
  Wifi,
} from "lucide-react";
import {
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { courseCatalog } from "../data/courseCatalog";
import {
  SOS_COLLECTION,
  SOS_USER_SUBCOLLECTION,
  createTimelineEntry,
  formatCaseNumber,
  formatDateTime,
  getApprovalMeta,
  getCategoryMeta,
  getRiskMeta,
  getStatusMeta,
  mergeSosCases,
  normalizeRiskLevel,
  riskSortValue,
  sosApprovalOptions,
  sosApprovalTone,
  sosRiskTone,
  sosStatusOptions,
  sosStatusTone,
  toUnixTime,
} from "../data/sosConfig";
import {
  getPresenceTimestamp,
  PRESENCE_COLLECTION,
  PRESENCE_TICK_MS,
  resolvePresenceMeta,
} from "../utils/presenceStatus";
import { downloadCsvFile } from "../utils/csvExport";
import { getRoleLabel, normalizeUserRole, userRoleOptions } from "../utils/userRoles";

const resolveCourseMeta = (courseId) =>
  courseCatalog.find((item) => item.id === courseId) || null;

const resolveCompletedLessonsCount = (enrollment = {}) => {
  if (typeof enrollment.completedLessonsCount === "number") return enrollment.completedLessonsCount;
  if (Array.isArray(enrollment.completedLessons)) return enrollment.completedLessons.length;
  return 0;
};

const resolveLessonCount = (enrollment = {}) => {
  if (typeof enrollment.lessonCount === "number" && enrollment.lessonCount > 0) {
    return enrollment.lessonCount;
  }
  const courseId = enrollment.courseId || enrollment.id;
  return resolveCourseMeta(courseId)?.lessonCount || 0;
};

const hasTrackedCompletionCount = (enrollment = {}) =>
  typeof enrollment.completedLessonsCount === "number" || Array.isArray(enrollment.completedLessons);

const resolveProgressPercent = (enrollment = {}) => {
  const lessonCount = resolveLessonCount(enrollment);
  const completedLessonsCount = resolveCompletedLessonsCount(enrollment);
  const countedPercent =
    lessonCount > 0 ? Math.min(100, Math.round((completedLessonsCount / lessonCount) * 100)) : 0;
  const storedPercent =
    typeof enrollment.progressPercent === "number"
      ? Math.max(0, Math.min(100, Math.round(enrollment.progressPercent)))
      : typeof enrollment.progress === "number"
        ? Math.max(0, Math.min(100, Math.round(enrollment.progress)))
        : 0;

  if (lessonCount > 0 && hasTrackedCompletionCount(enrollment)) {
    return Math.max(countedPercent, storedPercent, enrollment.status === "completed" ? 100 : 0);
  }

  if (enrollment.status === "completed") return 100;
  return storedPercent;
};

const buildEnrollmentInsight = (enrollment = {}) => {
  const courseId = enrollment.courseId || enrollment.id || "";
  const courseMeta = resolveCourseMeta(courseId);
  const completedLessonsCount = resolveCompletedLessonsCount(enrollment);
  const lessonCount = resolveLessonCount(enrollment);
  const progressPercent = resolveProgressPercent(enrollment);

  return {
    ...enrollment,
    courseId,
    courseTitle: courseMeta?.title || courseId || "Untitled course",
    completedLessonsCount,
    lessonCount,
    progressPercent,
    activeModuleTitle: enrollment.activeModuleTitle || "",
    activeLessonTitle: enrollment.activeLessonTitle || "",
    activeLessonId: enrollment.activeLessonId || "",
    status: enrollment.status || (progressPercent >= 100 ? "completed" : "active"),
  };
};

const resolveDisplayName = (user = {}) =>
  user.name ||
  [user.prefix, user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
  user.email ||
  "Unknown user";

const buildUserDraft = (user = {}) => ({
  prefix: user.prefix || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  position: user.position || "",
  school: user.school || "",
  role: normalizeUserRole(user.role),
  resetTarget: "all",
});

const buildResetPayload = (operatorName) => {
  const timestamp = serverTimestamp();

  return {
    completedLessons: [],
    completedLessonsCount: 0,
    currentModuleIndex: 0,
    activeModuleIndex: 0,
    activeLessonIndex: 0,
    activeModuleTitle: "",
    activeLessonId: "",
    activeLessonTitle: "",
    missionResponses: {},
    moduleReports: {},
    earnedBadges: [],
    postTestAttempts: 0,
    score: 0,
    progress: 0,
    progressPercent: 0,
    status: "active",
    lastAccess: timestamp,
    lastSavedAt: timestamp,
    resetAt: timestamp,
    resetBy: operatorName,
  };
};

const serializeExportValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((item) => serializeExportValue(item)).filter(Boolean).join(" | ");
  if (value?.seconds) return formatDateTime(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${serializeExportValue(item)}`)
      .filter(Boolean)
      .join(" | ");
  }
  return String(value);
};

const buildMissionResponseRows = (enrollmentRows = []) =>
  enrollmentRows.flatMap((enrollment) => {
    const missionResponses = enrollment.missionResponses || {};

    return Object.entries(missionResponses).flatMap(([missionId, response]) => {
      if (!response || typeof response !== "object") return [];

      return Object.entries(response)
        .filter(([, value]) => value != null && value !== "")
        .map(([field, value]) => ({
          userId: enrollment.userId || "",
          learnerName: enrollment.userName || "",
          courseId: enrollment.courseId || enrollment.id || "",
          courseTitle: enrollment.courseTitle || resolveCourseMeta(enrollment.courseId || enrollment.id)?.title || "",
          missionId,
          field,
          answer: serializeExportValue(value),
          enrollmentStatus: enrollment.status || "",
          lastSavedAt: formatDateTime(enrollment.lastSavedAt || enrollment.lastAccess || enrollment.updatedAt),
        }));
    });
  });

const formatLastSeen = (value) => {
  const unix = getPresenceTimestamp({ lastActive: value, lastSeen: value })?.getTime?.() || 0;
  if (!unix) return "ยังไม่มีข้อมูลสถานะ";

  const diff = Date.now() - unix;
  if (diff < 60_000) return "เมื่อสักครู่";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} นาทีที่แล้ว`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} ชั่วโมงที่แล้ว`;
  return formatDateTime(value);
};

const normalizePainFragment = (value = "") =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`~!@#$%^&*()_+\-=[\]{};:,.<>/?|\\]+|[\s"'`~!@#$%^&*()_+\-=[\]{};:,.<>/?|\\]+$/g, "")
    .trim();

const splitPainPointFragments = (value) => {
  if (typeof value !== "string") return [];

  return value
    .split(/[\n\r,;|/]+/g)
    .map((fragment) => fragment.replace(/\s+/g, " ").trim())
    .filter((fragment) => fragment.length >= 6)
    .map((fragment) => (fragment.length > 60 ? `${fragment.slice(0, 57)}...` : fragment));
};

const collectPainPointSignals = (enrollmentRows = []) => {
  const signals = [];
  const collectAnswerItems = (response = {}) => {
    const partItems =
      response?.parts?.flatMap((part) =>
        (part.items || []).map((item) => ({
          id: item?.id || "",
          answer: item?.answer,
        })),
      ) || [];
    const answerMapItems =
      response?.answers && typeof response.answers === "object"
        ? Object.entries(response.answers).map(([id, answer]) => ({ id, answer }))
        : [];

    return [...partItems, ...answerMapItems].map((item) => ({
      id: item.id,
      answer: typeof item.answer === "string" ? item.answer : String(item.answer || "").trim(),
    }));
  };

  enrollmentRows.forEach((enrollment) => {
    const missionResponses = enrollment.missionResponses || {};

    ["m1-mission-1", "m1-mission-2"].forEach((missionId) => {
      const response = missionResponses[missionId];
      const answers = collectAnswerItems(response);

      answers.forEach((item) => {
        splitPainPointFragments(item?.answer).forEach((fragment) => {
          signals.push({
            text: fragment,
            missionId,
            questionId: item?.id || "",
            userId: enrollment.userId || "",
            courseId: enrollment.courseId || enrollment.id || "",
          });
        });
      });
    });
  });

  return signals;
};

const buildPainPointCloud = (signals = [], limit = 18) => {
  const phraseMap = new Map();

  signals.forEach((signal) => {
    const key = normalizePainFragment(signal.text);
    if (!key || key.length < 6) return;

    const current = phraseMap.get(key) || {
      text: signal.text.trim(),
      count: 0,
      users: new Set(),
      missions: new Set(),
    };

    current.count += 1;
    if (signal.userId) current.users.add(signal.userId);
    if (signal.missionId) current.missions.add(signal.missionId);
    if (signal.text.trim().length < current.text.length) current.text = signal.text.trim();

    phraseMap.set(key, current);
  });

  return [...phraseMap.values()]
    .map((item) => ({
      text: item.text,
      count: item.count,
      userCount: item.users.size,
      weight: item.users.size * 2 + item.count,
    }))
    .sort((left, right) => right.weight - left.weight || right.userCount - left.userCount || right.count - left.count || left.text.localeCompare(right.text))
    .slice(0, limit);
};

export default function AdminConsole() {
  const { currentUser } = useAuth();
  const [usersData, setUsersData] = useState([]);
  const [presenceRows, setPresenceRows] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [userCaseCache, setUserCaseCache] = useState([]);
  const [rootCaseCache, setRootCaseCache] = useState([]);
  const [loadingState, setLoadingState] = useState({
    users: true,
    presence: true,
    enrollments: true,
    sosUser: true,
    sosRoot: true,
  });
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [userDrafts, setUserDrafts] = useState({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [memberPresenceFilter, setMemberPresenceFilter] = useState("all");
  const [memberCourseFilter, setMemberCourseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [savingUserId, setSavingUserId] = useState("");
  const [resettingUserId, setResettingUserId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [listenerSeed, setListenerSeed] = useState(0);
  const [refreshingBoards, setRefreshingBoards] = useState(false);

  const operatorName = currentUser?.displayName || currentUser?.email || "DU Operations";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const markLoaded = (key) =>
      setLoadingState((previous) => (previous[key] ? { ...previous, [key]: false } : previous));

    setLoadingState({
      users: true,
      presence: true,
      enrollments: true,
      sosUser: true,
      sosRoot: true,
    });

    const unsubscribers = [
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setUsersData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          markLoaded("users");
        },
        (error) => {
          console.error("Failed to subscribe users:", error);
          markLoaded("users");
        },
      ),
      onSnapshot(
        collection(db, PRESENCE_COLLECTION),
        (snapshot) => {
          setPresenceRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          markLoaded("presence");
        },
        (error) => {
          console.error("Failed to subscribe presence:", error);
          markLoaded("presence");
        },
      ),
      onSnapshot(
        collectionGroup(db, "enrollments"),
        (snapshot) => {
          setEnrollments(
            snapshot.docs.map((item) => ({
              id: item.id,
              courseId: item.data().courseId || item.id,
              path: item.ref.path,
              userId: item.ref.parent.parent?.id,
              ...item.data(),
            })),
          );
          markLoaded("enrollments");
        },
        (error) => {
          console.error("Failed to subscribe enrollments:", error);
          markLoaded("enrollments");
        },
      ),
      onSnapshot(
        collectionGroup(db, SOS_USER_SUBCOLLECTION),
        (snapshot) => {
          setUserCaseCache(
            snapshot.docs.map((item) => ({
              id: item.id,
              path: item.ref.path,
              requesterId: item.data().requesterId || item.ref.parent.parent?.id,
              ...item.data(),
            })),
          );
          markLoaded("sosUser");
        },
        (error) => {
          console.error("Failed to subscribe SOS cases:", error);
          markLoaded("sosUser");
        },
      ),
      onSnapshot(
        collection(db, SOS_COLLECTION),
        (snapshot) => {
          setRootCaseCache(
            snapshot.docs.map((item) => ({
              id: item.id,
              path: item.ref.path,
              requesterId: item.data().requesterId || "",
              ...item.data(),
            })),
          );
          markLoaded("sosRoot");
        },
        (error) => {
          console.error("Failed to subscribe SOS root cases:", error);
          markLoaded("sosRoot");
        },
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [listenerSeed]);

  const loading = Object.values(loadingState).some(Boolean);

  useEffect(() => {
    if (!loading) setRefreshingBoards(false);
  }, [loading]);
  const cases = useMemo(() => mergeSosCases(userCaseCache, rootCaseCache), [rootCaseCache, userCaseCache]);
  const enrollmentInsights = useMemo(
    () => enrollments.map((item) => buildEnrollmentInsight(item)),
    [enrollments],
  );
  const enrollmentsByUser = useMemo(() => {
    const nextMap = new Map();

    enrollmentInsights.forEach((item) => {
      const bucket = nextMap.get(item.userId) || [];
      bucket.push(item);
      nextMap.set(item.userId, bucket);
    });

    nextMap.forEach((items, userId) => {
      nextMap.set(
        userId,
        [...items].sort((left, right) => {
          const teacherPriority =
            Number((right.courseId || right.id) === "course-teacher") -
            Number((left.courseId || left.id) === "course-teacher");
          if (teacherPriority !== 0) return teacherPriority;
          if (left.progressPercent !== right.progressPercent) {
            return right.progressPercent - left.progressPercent;
          }
          return left.courseTitle.localeCompare(right.courseTitle);
        }),
      );
    });

    return nextMap;
  }, [enrollmentInsights]);
  const presenceMap = useMemo(
    () => new Map(presenceRows.map((item) => [item.uid || item.id, item])),
    [presenceRows],
  );

  useEffect(() => {
    setDrafts((previous) => {
      const nextDrafts = {};

      cases.forEach((caseItem) => {
        nextDrafts[caseItem.id] = {
          status: previous[caseItem.id]?.status || caseItem.status || "new",
          approvalState:
            previous[caseItem.id]?.approvalState || caseItem.approvalState || "pending_review",
          duResponse: previous[caseItem.id]?.duResponse ?? caseItem.duResponse ?? "",
          helpDetails: previous[caseItem.id]?.helpDetails ?? caseItem.helpDetails ?? "",
        };
      });

      return nextDrafts;
    });
  }, [cases]);

  useEffect(() => {
    setUserDrafts((previous) => {
      const nextDrafts = {};

      usersData.forEach((user) => {
        nextDrafts[user.id] = {
          ...buildUserDraft(user),
          ...(previous[user.id] || {}),
        };
      });

      return nextDrafts;
    });
  }, [usersData]);

  useEffect(() => {
    if (selectedUserId && usersData.some((user) => user.id === selectedUserId)) return;
    setSelectedUserId(usersData[0]?.id || "");
  }, [selectedUserId, usersData]);

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...cases]
      .filter((caseItem) => {
        const riskValue = normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency);
        if (statusFilter !== "all" && caseItem.status !== statusFilter) return false;
        if (approvalFilter !== "all" && (caseItem.approvalState || "pending_review") !== approvalFilter) {
          return false;
        }
        if (riskFilter !== "all" && riskValue !== riskFilter) return false;
        if (!keyword) return true;

        const haystack = [
          caseItem.summary,
          caseItem.details,
          caseItem.requesterName,
          caseItem.location,
          ...(caseItem.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((left, right) => {
        const riskGap = riskSortValue(right) - riskSortValue(left);
        if (riskGap !== 0) return riskGap;
        return toUnixTime(right.updatedAt || right.createdAt) - toUnixTime(left.updatedAt || left.createdAt);
      });
  }, [approvalFilter, cases, riskFilter, search, statusFilter]);

  const memberRows = useMemo(() => {
    return usersData
      .map((user) => {
        const presenceRecord = presenceMap.get(user.id) || {};
        const userEnrollments = enrollmentsByUser.get(user.id) || [];
        const spotlightEnrollment =
          userEnrollments.find((item) => (item.courseId || item.id) === "course-teacher") || userEnrollments[0] || null;
        const averageProgress = userEnrollments.length
          ? Math.round(
              userEnrollments.reduce((sum, item) => sum + item.progressPercent, 0) / userEnrollments.length,
            )
          : 0;

        return {
          ...user,
          id: user.id,
          name: resolveDisplayName(user),
          email: user.email || "",
          role: normalizeUserRole(user.role),
          roleLabel: getRoleLabel(user.role),
          presence: resolvePresenceMeta(presenceRecord, now),
          lastSeen: presenceRecord.lastActive || presenceRecord.lastSeen,
          activePath: presenceRecord.activePath || "",
          enrollmentsCount: userEnrollments.length,
          averageProgress,
          spotlightCourseId: spotlightEnrollment?.courseId || spotlightEnrollment?.id || "",
          spotlightCourse: spotlightEnrollment?.courseTitle || "No course yet",
          spotlightProgress: spotlightEnrollment?.progressPercent || 0,
          spotlightCompletedLessonsCount: spotlightEnrollment?.completedLessonsCount || 0,
          spotlightLessonCount: spotlightEnrollment?.lessonCount || 0,
          spotlightStatus: spotlightEnrollment?.status || "active",
          activeModuleTitle: spotlightEnrollment?.activeModuleTitle || "",
          activeLessonTitle: spotlightEnrollment?.activeLessonTitle || "",
        };
      })
      .sort((left, right) => {
        if (left.enrollmentsCount !== right.enrollmentsCount) return right.enrollmentsCount - left.enrollmentsCount;
        if (left.presence.sortWeight !== right.presence.sortWeight) {
          return right.presence.sortWeight - left.presence.sortWeight;
        }
        if (left.averageProgress !== right.averageProgress) return right.averageProgress - left.averageProgress;
        return left.name.localeCompare(right.name);
      });
  }, [enrollmentsByUser, now, presenceMap, usersData]);

  const memberCourseOptions = useMemo(() => {
    const courseMap = new Map();

    memberRows.forEach((user) => {
      if (!user.spotlightCourseId) return;
      if (!courseMap.has(user.spotlightCourseId)) {
        courseMap.set(user.spotlightCourseId, user.spotlightCourse);
      }
    });

    return [...courseMap.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [memberRows]);

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return memberRows.filter((user) => {
      if (memberRoleFilter !== "all" && user.role !== memberRoleFilter) return false;
      if (memberPresenceFilter !== "all" && user.presence.status !== memberPresenceFilter) return false;
      if (memberCourseFilter !== "all" && user.spotlightCourseId !== memberCourseFilter) return false;
      if (!keyword) return true;

      return [
        user.name,
        user.email,
        user.activePath,
        user.spotlightCourse,
        user.activeModuleTitle,
        user.activeLessonTitle,
        user.roleLabel,
        user.school || "",
        user.position || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [memberCourseFilter, memberPresenceFilter, memberRoleFilter, memberRows, memberSearch]);

  const selectedUser = useMemo(
    () => memberRows.find((user) => user.id === selectedUserId) || null,
    [memberRows, selectedUserId],
  );
  const selectedUserDraft = userDrafts[selectedUserId] || buildUserDraft(selectedUser || {});
  const selectedUserEnrollments = useMemo(
    () => enrollmentsByUser.get(selectedUserId) || [],
    [enrollmentsByUser, selectedUserId],
  );
  const memberMap = useMemo(
    () => new Map(memberRows.map((user) => [user.id, user])),
    [memberRows],
  );
  const painPointSignals = useMemo(
    () => collectPainPointSignals(enrollmentInsights),
    [enrollmentInsights],
  );
  const painPointCloud = useMemo(
    () => buildPainPointCloud(painPointSignals, 18),
    [painPointSignals],
  );
  const painPointCloudByUser = useMemo(() => {
    const nextMap = new Map();

    enrollmentsByUser.forEach((items, userId) => {
      nextMap.set(userId, buildPainPointCloud(collectPainPointSignals(items), 8));
    });

    return nextMap;
  }, [enrollmentsByUser]);
  const selectedUserPainPointCloud = painPointCloudByUser.get(selectedUserId) || [];
  const painPointContributorCount = useMemo(
    () => new Set(painPointSignals.map((item) => item.userId).filter(Boolean)).size,
    [painPointSignals],
  );

  const stats = useMemo(() => {
    const presenceSummary = memberRows.reduce(
      (summary, user) => {
        summary[user.presence.status] += 1;
        return summary;
      },
      { online: 0, away: 0, offline: 0 },
    );

    return {
      totalUsers: usersData.length,
      onlineNow: presenceSummary.online,
      awayNow: presenceSummary.away,
      totalEnrollments: enrollmentInsights.length,
      enrolledUsers: new Set(enrollmentInsights.map((item) => item.userId).filter(Boolean)).size,
      pendingReview: cases.filter((item) => (item.approvalState || "pending_review") === "pending_review").length,
      approved: cases.filter((item) => item.approvalState === "approved").length,
      resolvedCases: cases.filter((item) => item.status === "resolved").length,
      openCases: cases.filter((item) => item.status !== "resolved" && item.status !== "removed").length,
      averageProgress: enrollmentInsights.length
        ? Math.round(
            enrollmentInsights.reduce((sum, item) => sum + item.progressPercent, 0) / enrollmentInsights.length,
          )
        : 0,
    };
  }, [cases, enrollmentInsights, memberRows, usersData.length]);

  const coursePulse = useMemo(
    () =>
      courseCatalog.map((course) => {
        const relatedEnrollments = enrollmentInsights.filter((item) => (item.courseId || item.id) === course.id);
        const averageProgress = relatedEnrollments.length
          ? Math.round(
              relatedEnrollments.reduce((sum, item) => sum + item.progressPercent, 0) / relatedEnrollments.length,
            )
          : 0;

        return {
          ...course,
          count: relatedEnrollments.length,
          averageProgress,
        };
      }),
    [enrollmentInsights],
  );

  const progressDistribution = useMemo(
    () => [
      { label: "0%", count: enrollmentInsights.filter((item) => item.progressPercent === 0).length },
      {
        label: "1-25%",
        count: enrollmentInsights.filter((item) => item.progressPercent >= 1 && item.progressPercent <= 25).length,
      },
      {
        label: "26-50%",
        count: enrollmentInsights.filter((item) => item.progressPercent >= 26 && item.progressPercent <= 50).length,
      },
      {
        label: "51-75%",
        count: enrollmentInsights.filter((item) => item.progressPercent >= 51 && item.progressPercent <= 75).length,
      },
      {
        label: "76-100%",
        count: enrollmentInsights.filter((item) => item.progressPercent >= 76 && item.progressPercent <= 100).length,
      },
    ],
    [enrollmentInsights],
  );

  const refreshLiveData = () => {
    setRefreshingBoards(true);
    setListenerSeed((previous) => previous + 1);
  };

  const exportConsoleWorkbook = () => {
    const missionResponseRows = buildMissionResponseRows(
      enrollmentInsights.map((enrollment) => ({
        ...enrollment,
        userName: memberMap.get(enrollment.userId)?.name || "",
      })),
    );

    if (missionResponseRows.length === 0) {
      window.alert("ยังไม่มีข้อมูลคำตอบสำหรับการส่งออก");
      return;
    }

    downloadCsvFile({
      fileName: `คำตอบผู้ใช้งาน-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: "userId", label: "รหัสผู้ใช้" },
        { key: "learnerName", label: "ชื่อผู้ตอบ" },
        { key: "courseId", label: "รหัสหลักสูตร" },
        { key: "courseTitle", label: "ชื่อหลักสูตร" },
        { key: "missionId", label: "รหัสภารกิจ" },
        { key: "field", label: "ฟิลด์คำถาม" },
        { key: "answer", label: "คำตอบ" },
        { key: "enrollmentStatus", label: "สถานะการเรียน" },
        { key: "lastSavedAt", label: "บันทึกล่าสุด" },
      ],
      rows: missionResponseRows,
    });
  };

  const saveCaseUpdate = async (caseItem) => {
    const draft = drafts[caseItem.id];
    if (!draft) return;

    const response = draft.duResponse.trim();
    const helpDetails = draft.helpDetails.trim();
    const statusChanged = draft.status !== caseItem.status;
    const approvalChanged = draft.approvalState !== (caseItem.approvalState || "pending_review");

    if (!response && !helpDetails && !statusChanged && !approvalChanged) return;

    setSavingId(caseItem.id);
    try {
      const payload = {
        status: draft.status,
        approvalState: draft.approvalState,
        duResponse: response,
        helpDetails,
        updatedAt: serverTimestamp(),
        assignedTeam: "DU Ops",
        lastTouchedBy: operatorName,
        updates: arrayUnion(
          createTimelineEntry({
            type: "admin-update",
            by: operatorName,
            message:
              response ||
              helpDetails ||
              `Status ${draft.status} / Approval ${draft.approvalState}`,
            status: draft.status,
            approvalState: draft.approvalState,
          }),
        ),
      };

      const writes = [setDoc(doc(db, SOS_COLLECTION, caseItem.id), payload, { merge: true })];

      if (caseItem.requesterId) {
        writes.push(
          setDoc(doc(db, "users", caseItem.requesterId, SOS_USER_SUBCOLLECTION, caseItem.id), payload, {
            merge: true,
          }),
        );
      }

      const results = await Promise.allSettled(writes);
      if (results.every((result) => result.status !== "fulfilled")) {
        throw new Error("Unable to sync DU response.");
      }
    } catch (error) {
      console.error("Failed to update SOS case:", error);
    } finally {
      setSavingId("");
    }
  };

  const updateUserDraft = (field, value) => {
    if (!selectedUserId) return;

    setUserDrafts((previous) => ({
      ...previous,
      [selectedUserId]: {
        ...(previous[selectedUserId] || buildUserDraft(selectedUser || {})),
        [field]: value,
      },
    }));
  };

  const saveSelectedUser = async () => {
    if (!selectedUser) return;

    const draft = userDrafts[selectedUser.id] || buildUserDraft(selectedUser);
    const fullName = [draft.prefix, draft.firstName, draft.lastName].filter(Boolean).join(" ").trim();

    setSavingUserId(selectedUser.id);
    try {
      await setDoc(
        doc(db, "users", selectedUser.id),
        {
          prefix: draft.prefix.trim(),
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          name: fullName || selectedUser.name,
          position: draft.position.trim(),
          school: draft.school.trim(),
          role: normalizeUserRole(draft.role),
          updatedAt: serverTimestamp(),
          updatedBy: operatorName,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to save user profile:", error);
    } finally {
      setSavingUserId("");
    }
  };

  const resetSelectedUserLearning = async () => {
    if (!selectedUser) return;

    const draft = userDrafts[selectedUser.id] || buildUserDraft(selectedUser);
    const target = draft.resetTarget || "all";
    const targetEnrollments = selectedUserEnrollments.filter(
      (enrollment) =>
        (target === "all" || (enrollment.courseId || enrollment.id) === target),
    );

    if (targetEnrollments.length === 0) return;

    setResettingUserId(selectedUser.id);
    try {
      const batch = writeBatch(db);
      const resetPayload = buildResetPayload(operatorName);

      targetEnrollments.forEach((enrollment) => {
        batch.set(doc(db, enrollment.path), resetPayload, { merge: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Failed to reset learning data:", error);
    } finally {
      setResettingUserId("");
    }
  };

  const statCards = [
    { label: "Users", value: stats.totalUsers, icon: <Users size={18} />, tone: "bg-primary/10 text-primary" },
    {
      label: "Online Now",
      value: stats.onlineNow,
      icon: <Wifi size={18} />,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Away",
      value: stats.awayNow,
      icon: <Clock3 size={18} />,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      label: "Enrolled",
      value: stats.enrolledUsers,
      icon: <BookOpen size={18} />,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      label: "Open SOS",
      value: stats.openCases,
      icon: <AlertTriangle size={18} />,
      tone: "bg-accent/10 text-accent",
    },
    {
      label: "Pending Review",
      value: stats.pendingReview,
      icon: <CheckCircle2 size={18} />,
      tone: "bg-warm/15 text-[#a24619]",
    },
    {
      label: "Avg Progress",
      value: `${stats.averageProgress}%`,
      icon: <BarChart3 size={18} />,
      tone: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]">
              <ShieldCheck size={14} />
              DU Admin Console
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                Friendly operations view for triage, approval, and follow-through
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                ดู pulse ของหลักสูตร คัดลำดับ SOS ตามความเสี่ยง อนุมัติการช่วยเหลือ ส่งคำแนะนำกลับ และติดตามการขยับของแต่ละเคสจากหน้าจอเดียว
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refreshLiveData}
              disabled={refreshingBoards}
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshingBoards ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              รีเฟรชข้อมูลสด
            </button>
            <button
              type="button"
              onClick={exportConsoleWorkbook}
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              <Download size={16} />
              ส่งออกคำตอบเป็น CSV
            </button>
            <Link
              to="/du/sos"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              เปิดศูนย์ SOS
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {statCards.map((card) => (
          <article key={card.label} className="brand-panel p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
              {card.icon}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{card.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(380px,1.14fr)]">
        <section className="space-y-6">
          <article className="hidden brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <UserCog size={14} />
              Member Control
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              Edit roles, profile data, and learning recovery
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Pick a member, filter the live roster, and edit the profile in one place so DU does not need to jump between sections.
            </p>

            <div className="mt-5 rounded-[28px] border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Member workspace</p>
                  <p className="mt-2 text-lg font-semibold text-ink">Live roster with quick filters</p>
                </div>
                <span className="brand-chip border-slate-200 bg-white text-slate-500">
                  {filteredMembers.length} match(es)
                </span>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.6fr))]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search member, role, path, course, or lesson"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <select
                  value={memberRoleFilter}
                  onChange={(event) => setMemberRoleFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                >
                  <option value="all">All roles</option>
                  {userRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={memberPresenceFilter}
                  onChange={(event) => setMemberPresenceFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                >
                  <option value="all">All presence</option>
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="offline">Offline</option>
                </select>
                <select
                  value={memberCourseFilter}
                  onChange={(event) => setMemberCourseFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                >
                  <option value="all">All spotlight courses</option>
                  {memberCourseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1 xl:grid-cols-2">
                {filteredMembers.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-5 text-sm leading-7 text-slate-500 xl:col-span-2">
                    No member matched this filter set.
                  </div>
                ) : (
                  filteredMembers.map((user) => (
                    <button
                      key={`member-workspace-${user.id}`}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        selectedUserId === user.id
                          ? "border-primary/25 bg-primary/5"
                          : "border-slate-200 bg-white hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-ink">{user.name}</p>
                            <span className={`brand-chip ${user.presence.tone}`}>{user.presence.label}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{user.roleLabel} | {user.email || "No email"}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            {user.spotlightCourse} | {user.activeLessonTitle || "No active lesson"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
                          <p className="mt-1 text-xl font-bold text-ink">{user.spotlightProgress}%</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {!selectedUser ? (
              <div className="mt-5 rounded-[26px] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm leading-7 text-slate-500">
                Select a member from the live board above to manage their account.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-ink">{selectedUser.name}</p>
                        <span className={`brand-chip ${selectedUser.presence.tone}`}>{selectedUser.presence.label}</span>
                        <span className="brand-chip border-slate-200 bg-white text-slate-500">
                          {selectedUser.spotlightStatus === "completed" ? "Completed" : "Active"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{selectedUser.email || "No email"}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedUser.spotlightCourse} | {selectedUser.activeModuleTitle || "No active module"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {selectedUser.spotlightCompletedLessonsCount}/{selectedUser.spotlightLessonCount || 0} lessons completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Average progress</p>
                      <p className="mt-2 text-2xl font-bold text-ink">{selectedUser.averageProgress}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {selectedUserEnrollments.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-5 text-sm leading-7 text-slate-500 xl:col-span-2">
                      No enrollment data yet for this member.
                    </div>
                  ) : (
                    selectedUserEnrollments.map((enrollment) => (
                      <div key={enrollment.path || `${selectedUser.id}-${enrollment.courseId}`} className="rounded-[26px] border border-slate-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{enrollment.courseTitle}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {enrollment.activeModuleTitle || "Waiting module"} | {enrollment.activeLessonTitle || "No active lesson"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
                            <p className="mt-1 text-xl font-bold text-ink">{enrollment.progressPercent}%</p>
                          </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                            style={{ width: `${enrollment.progressPercent}%` }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                          <span>
                            {enrollment.completedLessonsCount}/{enrollment.lessonCount || 0} lessons
                          </span>
                          <span>{enrollment.status === "completed" ? "Completed" : "In progress"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pain point focus</p>
                      <p className="mt-2 text-lg font-semibold text-ink">คำที่ผู้เรียนพูดถึงบ่อยจาก mission ต่าง ๆ</p>
                    </div>
                    <span className="brand-chip border-slate-200 bg-white text-slate-500">
                      {selectedUserPainPointCloud.length} signal(s)
                    </span>
                  </div>
                  {selectedUserPainPointCloud.length === 0 ? (
                    <p className="mt-4 text-sm leading-7 text-slate-500">
                      ยังไม่มี pain point ที่สกัดได้จากคำตอบ mission ของผู้เรียนคนนี้
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedUserPainPointCloud.map((item) => (
                        <span
                          key={`${selectedUser.id}-${item.text}`}
                          className={`max-w-full break-words rounded-full border px-3 py-2 font-semibold ${
                            item.weight >= 6
                              ? "border-primary/20 bg-primary/10 text-base text-primary"
                              : "border-slate-200 bg-white text-sm text-slate-700"
                          }`}
                        >
                          {item.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>Prefix</span>
                    <input
                      value={selectedUserDraft.prefix}
                      onChange={(event) => updateUserDraft("prefix", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>Role</span>
                    <select
                      value={selectedUserDraft.role}
                      onChange={(event) => updateUserDraft("role", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    >
                      {userRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>First name</span>
                    <input
                      value={selectedUserDraft.firstName}
                      onChange={(event) => updateUserDraft("firstName", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>Last name</span>
                    <input
                      value={selectedUserDraft.lastName}
                      onChange={(event) => updateUserDraft("lastName", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>Position</span>
                    <input
                      value={selectedUserDraft.position}
                      onChange={(event) => updateUserDraft("position", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>School</span>
                    <input
                      value={selectedUserDraft.school}
                      onChange={(event) => updateUserDraft("school", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>Reset target</span>
                  <select
                    value={selectedUserDraft.resetTarget}
                    onChange={(event) => updateUserDraft("resetTarget", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="all">All enrollments</option>
                    {selectedUserEnrollments.map((enrollment) => {
                      const courseKey = enrollment.courseId || enrollment.id;
                      return (
                        <option key={courseKey} value={courseKey}>
                          {enrollment.courseTitle}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={saveSelectedUser}
                    disabled={savingUserId === selectedUser.id}
                    className="brand-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingUserId === selectedUser.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save profile
                  </button>
                  <button
                    type="button"
                    onClick={resetSelectedUserLearning}
                    disabled={resettingUserId === selectedUser.id}
                    className="brand-button-secondary w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    {resettingUserId === selectedUser.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={18} />
                    )}
                    Reset learning
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
                  <UserCog size={14} />
                  Member Control
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">Member management moved out</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  เปิดหน้าเฉพาะสำหรับจัดการสมาชิก, รีเซ็ตการเรียน, และดู pain point จาก Module 1 Mission 1-2 โดยไม่ต้องเบียดกับ SOS queue
                </p>
              </div>
              <Link to="/du/members" className="brand-button-secondary">
                Open Member Control
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </article>

          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                  <Activity size={14} />
                  Course Pulse
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">ภาพรวมการใช้งานหลักสูตร</h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resolved SOS</p>
                <p className="text-2xl font-bold text-ink">{stats.resolvedCases}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.75fr)]">
              <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Presence mix</p>
                    <p className="mt-2 text-lg font-semibold text-ink">Live online and away users</p>
                  </div>
                  <span className="brand-chip border-slate-200 bg-white text-slate-500">
                    {stats.totalUsers} users
                  </span>
                </div>
                <div className="mt-5 overflow-hidden rounded-full bg-slate-200">
                  <div className="flex h-3 w-full">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${stats.totalUsers ? (stats.onlineNow / stats.totalUsers) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-amber-400"
                      style={{ width: `${stats.totalUsers ? (stats.awayNow / stats.totalUsers) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-slate-300"
                      style={{
                        width: `${stats.totalUsers ? ((stats.totalUsers - stats.onlineNow - stats.awayNow) / stats.totalUsers) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Online</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.onlineNow}</p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Away</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">{stats.awayNow}</p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Avg progress</p>
                    <p className="mt-2 text-2xl font-bold text-ink">{stats.averageProgress}%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress distribution</p>
                <div className="mt-4 space-y-3">
                  {progressDistribution.map((bucket) => {
                    const maxCount = Math.max(1, ...progressDistribution.map((item) => item.count));
                    return (
                      <div key={bucket.label}>
                        <div className="mb-1.5 flex items-center justify-between text-sm text-slate-500">
                          <span>{bucket.label}</span>
                          <span>{bucket.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                            style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pain Point Word Cloud</p>
                  <p className="mt-2 text-sm text-slate-500">Source: Module 1 Mission 1 and Mission 2 answers</p>
                  <p className="mt-2 text-lg font-semibold text-ink">
                    ภาพรวม pain point ที่ผู้เรียนสะท้อนผ่าน mission
                  </p>
                </div>
                <span className="brand-chip border-slate-200 bg-white text-slate-500">
                  {painPointContributorCount} users
                </span>
              </div>

              {painPointCloud.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  ยังไม่มี pain point ที่สกัดได้จากคำตอบ mission ของผู้เรียนในตอนนี้
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {painPointCloud.map((item, index) => (
                    <span
                      key={`${item.text}-${index}`}
                      className={`max-w-full break-words rounded-full border px-3 py-2 font-semibold ${
                        item.weight >= 8
                          ? "border-primary/20 bg-primary/10 text-base text-primary"
                          : item.weight >= 5
                            ? "border-secondary/20 bg-secondary/10 text-sm text-secondary"
                            : "border-slate-200 bg-white text-sm text-slate-700"
                      }`}
                    >
                      {item.text}
                      <span className="ml-2 text-xs font-medium opacity-70">{item.userCount}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {coursePulse.map((course) => (
                <div key={course.id} className="overflow-hidden rounded-[28px] border border-slate-100 bg-white">
                  <div className={`h-2 bg-gradient-to-r ${course.gradientClass}`} />
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-lg font-semibold text-ink">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.missionCount} mission checkpoints | Avg progress {course.averageProgress}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Enrollments</p>
                      <p className="mt-2 text-3xl font-bold text-ink">{course.count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-accent/10 bg-accent/5 text-accent">
                  <Users size={14} />
                  Online Pulse
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">ติดตามความก้าวหน้าของผู้ใช้แบบ real-time</h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tracked users</p>
                <p className="text-2xl font-bold text-ink">{filteredMembers.length}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.6fr))]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
                <input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search member, course, lesson, role, or path"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                />
              </label>
              <select
                value={memberRoleFilter}
                onChange={(event) => setMemberRoleFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All roles</option>
                {userRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={memberPresenceFilter}
                onChange={(event) => setMemberPresenceFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All presence</option>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
              <select
                value={memberCourseFilter}
                onChange={(event) => setMemberCourseFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All spotlight courses</option>
                {memberCourseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-6 text-sm leading-7 text-slate-500">
                  ยังไม่มีข้อมูลผู้ใช้หรือ enrollment สำหรับแสดง progress ในมุมมองนี้
                </div>
              ) : (
                filteredMembers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full rounded-[26px] border p-4 text-left transition ${
                      selectedUserId === user.id
                        ? "border-primary/25 bg-primary/5"
                        : "border-slate-100 bg-white hover:border-primary/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{user.name}</p>
                          <span
                            className={`brand-chip ${user.presence.tone}`}
                          >
                            {user.presence.label}
                          </span>
                          <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                            {user.roleLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{user.email || "ไม่มีอีเมล"}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {user.spotlightCourse} | {user.activeModuleTitle || "รอเริ่มโมดูล"}
                        </p>
                        {user.activePath ? (
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            เส้นทางล่าสุด: {user.activePath}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ความคืบหน้าหลักสูตร</p>
                        <p className="mt-2 text-2xl font-bold text-ink">{user.spotlightProgress}%</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {user.spotlightCompletedLessonsCount}/{user.spotlightLessonCount || 0} บทเรียน
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                        style={{ width: `${user.spotlightProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{user.activeLessonTitle || "ยังไม่มีบทเรียนที่กำลังเปิด"}</span>
                      <span>
                        ใช้งานล่าสุด {formatLastSeen(user.lastSeen)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <RadioTower size={14} />
              DU Playbook
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">วิธีใช้ console นี้ให้ตอบเร็วและช่วยได้จริง</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>1. เปิดดูเคสที่สีเข้มและยัง Pending Review ก่อนเสมอ</p>
              <p>2. เปลี่ยน approval ให้ชัด แล้วส่ง DU response แบบที่ผู้ใช้เอาไปทำต่อได้ทันที</p>
              <p>3. ถ้าต้องการข้อมูลเพิ่ม ให้ใช้ Need More Info พร้อมคำถามที่เจาะจงแทนข้อความกว้างๆ</p>
            </div>
          </article>
        </section>

        <section className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="brand-chip border-accent/10 bg-accent/5 text-accent">
                <AlertTriangle size={14} />
                Priority Queue
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">เคสที่ DU ต้องติดตาม</h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Queue size</p>
              <p className="text-2xl font-bold text-ink">{filteredCases.length}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาจากหัวข้อ ผู้ใช้ สถานที่ หรือแท็ก"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All status</option>
              {sosStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All approval</option>
              {sosApprovalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All risk</option>
              {[...new Set(cases.map((item) => normalizeRiskLevel(item.riskLevel || item.urgency)))].map((risk) => (
                <option key={risk} value={risk}>
                  {getRiskMeta(risk).label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50/80 p-8 text-center">
              <Filter className="mx-auto text-slate-300" size={30} />
              <h3 className="mt-4 text-xl font-semibold text-ink">No active cases in this view</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                ลองปรับ filter หรือค้นหาด้วยคำอื่นเพื่อดูเคสที่ต้องการ
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredCases.map((caseItem) => {
                const draft = drafts[caseItem.id] || {};
                const riskMeta = getRiskMeta(normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency));
                const categoryMeta = getCategoryMeta(caseItem.category);
                const statusMeta = getStatusMeta(caseItem.status);
                const approvalMeta = getApprovalMeta(caseItem.approvalState);
                const requesterContext = memberMap.get(caseItem.requesterId) || null;
                const requesterEnrollments = enrollmentsByUser.get(caseItem.requesterId) || [];
                const requesterSpotlight =
                  requesterEnrollments.find((item) => item.courseId === "course-teacher") ||
                  requesterEnrollments[0] ||
                  null;
                const requesterPainPointCloud = painPointCloudByUser.get(caseItem.requesterId) || [];
                const updates = [...(caseItem.updates || [])].sort(
                  (left, right) => toUnixTime(right.at) - toUnixTime(left.at),
                );
                const latestUpdate = updates[0];

                return (
                  <article key={caseItem.id} className="overflow-hidden rounded-[30px] border border-slate-100 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                            {formatCaseNumber(caseItem.id)}
                          </span>
                          <span
                            className={`brand-chip ${sosRiskTone[riskMeta.value]}`}
                            style={{ background: riskMeta.tone.includes("border-transparent") ? riskMeta.colors[0] : undefined }}
                          >
                            {riskMeta.label}
                          </span>
                          <span className={`brand-chip ${sosApprovalTone[approvalMeta.value]}`}>{approvalMeta.label}</span>
                          <span className={`brand-chip ${sosStatusTone[statusMeta.value]}`}>{statusMeta.label}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-ink">{caseItem.summary}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {caseItem.requesterName || "Unknown requester"} | {categoryMeta.label}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatDateTime(caseItem.updatedAt || caseItem.createdAt)}</p>
                        <p className="mt-1">{caseItem.location || "No location"}</p>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.84fr)_minmax(280px,0.76fr)]">
                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current context</p>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{caseItem.details}</p>
                          {(caseItem.tags || []).length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {(caseItem.tags || []).map((tag) => (
                                <span key={tag} className="brand-chip border-slate-200 bg-white text-slate-500">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {requesterContext && requesterSpotlight ? (
                          <div className="rounded-[26px] border border-secondary/10 bg-secondary/5 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-secondary/70">Learner context</p>
                                <p className="mt-2 text-lg font-semibold text-ink">{requesterSpotlight.courseTitle}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {requesterSpotlight.activeModuleTitle || "Waiting module"} | {requesterSpotlight.activeLessonTitle || "No active lesson"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
                                <p className="mt-1 text-2xl font-bold text-ink">{requesterSpotlight.progressPercent}%</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {requesterSpotlight.completedLessonsCount}/{requesterSpotlight.lessonCount || 0} lessons
                                </p>
                              </div>
                            </div>
                            {requesterPainPointCloud.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {requesterPainPointCloud.slice(0, 4).map((item) => (
                                  <span
                                    key={`${caseItem.id}-${item.text}`}
                                    className="max-w-full break-words rounded-full border border-white bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                                  >
                                    {item.text}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {latestUpdate ? (
                          <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-primary/60">Latest timeline note</p>
                            <p className="mt-3 text-sm font-semibold text-ink">{latestUpdate.by}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">{latestUpdate.message}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4 rounded-[26px] border border-slate-100 bg-slate-50/70 p-4">
                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Status</span>
                          <select
                            value={draft.status || caseItem.status || "new"}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], status: event.target.value },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          >
                            {sosStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Approval</span>
                          <select
                            value={draft.approvalState || caseItem.approvalState || "pending_review"}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: {
                                  ...previous[caseItem.id],
                                  approvalState: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          >
                            {sosApprovalOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>DU response to user</span>
                          <textarea
                            rows={4}
                            value={draft.duResponse ?? ""}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], duResponse: event.target.value },
                              }))
                            }
                            placeholder="ตอบกลับแบบสั้น ชัด และใช้งานต่อได้"
                            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Helpful details / next steps</span>
                          <textarea
                            rows={5}
                            value={draft.helpDetails ?? ""}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], helpDetails: event.target.value },
                              }))
                            }
                            placeholder="ใส่คำแนะนำ ขั้นตอนช่วยเหลือ หรือสิ่งที่ผู้ใช้ควรเตรียม"
                            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => saveCaseUpdate(caseItem)}
                          disabled={savingId === caseItem.id}
                          className="brand-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingId === caseItem.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                          Save DU response
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
