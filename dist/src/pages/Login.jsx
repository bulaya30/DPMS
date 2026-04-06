import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/LoginAuth";
import { checkMail, checkPassword } from "../validations/validate";
import { ThemeContext } from "../components/ThemeContext";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import Header from "../components/Header"
import useAuthStore from "../store/authStore";

function Login() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name, value) => {
    switch (name) {
      case "email": return checkMail(value) ? "" : "Email address required";
      case "password":
              return checkPassword(value)
                ? ""
                : "Password must be at least 8 characters, 1 uppercase, 1 lowercase, 1 number";
      default: return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleLogin = async (e) => {
  e.preventDefault();
  if (isSaving) return;

  const newErrors = {};
  Object.keys(formData).forEach(key => {
    const error = validateField(key, formData[key]);
    if (error) newErrors[key] = error;
  });

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    setShake(true);
    return;
  }

  try {
    setIsSaving(true);
    setServerError("");
    const res = await login(formData.email, formData.password);
    if (res.token) {
      window.location.replace("/");
    }
  } catch (err) {
    setServerError(err.message || "Login failed");
    setShake(true);
  } finally {
    setTimeout(() => {
      setIsSaving(false);
      setShake(false);
    }, 600);
  }
};

  return (
    <>
    <Header />
    <div className={`dpms-auth-page ${darkMode ? "dark" : ""}`}>
        <div className="dpms-auth-card">
          <img src="/img/logo.png" alt="DPMS Logo" className="dpms-logo" />
          <h2 className="dpms-title">Digital Poultry</h2>
          <p className="dpms-subtitle">Management System</p>
          <div className="dpms-input-container">
            {serverError && <p className="error-text center">{serverError}</p>}

            <form onSubmit={handleLogin} autoComplete="off">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={`dpms-input ${errors.email ? "input-error" : ""} ${shake && errors.email ? "shake" : ""}`}
              />
              {errors.email && <small className="error-text">{errors.email}</small>}

              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`dpms-input ${errors.password ? "input-error" : ""} ${shake && errors.password ? "shake" : ""}`}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <small className="error-text">{errors.password}</small>}

              <button type="submit" disabled={isSaving} className={`dpms-login-btn save-btn ${isSaving ? "loading" : ""}`}>
                {isSaving && <span className="spinner" />}
                {isSaving ? "Logging in..." : "Sign In"}
              </button>
            </form>

            <div className="dpms-links">
              <span>Forgot Password?</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Login;
