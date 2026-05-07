export const TEXT_ANSWER_MIN_CHARACTERS = 15;

export const TEXT_ANSWER_MESSAGES = Object.freeze({
  th: "กรุณากรอกคำตอบอย่างน้อย 15 ตัวอักษร",
  en: "Please enter at least 15 characters.",
});

export const normalizeTextAnswer = (value = "") => String(value ?? "").trim();

export const getTextAnswerCharacterCount = (value = "") =>
  Array.from(normalizeTextAnswer(value).replace(/\s/gu, "")).length;

export const getTextAnswerMessage = (language = "th") =>
  TEXT_ANSWER_MESSAGES[language] || TEXT_ANSWER_MESSAGES.th;

export const isTextAnswerValid = (
  value,
  { minCharacters = TEXT_ANSWER_MIN_CHARACTERS } = {},
) => getTextAnswerCharacterCount(value) >= minCharacters;

export const validateTextAnswer = (
  value,
  {
    field = "answer",
    label = field,
    language = "th",
    minCharacters = TEXT_ANSWER_MIN_CHARACTERS,
  } = {},
) => {
  const count = getTextAnswerCharacterCount(value);
  const isValid = count >= minCharacters;

  return {
    field,
    label,
    count,
    minCharacters,
    isValid,
    message: isValid ? "" : getTextAnswerMessage(language),
  };
};

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

export const collectTextFieldValidationErrors = (
  source,
  descriptors = [],
  { language = "th", minCharacters = TEXT_ANSWER_MIN_CHARACTERS } = {},
) =>
  descriptors.flatMap((descriptor) => {
    const values =
      typeof descriptor.values === "function"
        ? descriptor.values(source)
        : resolveValuesAtPath(source, descriptor.path);

    return values
      .map((value, index) => ({
        index,
        result: validateTextAnswer(value, {
          field: descriptor.field || descriptor.path?.join(".") || "answer",
          label: descriptor.label || descriptor.field || "answer",
          language,
          minCharacters,
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

export const createTextValidationError = (errors = []) => {
  const error = new Error(errors[0]?.message || getTextAnswerMessage("th"));
  error.name = "TextValidationError";
  error.code = "text/min-characters";
  error.validationErrors = errors;
  return error;
};
