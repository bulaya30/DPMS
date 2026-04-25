import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function FormField({
  name,
  label,
  type = "text",
  register,
  rules = {},
  error,
  options = null, // for select
  disabled = false,
  placeholder = "",
  triggerShake = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  const inputType = isPassword
    ? showPassword
      ? "text"
      : "password"
    : type;

  const hasError = !!error;

  const className = `
    dpms-input
    ${hasError ? "input-error" : ""}
    ${hasError && triggerShake ? "shake" : ""}
  `;

  return (
    <div>
      {/* LABEL */}
      {label && (
        <label className={`${hasError ? "error-text" : ""} ${triggerShake ? "shake" : ""}`}>
          {label}
        </label>
      )}

      {/* INPUT / SELECT */}
      {options ? (
        <select
          {...register(name, rules)}
          disabled={disabled}
          className={className}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="password-input-container">
          <input
            type={inputType}
            placeholder={placeholder}
            {...register(name, rules)}
            className={className}
          />

          {/* PASSWORD TOGGLE */}
          {isPassword && (
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <small className="error-text">
          {error.message}
        </small>
      )}
    </div>
  );
}

export default FormField;