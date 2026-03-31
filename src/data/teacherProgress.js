export function createInitialTeacherEnrollment(overrides = {}) {
  return {
    enrolledAt: overrides.enrolledAt || new Date(),
    status: overrides.status || "active",
    currentModuleIndex: overrides.currentModuleIndex || 0,
    completedLessons: overrides.completedLessons || [],
    responses: overrides.responses || {},
    quizResults: overrides.quizResults || {},
    badges: overrides.badges || [],
    finalExamAttempts: overrides.finalExamAttempts || 0,
    finalExamLockedUntil: overrides.finalExamLockedUntil || null,
    lastAccess: overrides.lastAccess || new Date(),
  };
}

export function normalizeTeacherEnrollment(data = {}) {
  return createInitialTeacherEnrollment({
    ...data,
    enrolledAt: data.enrolledAt?.toDate ? data.enrolledAt.toDate() : data.enrolledAt,
    lastAccess: data.lastAccess?.toDate ? data.lastAccess.toDate() : data.lastAccess,
    finalExamLockedUntil: data.finalExamLockedUntil?.toDate
      ? data.finalExamLockedUntil.toDate()
      : data.finalExamLockedUntil,
  });
}
