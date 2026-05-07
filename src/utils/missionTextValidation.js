import {
  collectTextFieldValidationErrors,
  createTextValidationError,
  isTextAnswerValid,
} from "./textValidation.js";

const textField = (path, label) => ({
  path: Array.isArray(path) ? path : String(path).split("."),
  field: Array.isArray(path) ? path.join(".") : path,
  label,
});

const dynamicField = (field, label, values) => ({ field, label, values });

const selectedDreamAnswer = (payload) => {
  const selected =
    (payload?.strategies || []).find((item) => item.id === payload?.selectedStrategyId) ||
    payload?.selectedStrategy ||
    null;
  return [selected?.answer || ""];
};

const choiceCustomValue = (choiceField, customField) => (payload) =>
  payload?.[choiceField] ? [] : [payload?.[customField] || ""];

export const missionTextFieldDescriptorsByType = Object.freeze({
  reflection: [
    textField(["parts", "*", "items", "*", "answer"], "reflection answer"),
    textField("summary", "summary"),
  ],
  strategies: [
    textField(["strategies", "*", "title"], "strategy title"),
    textField(["strategies", "*", "internalSignal"], "internal signal"),
    textField(["strategies", "*", "externalSignal"], "external signal"),
    textField(["strategies", "*", "strategyText"], "strategy text"),
    textField(["strategies", "*", "successSignal"], "success signal"),
    textField("reflection", "strategy reflection"),
  ],
  "needs-detective": [textField("selectionReason", "selection reason")],
  pdca: [
    textField("strategyTitle", "strategy title"),
    textField("supportNeeded", "support needed"),
    textField("plan", "plan"),
    textField("do", "do"),
    textField("check", "check"),
    textField("act", "act"),
  ],
  "dream-lab": [
    dynamicField("selectedStrategy.answer", "selected strategy answer", selectedDreamAnswer),
    textField("sparkNote", "spark note"),
  ],
  "vibe-check": [
    textField("moodLine", "mood line"),
    textField(["senses", "*", "answer"], "sense answer"),
  ],
  roadmap: [
    textField(["weeks", "*", "quickWin"], "quick win"),
    textField(["weeks", "*", "plan"], "week plan"),
    textField(["weeks", "*", "evidence"], "week evidence"),
    textField("northStar", "north star"),
  ],
  pitch: [
    textField("projectName", "project name"),
    textField("teaser", "teaser"),
    textField(["cards", "*", "answer"], "pitch card answer"),
  ],
  smart: [
    textField("commitment", "commitment"),
    textField(["criteria", "*", "answer"], "SMART criterion answer"),
  ],
  quality: [],
  "idea-billboard": [
    textField("projectName", "project name"),
    textField("painPoint", "pain point"),
    textField("solution", "solution"),
    textField("adviceRequest", "advice request"),
    textField("screenshotEvidence", "screenshot evidence"),
  ],
  "mastermind-comments": [
    textField("commentOneEvidence", "first comment evidence"),
    textField("commentTwoEvidence", "second comment evidence"),
  ],
  "spell-pitch": [
    textField("projectName", "project name"),
    textField("feedbackApplied", "feedback applied"),
    textField("hook", "hook"),
    textField("painPoint", "pain point"),
    textField("solution", "solution"),
    textField("impact", "impact"),
    textField("pitchLink", "pitch link"),
  ],
  "reflection-mirror": [textField("reflectionAnswer", "reflection answer")],
  "innovation-lab": [
    textField("innovationName", "innovation name"),
    dynamicField(
      "innovationToolCustom",
      "custom innovation tool",
      choiceCustomValue("innovationTool", "innovationToolCustom"),
    ),
    dynamicField(
      "pedagogyCustom",
      "custom pedagogy mode",
      choiceCustomValue("pedagogyMode", "pedagogyCustom"),
    ),
    textField("painPoint", "pain point"),
    textField("targetGoal", "target goal"),
  ],
  "master-blueprint": [
    textField("innovationName", "innovation name"),
    textField("inspiration", "inspiration"),
    textField("objectives", "objectives"),
    textField("innovationFormat", "innovation format"),
    textField("innovationMechanism", "innovation mechanism"),
    textField("hookPhase", "hook phase"),
    textField("actionPhase", "action phase"),
    textField("reflectPhase", "reflection phase"),
    textField("creativeEvaluation", "creative evaluation"),
    textField("resourcesNeeded", "resources needed"),
    textField("blueprintLink", "blueprint link"),
  ],
  "crafting-session": [
    textField("innovationName", "innovation name"),
    textField("artifactTitle", "artifact title"),
    textField("assetLink", "asset link"),
    textField("assetDescription", "asset description"),
    textField("classroomUse", "classroom use"),
  ],
  "beta-test": [
    textField("testWith", "test audience"),
    textField("strengthAnswer", "strength answer"),
    textField("upgradeAnswer", "upgrade answer"),
    textField("feedbackNote", "feedback note"),
  ],
  "real-classroom": [
    textField("lessonPlanTitle", "lesson plan title"),
    textField("classroomContext", "classroom context"),
    textField("learningFocus", "learning focus"),
    textField("clipLink", "clip link"),
    textField("evidenceNote", "evidence note"),
    textField("duQuestion", "DU question"),
  ],
  "reflection-log": [
    textField("lessonPlanTitle", "lesson plan title"),
    textField("whatHappened", "what happened"),
    textField("proudMoment", "proud moment"),
    textField("studentResponse", "student response"),
    textField("challengePoint", "challenge point"),
    textField("evidenceCollected", "evidence collected"),
    textField("mentorReflection", "mentor reflection"),
  ],
  "growth-path": [
    textField("lessonPlanTitle", "lesson plan title"),
    textField("versionNext", "next version"),
    textField("improvementFocus", "improvement focus"),
    textField("supportNeeded", "support needed"),
    textField("nextTimeline", "next timeline"),
    textField("successIndicator", "success indicator"),
    textField("scalePlan", "scale plan"),
  ],
  "platform-survey": [
    textField("favoritePart", "favorite part"),
    textField("improvementIdea", "improvement idea"),
    textField("finalReflection", "final reflection"),
  ],
});

export const getMissionTextFieldDescriptors = (payload = {}) =>
  missionTextFieldDescriptorsByType[payload?.type] || [];

export const getMissionTextValidationErrors = (payload = {}, options = {}) =>
  collectTextFieldValidationErrors(payload, getMissionTextFieldDescriptors(payload), options);

export const isMissionTextValid = (payload = {}, options = {}) =>
  getMissionTextValidationErrors(payload, options).length === 0;

export const assertMissionTextValid = (payload = {}, options = {}) => {
  const errors = getMissionTextValidationErrors(payload, options);
  if (errors.length > 0) {
    throw createTextValidationError(errors);
  }
};

export { isTextAnswerValid };
