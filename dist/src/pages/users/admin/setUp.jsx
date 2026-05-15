import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useProcessUser } from "../../../hooks/useUsers";
import { checkName, checkMail, checkPassword } from "../../../validations/validate";
import { ThemeContext } from "../../../components/ThemeContext";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import { FaPlus, FaSave } from "react-icons/fa";
import Header from "../../../components/Header";

function AdminSetup() {
  const { mutate, isPending: isSaving } = useProcessUser();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ------------------ Validation ------------------
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return checkName(value) ? "" : "User Name required";
      case "email":
        return checkMail(value) ? "" : "Invalid Email address";
     case "password":
        return checkPassword(value)
          ? ""
          : "Password must be at least 8 characters, 1 uppercase, 1 lowercase, 1 number";
      default:
        return "";
    }
  };

    const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Inline validation
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  // Reset shake after animation
  useEffect(() => {
    if (shake) {
      const timeout = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [shake]);

  // ------------------ Submit handler ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      return;
    }

    const { name, email, password } = formData;
    const payload = {
      collection: "users",
      action: "add",
      data: { name, email, password, role: "admin" },
    };
    mutate(payload, {
      onSuccess: (response) => {
        if (response.token) {
          localStorage.setItem("token", response.token);
          window.location.replace("/");
        }
      },
      onError: (err) => {
        setServerError(err.message || "Failed to create admin.");
      },
      onSettled: () => {
        setTimeout(() => {
          setIsSaving(false);
          setShake(false);
        }, 5000);
      },

    })
  };

  // ------------------ Form JSX ------------------
  return (
    <>
      <Header />
      <div className={`dpms-auth-page `}>
        {/* ===== FIXED TOP-RIGHT THEME TOGGLE ===== */}
        <div className="dpms-auth-card">
          <img src="/img/logo.png" alt="DPMS Logo" className="dpms-logo" />
          <h2 className="dpms-title">System Setup</h2>
          <p className="dpms-subtitle">Poultry Management System</p>
          <div className="dpms-input-container">
            {serverError && <p className="error-text">{serverError}</p>}
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* <div className="dpms-input-container"> */}
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`dpms-input ${errors.name ? "input-error" : ""} ${shake && errors.name ? "shake" : ""}`}
                />
                {errors.name && <small className="error-text">{errors.name}</small>}
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

              {/* </div> */}
              {errors.password && <small className="error-text">{errors.password}</small>}

              <button type="submit" disabled={isSaving} className={`dpms-login-btn save-btn ${isSaving ? "loading" : ""}`}>
                {isSaving && <span className="spinner" />}
                <FaSave /> {isSaving ? "Creating ..." : "Create "}
              </button>
            </form>

          </div>

        </div>
      </div>
    </>
  );
}

export default AdminSetup;
