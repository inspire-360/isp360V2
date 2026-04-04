const checkpointProfile = ({ arc, xp, reward, badge, objective }) => ({
  arc,
  xp,
  reward,
  badge,
  objective,
  difficulty: "Checkpoint",
  checkpoints: [],
});

const missionProfile = ({
  arc,
  xp,
  reward,
  badge,
  objective,
  deliverable,
  duSignal,
  checkpoints,
  difficulty = "Heroic",
}) => ({
  arc,
  xp,
  reward,
  badge,
  objective,
  deliverable,
  duSignal,
  difficulty,
  checkpoints,
});

export const MODULE_FOUR_BADGE = "In-Innovation Badge";
export const MODULE_FOUR_REPORT_KEY = "module4";
export const MODULE_FOUR_UNLOCK_TITLE = "Module 5: RE - Reflection";

export const generateModuleFourCardSerial = (
  uid = "USER",
  generatedAt = new Date().toISOString(),
) => {
  const safeUid =
    String(uid || "USER")
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(-6) || "USER04";
  const stamp = new Date(generatedAt);
  const dateCode = Number.isNaN(stamp.getTime())
    ? "00000000"
    : [
        stamp.getFullYear(),
        String(stamp.getMonth() + 1).padStart(2, "0"),
        String(stamp.getDate()).padStart(2, "0"),
      ].join("");

  return `INNOV-${dateCode}-${safeUid}`;
};

export const moduleFourStages = [
  {
    step: 1,
    label: "Step 1",
    title: "Innovation Lab",
    helper: "Mix one tool with one active-learning move to create a stronger innovation formula.",
  },
  {
    step: 2,
    label: "Step 2",
    title: "Blueprint",
    helper: "Turn the idea into a lean one-page lesson flow with Hook, Action, and Reflect.",
  },
  {
    step: 3,
    label: "Step 3",
    title: "Crafting",
    helper: "Build the real classroom asset that will carry the innovation into practice.",
  },
  {
    step: 4,
    label: "Step 4",
    title: "Beta Test",
    helper: "Test the prototype with a small audience and capture what works and what to improve.",
  },
  {
    step: 5,
    label: "Step 5",
    title: "Post-test",
    helper: "Confirm readiness, lock in the evidence, and unlock the reflection module.",
  },
];

export const moduleFourPreTestQuestions = [
  {
    id: "module4-pretest-1",
    question:
      "In Mission 1, the heart of innovation is to combine which two things to solve the teacher's pain point?",
    options: [
      "A tool and an active-learning strategy",
      "A budget request and a staff meeting",
      "A test score and a behavior log",
      "A poster and a timetable only",
    ],
    correctAnswer: 0,
  },
  {
    id: "module4-pretest-2",
    question:
      "Which part of the one-page blueprint focuses on learners using the innovation in an active-learning experience?",
    options: ["Hook", "Action", "Reflect", "Title block"],
    correctAnswer: 1,
  },
  {
    id: "module4-pretest-3",
    question:
      "If the innovation is a physical teaching aid, what should the teacher submit in Mission 3?",
    options: [
      "Only the name of the tool",
      "A photo plus a short explanation of classroom use",
      "Only a PDF template",
      "Only a student attendance sheet",
    ],
    correctAnswer: 1,
  },
  {
    id: "module4-pretest-4",
    question: "Why does Mission 4 require a beta test before full classroom use?",
    options: [
      "To find strengths and improvement points before the real rollout",
      "To skip reflection",
      "To replace the lesson plan",
      "To avoid using feedback",
    ],
    correctAnswer: 0,
  },
  {
    id: "module4-pretest-5",
    question: "How many points are needed to pass the Module 4 post-test?",
    options: ["1 point", "2 points", "3 points", "5 points"],
    correctAnswer: 2,
  },
];

export const innovationToolOptions = [
  { id: "canva", label: "Canva / Presentation Studio" },
  { id: "quiz-app", label: "Quiz App / Instant Response Tool" },
  { id: "video-clip", label: "Short Video / Story Clip" },
  { id: "podcast", label: "Podcast / Audio Story" },
  { id: "worksheet", label: "Interactive Worksheet" },
  { id: "board-game", label: "Handmade Board Game" },
  { id: "qr-station", label: "QR / Learning Station Set" },
  { id: "ai-assistant", label: "AI Assistant / Prompt Tool" },
  { id: "community-kit", label: "Community Artifact / Local Resource Kit" },
];

export const activeLearningOptions = [
  { id: "roleplay", label: "Roleplay" },
  { id: "project-based", label: "Project-Based Learning" },
  { id: "problem-based", label: "Problem-Based Learning" },
  { id: "gamification", label: "Gamification" },
  { id: "inquiry", label: "Inquiry-Based Learning" },
  { id: "station-rotation", label: "Station Rotation" },
  { id: "discussion", label: "Discussion / Debate" },
  { id: "experiential", label: "Experiential Learning" },
];

const moduleFourMentor = {
  pretest: {
    intro:
      "AI Mentor: Before we open the innovation forge, let's check your readiness. This module is about turning ideas into prototype-ready classroom innovation, not just collecting flashy tools.",
    reward: "Innovation gate cleared",
  },
  briefing: {
    intro:
      "AI Mentor: Great innovation is not technology alone. It comes from matching the right tool with the right learning move so the classroom experience feels purposeful, active, and possible in your real context.",
    reward: "Forge map unlocked",
  },
  missionOne: {
    intro:
      "AI Mentor: Start with a clear formula. Pick one tool and one pedagogy move, then name the innovation so people can remember it and immediately see why it matters.",
    reward: "Formula forged",
  },
  missionTwo: {
    intro:
      "AI Mentor: Keep the blueprint lean. If another teacher can read it in one glance and picture the lesson flow, your plan is clear enough to build from.",
    reward: "Blueprint framed",
  },
  missionThree: {
    intro:
      "AI Mentor: This is where the idea becomes tangible. Build the real asset and make sure you can explain exactly how it supports learners during the lesson.",
    reward: "Artifact crafted",
  },
  missionFour: {
    intro:
      "AI Mentor: Test early, improve early. A small beta test gives you fast evidence about what already works and what needs a Version 2.0 before the full classroom launch.",
    reward: "Prototype tuned",
  },
  posttest: {
    intro:
      "AI Mentor: Finish strong. The post-test confirms that your innovation is now structured, testable, and ready to move into evidence-based reflection in the next module.",
    reward: "Innovation badge ready",
  },
};

export const moduleFourModuleMeta = {
  title: "Module 4: I - Innovation : ก้าวสู่ความพร้อม จุดประกายนวัตกรรม",
  description:
    "ออกแบบนวัตกรรมการเรียนรู้ที่เชื่อมเครื่องมือเข้ากับ pedagogy อย่างมีความหมาย สร้าง blueprint แบบ lean พัฒนาสื่อจริง ทดลองใช้ และเก็บบทเรียนก่อนนำไปใช้เต็มรูปแบบ",
  campaignName: "Innovation Forge",
};

export const moduleFourLessons = [
  {
    id: "m4-pretest",
    title: "4.0 Pre-test: Innovation Readiness Check",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPretest: true,
      passScore: 0,
      questionsCount: 5,
      questions: moduleFourPreTestQuestions,
      aiMentor: moduleFourMentor.pretest,
      description:
        "Check your readiness for the innovation module before opening the Canva lesson deck and the 4-step prototype workflow.",
      gamification: checkpointProfile({
        arc: "Forge Gate",
        xp: 70,
        reward: "Innovation lesson deck access",
        badge: "Forge Scout",
        objective:
          "Clear the entry checkpoint and unlock the innovation lesson deck plus the prototype mission map.",
      }),
    },
  },
  {
    id: "m4-lesson-brief",
    title: "4.1 I-Innovation Lesson Brief",
    type: "video",
    iconName: "PlayCircle",
    content: {
      videoUrl:
        "https://www.canva.com/design/DAHFgi56U6Q/zlELbaa9zOznNXxcgepZdQ//watch?embed",
      frameLabel: "I-Innovation Lesson Deck",
      externalUrl:
        "https://www.canva.com/design/DAHFgi56U6Q/zlELbaa9zOznNXxcgepZdQ//watch?embed",
      description:
        "Review the innovation lesson deck after the pre-test, then move into formula design, blueprinting, crafting, and beta testing.",
      campaignStep: 1,
      campaignStages: moduleFourStages,
      aiMentor: moduleFourMentor.briefing,
      gamification: checkpointProfile({
        arc: "Forge Briefing",
        xp: 80,
        reward: "Innovation deck + mission map",
        badge: "Prototype Seeker",
        objective:
          "Understand the innovation process before you start building a classroom-ready prototype.",
      }),
    },
  },
  {
    id: "m4-mission-1",
    title: "Mission 1: Innovation Lab",
    type: "activity",
    activityType: "module4_innovation_lab",
    iconName: "Zap",
    content: {
      missionKey: "missionOne",
      campaignStep: 1,
      campaignStages: moduleFourStages,
      aiMentor: moduleFourMentor.missionOne,
      toolOptions: innovationToolOptions,
      activeLearningOptions,
      gamification: missionProfile({
        arc: "Innovation Lab",
        xp: 210,
        reward: "Formula card + prototype spark",
        badge: "Idea Mixer",
        objective:
          "Pair one tool with one active-learning strategy to create an innovation formula that answers a real pain point and target goal.",
        deliverable:
          "A named innovation formula with selected tool, pedagogy move, pain point, and intended goal.",
        duSignal:
          "DU can see what kind of innovation support, media suggestion, or coaching partner would strengthen your prototype early.",
        checkpoints: [
          "Select one tool or define a custom tool",
          "Match it with one active-learning move",
          "Name the innovation and connect it to a real classroom pain point",
        ],
      }),
    },
  },
  {
    id: "m4-mission-2",
    title: "Mission 2: The Master Blueprint",
    type: "activity",
    activityType: "module4_master_blueprint",
    iconName: "Layout",
    content: {
      missionKey: "missionTwo",
      campaignStep: 2,
      campaignStages: moduleFourStages,
      aiMentor: moduleFourMentor.missionTwo,
      gamification: missionProfile({
        arc: "Blueprint Studio",
        xp: 220,
        reward: "One-page blueprint unlock",
        badge: "Lesson Architect",
        objective:
          "Translate the innovation formula into a lean Hook-Action-Reflect blueprint that shows exactly what will happen in one class period.",
        deliverable:
          "A one-page blueprint summary plus an upload link for the lesson plan file.",
        duSignal:
          "DU can quickly review the lesson flow, facilitation role, and context connection without reading a long lesson-plan document.",
        checkpoints: [
          "Design a strong 5-minute Hook",
          "Explain how learners use the innovation during Action time",
          "Show how Reflect time links to life, SEZ, or future skills",
        ],
      }),
    },
  },
  {
    id: "m4-mission-3",
    title: "Mission 3: Crafting Session",
    type: "activity",
    activityType: "module4_crafting_session",
    iconName: "PenTool",
    content: {
      missionKey: "missionThree",
      campaignStep: 3,
      campaignStages: moduleFourStages,
      aiMentor: moduleFourMentor.missionThree,
      gamification: missionProfile({
        arc: "Crafting Session",
        xp: 230,
        reward: "Artifact build complete",
        badge: "Prototype Builder",
        objective:
          "Build the real teaching asset that will be used with the blueprint, whether digital or physical.",
        deliverable:
          "A working artifact link or image evidence with a short explanation of classroom use.",
        duSignal:
          "DU can identify whether your prototype is digital, physical, or hybrid and match the right technical or material support.",
        checkpoints: [
          "Name the artifact clearly",
          "Submit the digital link or physical media evidence",
          "Explain how the artifact works inside the lesson",
        ],
      }),
    },
  },
  {
    id: "m4-mission-4",
    title: "Mission 4: The Beta Test",
    type: "activity",
    activityType: "module4_beta_test",
    iconName: "CheckSquare",
    content: {
      missionKey: "missionFour",
      campaignStep: 4,
      campaignStages: moduleFourStages,
      aiMentor: moduleFourMentor.missionFour,
      gamification: missionProfile({
        arc: "Beta Test",
        xp: 200,
        reward: "Prototype feedback cache",
        badge: "Version Tuner",
        objective:
          "Run a lightweight test with peers or a small learner group, then capture the biggest strength and the most important upgrade path.",
        deliverable:
          "Short reflection answers about the strongest point of the innovation and the Version 2.0 upgrade target.",
        duSignal:
          "DU can see how test feedback is shaping the prototype before the real classroom deployment.",
        checkpoints: [
          "Test the prototype with a peer teacher or a small student group",
          "Identify the strongest working element",
          "Name the most useful Version 2.0 improvement",
        ],
      }),
    },
  },
  {
    id: "m4-posttest",
    title: "Post-test: Innovation Readiness Checkpoint",
    type: "quiz",
    iconName: "CheckSquare",
    content: {
      isPosttest: true,
      passScore: 3,
      maxAttempts: 5,
      questionsCount: 5,
      questions: moduleFourPreTestQuestions,
      aiMentor: moduleFourMentor.posttest,
      badgeReward: MODULE_FOUR_BADGE,
      unlockTitle: MODULE_FOUR_UNLOCK_TITLE,
      description:
        "Answer 5 questions. Pass at 3 points to unlock the Module 4 report card, earn the innovation badge, and open Module 5.",
      campaignStep: 5,
      campaignStages: moduleFourStages,
      gamification: checkpointProfile({
        arc: "Innovation Checkpoint",
        xp: 150,
        reward: "In-Innovation Badge + Module 5 unlock",
        badge: "Innovation Finisher",
        objective:
          "Confirm that your prototype is structured, test-informed, and ready to move into the reflection phase.",
      }),
    },
  },
];

const missionTitleById = Object.fromEntries(
  moduleFourLessons.map((lesson) => [lesson.id, lesson.title]),
);

export const buildModuleFourReportCard = (
  missionResponses = {},
  scoreMeta = {},
  trainee = {},
) => {
  const generatedAt = new Date().toISOString();
  const missionOne = missionResponses["m4-mission-1"] || {};
  const missionTwo = missionResponses["m4-mission-2"] || {};
  const missionThree = missionResponses["m4-mission-3"] || {};
  const missionFour = missionResponses["m4-mission-4"] || {};

  return {
    generatedAt,
    badge: MODULE_FOUR_BADGE,
    unlockedModule: MODULE_FOUR_UNLOCK_TITLE,
    traineeName: trainee.name || trainee.displayName || trainee.email || "InSPIRE Learner",
    traineeEmail: trainee.email || "",
    cardSerial:
      trainee.cardSerial ||
      generateModuleFourCardSerial(trainee.uid || trainee.email || "USER", generatedAt),
    title: moduleFourModuleMeta.title,
    innovationName: missionOne.innovationName || missionTwo.innovationName || "",
    innovationFormula: missionOne.innovationFormula || "",
    score: scoreMeta.score ?? 0,
    totalQuestions: scoreMeta.totalQuestions ?? 0,
    sections: [
      {
        kind: "formula",
        title: missionTitleById["m4-mission-1"],
        content: missionOne,
      },
      {
        kind: "blueprint",
        title: missionTitleById["m4-mission-2"],
        content: missionTwo,
      },
      {
        kind: "craft",
        title: missionTitleById["m4-mission-3"],
        content: missionThree,
      },
      {
        kind: "beta",
        title: missionTitleById["m4-mission-4"],
        content: missionFour,
      },
    ],
  };
};
