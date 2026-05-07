import {
  collectLinkFieldValidationErrors,
  createLinkValidationError,
  isLinkAnswerValid,
} from "./linkValidation.js";

const linkField = (path, label) => ({
  path: Array.isArray(path) ? path : String(path).split("."),
  field: Array.isArray(path) ? path.join(".") : path,
  label,
});

export const missionLinkFieldDescriptorsByType = Object.freeze({
  "idea-billboard": [linkField("screenshotEvidence", "post screenshot link")],
  "mastermind-comments": [
    linkField("commentOneEvidence", "first comment screenshot link"),
    linkField("commentTwoEvidence", "second comment screenshot link"),
  ],
  "spell-pitch": [linkField("pitchLink", "audio or video link")],
  "master-blueprint": [linkField("blueprintLink", "one-page blueprint link")],
  "crafting-session": [linkField("assetLink", "artifact file or image link")],
  "real-classroom": [linkField("clipLink", "teaching clip link")],
});

export const getMissionLinkFieldDescriptors = (payload = {}) =>
  missionLinkFieldDescriptorsByType[payload?.type] || [];

export const getMissionLinkValidationErrors = (payload = {}, options = {}) =>
  collectLinkFieldValidationErrors(payload, getMissionLinkFieldDescriptors(payload), options);

export const isMissionLinkValid = (payload = {}, options = {}) =>
  getMissionLinkValidationErrors(payload, options).length === 0;

export const assertMissionLinksValid = (payload = {}, options = {}) => {
  const errors = getMissionLinkValidationErrors(payload, options);
  if (errors.length > 0) {
    throw createLinkValidationError(errors);
  }
};

export { isLinkAnswerValid };
