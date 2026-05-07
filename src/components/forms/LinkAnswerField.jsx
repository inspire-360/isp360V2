import React, { useState } from "react";
import { validateLinkAnswer } from "../../utils/linkValidation";
import { TextAnswerInput } from "./TextAnswerField";

const validLinkClasses = "border-emerald-200 bg-emerald-50 text-emerald-700";
const invalidLinkClasses = "border-rose-200 bg-rose-50 text-rose-700";

export const LinkAnswerFeedback = ({
  value,
  touched = false,
  showError = false,
  language = "th",
  className = "",
}) => {
  const validation = validateLinkAnswer(value, { language });
  const hasValue = Boolean(String(value || "").trim());
  const shouldShowInvalid = !validation.isValid && (touched || showError || hasValue);
  const shouldShowValid = validation.isValid && hasValue;

  if (!shouldShowInvalid && !shouldShowValid) return null;

  return (
    <p
      className={`mt-2 rounded-[16px] border px-3 py-2 text-xs font-medium leading-5 ${
        shouldShowInvalid ? invalidLinkClasses : validLinkClasses
      } ${className}`}
    >
      {shouldShowInvalid ? validation.message : "ลิงก์ถูกต้อง"}
    </p>
  );
};

export const LinkAnswerInput = ({
  value,
  onChange,
  onBlur,
  showError = false,
  language = "th",
  type = "url",
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const validation = validateLinkAnswer(value, { language });
  const hasValue = Boolean(String(value || "").trim());
  const showInvalid = !validation.isValid && (touched || showError || hasValue);

  return (
    <>
      <TextAnswerInput
        type={type}
        value={value}
        onChange={onChange}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
        inputMode="url"
        autoComplete="url"
        showError={showError}
        forceInvalid={showInvalid}
        {...props}
      />
      <LinkAnswerFeedback
        value={value}
        touched={touched}
        showError={showError}
        language={language}
      />
    </>
  );
};
