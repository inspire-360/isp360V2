export const courseCatalog = [
  {
    id: "course-teacher",
    title: "InSPIRE for Teacher",
    shortTitle: "Teacher Lab",
    eyebrow: "Flagship Cohort",
    audience: "For educators and school leaders",
    description:
      "A guided five-module sprint for teachers who want to design stronger learning experiences and apply design thinking in daily practice.",
    modules: 5,
    hours: 20,
    iconName: "BookOpen",
    requiresCode: true,
    accessCode: "TEACHER360",
    path: "/course/teacher/module1",
    accessLabel: "Private cohort access",
    outcomes: [
      "Structured learning journey with milestone activities",
      "Practical design-thinking missions for classroom use",
      "Progress tracking that keeps every module visible",
    ],
    theme: {
      line: "bg-sky-400/45",
      ring: "ring-sky-300/25",
      glow: "from-sky-500/18 via-sky-500/5 to-transparent",
      chip: "border-sky-300/25 bg-sky-400/10 text-sky-200",
      iconWrap: "bg-sky-400/12 text-sky-200",
      button: "bg-sky-400 text-slate-950 hover:bg-sky-300",
      text: "text-sky-200",
      subtle: "text-sky-100/70",
    },
  },
  {
    id: "course-student",
    title: "InSPIRE for Student",
    shortTitle: "Student Space",
    eyebrow: "Open Learning Space",
    audience: "For student exploration and wellbeing",
    description:
      "An open learning environment that connects curiosity, creativity, and wellbeing into one calm digital space for students.",
    modules: 8,
    hours: 12,
    iconName: "Layout",
    requiresCode: false,
    accessCode: "",
    path: "/course/student",
    accessLabel: "Open access",
    outcomes: [
      "Low-friction access for student discovery",
      "A lighter, happier space that complements the teacher pathway",
      "Designed to keep navigation simple on mobile",
    ],
    theme: {
      line: "bg-emerald-400/45",
      ring: "ring-emerald-300/25",
      glow: "from-emerald-500/18 via-emerald-500/5 to-transparent",
      chip: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
      iconWrap: "bg-emerald-400/12 text-emerald-200",
      button: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
      text: "text-emerald-200",
      subtle: "text-emerald-100/70",
    },
  },
  {
    id: "course-ai",
    title: "AI & Innovation",
    shortTitle: "AI Era",
    eyebrow: "Next Release",
    audience: "For future-facing digital teaching practice",
    description:
      "A coming-soon track focused on AI fluency, classroom experimentation, and practical innovation for the next generation of learning.",
    modules: 4,
    hours: 10,
    iconName: "Zap",
    requiresCode: false,
    accessCode: "",
    path: "/course/ai-era",
    accessLabel: "Preview access",
    outcomes: [
      "Foundations for AI-enhanced teaching practice",
      "Clear framing for experimentation and ethics",
      "A runway for future platform expansions",
    ],
    theme: {
      line: "bg-amber-300/55",
      ring: "ring-amber-300/25",
      glow: "from-amber-400/18 via-amber-400/5 to-transparent",
      chip: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      iconWrap: "bg-amber-300/12 text-amber-100",
      button: "bg-amber-300 text-slate-950 hover:bg-amber-200",
      text: "text-amber-100",
      subtle: "text-amber-50/70",
    },
  },
];

export const courseCatalogById = Object.fromEntries(
  courseCatalog.map((course) => [course.id, course]),
);

export const platformSignals = [
  { label: "Teacher cohorts", value: "5,000+" },
  { label: "Partner schools", value: "100+" },
  { label: "Active pathways", value: "3" },
];

export const landingWorkflow = [
  {
    title: "Enter with the right identity",
    description:
      "Support email, Google, and LINE sign-in so educators and learners can start from the path that matches their context.",
  },
  {
    title: "Unlock the right learning room",
    description:
      "Use access-controlled spaces for private cohorts and open spaces when the learning experience should feel lighter and broader.",
  },
  {
    title: "Operate from one calm workspace",
    description:
      "Track enrollments, progress, live cohort signals, and profile details without bouncing between disconnected layouts.",
  },
];

export const operatorNotes = [
  "The workspace is designed to read cleanly on mobile and desktop.",
  "Course metadata now stays consistent across landing, dashboard, and my courses.",
  "Access-code protected rooms keep private cohorts separate without complicating the UI.",
];

export const getCourseById = (courseId) => courseCatalogById[courseId];
