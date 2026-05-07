export const LINK_ANSWER_MESSAGES = Object.freeze({
  th: {
    required: "กรุณากรอกลิงก์ให้ครบถ้วน",
    invalid: "กรุณากรอกลิงก์ที่ถูกต้อง โดยขึ้นต้นด้วย http:// หรือ https://",
    placeholder: "กรุณาแทนที่ตัวอย่างลิงก์ด้วยลิงก์จริง",
  },
  en: {
    required: "Please enter a link.",
    invalid: "Please enter a valid link starting with http:// or https://.",
    placeholder: "Please replace the sample link with a real link.",
  },
});

export const normalizeLinkAnswer = (value = "") => String(value ?? "").trim();

export const getLinkAnswerMessage = (reason = "invalid", language = "th") =>
  LINK_ANSWER_MESSAGES[language]?.[reason] ||
  LINK_ANSWER_MESSAGES.th[reason] ||
  LINK_ANSWER_MESSAGES.th.invalid;

export const validateLinkAnswer = (
  value,
  { field = "link", label = field, language = "th", required = true } = {},
) => {
  const normalized = normalizeLinkAnswer(value);

  if (!normalized) {
    const isValid = !required;
    return {
      field,
      label,
      value: normalized,
      isValid,
      reason: isValid ? "" : "required",
      message: isValid ? "" : getLinkAnswerMessage("required", language),
    };
  }

  let parsedUrl = null;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return {
      field,
      label,
      value: normalized,
      isValid: false,
      reason: "invalid",
      message: getLinkAnswerMessage("invalid", language),
    };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return {
      field,
      label,
      value: normalized,
      isValid: false,
      reason: "invalid",
      message: getLinkAnswerMessage("invalid", language),
    };
  }

  if (!parsedUrl.hostname || parsedUrl.hostname === "..." || normalized.includes("https://...")) {
    return {
      field,
      label,
      value: normalized,
      isValid: false,
      reason: "placeholder",
      message: getLinkAnswerMessage("placeholder", language),
    };
  }

  return {
    field,
    label,
    value: normalized,
    isValid: true,
    reason: "",
    message: "",
    url: parsedUrl,
  };
};

export const isLinkAnswerValid = (value, options = {}) =>
  validateLinkAnswer(value, options).isValid;

const resolveValuesAtPath = (source, path = []) => {
  const walk = (current, remainingPath) => {
    if (remainingPath.length === 0) return [current];

    const [segment, ...rest] = remainingPath;
    if (segment === "*") {
      if (!Array.isArray(current)) return [];
      return current.flatMap((item) => walk(item, rest));
    }

    if (!current || typeof current !== "object") return [];
    return walk(current[segment], rest);
  };

  return walk(source, path);
};

export const collectLinkFieldValidationErrors = (
  source,
  descriptors = [],
  { language = "th" } = {},
) =>
  descriptors.flatMap((descriptor) => {
    const values =
      typeof descriptor.values === "function"
        ? descriptor.values(source)
        : resolveValuesAtPath(source, descriptor.path);

    return values
      .map((value, index) => ({
        index,
        result: validateLinkAnswer(value, {
          field: descriptor.field || descriptor.path?.join(".") || "link",
          label: descriptor.label || descriptor.field || "link",
          language,
          required: descriptor.required ?? true,
        }),
      }))
      .filter(({ result }) => !result.isValid)
      .map(({ result, index }) => ({
        ...result,
        field:
          values.length > 1 && !String(result.field).includes("[")
            ? `${result.field}[${index}]`
            : result.field,
      }));
  });

export const createLinkValidationError = (errors = []) => {
  const error = new Error(errors[0]?.message || getLinkAnswerMessage("invalid", "th"));
  error.name = "LinkValidationError";
  error.code = "link/invalid-url";
  error.validationErrors = errors;
  return error;
};
