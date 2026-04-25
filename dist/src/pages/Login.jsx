import React, { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { login } from "../api/LoginAuth";
import { checkMail, checkPassword } from "../validations/validate";
import { ThemeContext } from "../components/ThemeContext";
import Header from "../components/Header";
// Assuming you have a generic icon component or use react-icons
import { FaArrowRight, FaEye, FaEyeSlash } from "react-icons/fa";
import { FiCheckCircle, FiTrendingUp, FiCoffee } from "react-icons/fi"; // Example icons

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const { darkMode } = useContext(ThemeContext);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);

  const handleLogin = async (data) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setServerError("");
      const res = await login(data.email, data.password);
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

      {/* Full Screen Background Container */}
      <div className={`auth-layout ${darkMode ? "dark" : ""}`}>
        
        {/* Background Image & Overlay */}
        <div className="background-layer">
          <div className="overlay-gradient"></div>
          
          {/* Left Side Content (Text & Features) */}
          <div className="left-content">
            <h1>Smart Farming.<br />Better Tomorrow.</h1>
            <p>
              Manage your poultry farm efficiently <br /> with real-time insights and control.
            </p>

            <div className="features">
              <div className="feature-item">
                <div className="icon-box">
                  <FiCheckCircle size={24} />
                </div>
                <div>
                  <strong>Healthy Birds</strong>
                  <span>Better production</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="icon-box">
                  <FiTrendingUp size={24} />
                </div>
                <div>
                  <strong>Real-time Tracking</strong>
                  <span>Data-driven decisions</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="icon-box">
                  <FiCoffee size={24} /> {/* Or an egg icon */}
                </div>
                <div>
                  <strong>Higher Productivity</strong>
                  <span>Better farm management</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Login Card */}
        <div className={`auth-card ${shake ? "shake" : ""}`}>
          <div className="card-header">
            {/* Logo Placeholder */}
            <div className="logo-placeholder">
              <img src="./img/logo.png" alt="Site Logo" />
            </div>
          </div>

          <div className="welcome-section">
            <h3>Welcome Back!</h3>
            <p>Login to access your dashboard</p>
          </div>

          {serverError && <p className="error-text">{serverError}</p>}

          <form onSubmit={handleSubmit(handleLogin)} className="auth-form" autoComplete="off">
            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  {...register("email", { required: "Email is required", validate: (v) => checkMail(v) || "Invalid email" })}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password", { required: "Password is required", validate: (v) => checkPassword(v) || "Invalid" })}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            <button type="submit" disabled={isSaving} className={`login-btn ${isSaving ? "loading" : ""}`}>
              {isSaving ? "Signing in..." : "Sign In"} <FaArrowRight />
            </button>
          </form>

          <div className="divider"><span>or</span></div>

          <div className="card-footer">
            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
          </div>
        </div>

      </div>
    </>
  );
}

export default Login;