import React, { useState } from "react";
import {
  TEXT_ANSWER_MIN_CHARACTERS,
  getTextAnswerCharacterCount,
  getTextAnswerMessage,
  isTextAnswerValid,
} from "../../utils/textValidation";

const invalidClasses = "border-rose-300 bg-rose-50/70 focus:border-rose-400 focus:ring-4 focus:ring-rose-100";
const validClasses = "border-emerald-300 bg-emerald-50/60 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

export const TextAnswerFeedback = ({
  value,
  touched = false,
  showError = false,
  language = "th",
  className = "",
}) => {
  const count = getTextAnswerCharacterCount(value);
  const isValid = isTextAnswerValid(value);
  const shouldShowError = !isValid && (touched || showError || count > 0);

  return (
    <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-xs ${className}`}>
      <span className={isValid ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}>
        {count}/{TEXT_ANSWER_MIN_CHARACTERS} ตัวอักษร
      </span>
      {shouldShowError ? (
        <span className="font-medium text-rose-700">{getTextAnswerMessage(language)}</span>
      ) : null}
    </div>
  );
};

const resolveClassName = ({ className = "", value, touched, showError, forceInvalid = false }) => {
  const count = getTextAnswerCharacterCount(value);
  const isValid = isTextAnswerValid(value);
  const shouldDecorate = touched || showError || count > 0;

  if (!shouldDecorate) return className;
  if (forceInvalid) return `${className} ${invalidClasses}`;
  if (isValid) return `${className} ${validClasses}`;
  return `${className} ${invalidClasses}`;
};

export const TextAnswerInput = ({
  value,
  onChange,
  onBlur,
  className = "",
  showError = false,
  forceInvalid = false,
  language = "th",
  type = "text",
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const invalid = forceInvalid || (!isTextAnswerValid(value) && (touched || showError));

  return (
    <>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
        aria-invalid={invalid || undefined}
        className={resolveClassName({ className, value, touched, showError, forceInvalid })}
        {...props}
      />
      <TextAnswerFeedback value={value} touched={touched} showError={showError} language={language} />
    </>
  );
};

export const TextAnswerTextarea = ({
  value,
  onChange,
  onBlur,
  className = "",
  showError = false,
  forceInvalid = false,
  language = "th",
  rows = 5,
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const invalid = forceInvalid || (!isTextAnswerValid(value) && (touched || showError));

  return (
    <>
      <textarea
        value={value || ""}
        onChange={onChange}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={resolveClassName({ className, value, touched, showError, forceInvalid })}
        {...props}
      />
      <TextAnswerFeedback value={value} touched={touched} showError={showError} language={language} />
    </>
  );
};
