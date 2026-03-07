import React, { useState, useEffect } from "react";
import { checkName } from "../../validations/validate";
import { processData } from "../../api";
import { FaPlus, FaSave } from "react-icons/fa";

/* ================= LOCATION DATA ================= */
const LOCATION_DATA = {
  Kampala: ["Central", "Nakawa", "Makindye", "Rubaga", "Kawempe"],
  Wakiso: ["Nansana", "Kira", "Entebbe", "Kajansi"],
  Mukono: ["Mukono Town", "Seeta", "Nama"],
  Jinja: ["Jinja City", "Bugembe"]
};

function AddBranch({onSuccess}) {
  /* ================= STATE ================= */
  const [formData, setFormData] = useState({
    name: "",
    district: "",
    city: ""
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ===================== SHAKE RESET ===================== */
  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return checkName(value) ? "" : "Branch name is required";
      case "district":
        return value ? "" : "District is required";
      case "city":
        return value ? "" : "City is required";
      default:
        return "";
    }
  };

  /* ================= CHANGE HANDLER ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === "district" ? { city: "" } : {})
    }));

    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const validationErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) validationErrors[key] = error;
    });

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      setShake(true);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        collection: "branches",
        action: "add",
        data: {
          name: formData.name.trim(),
          district: formData.district,
          city: formData.city,
        }
      };

      await processData(payload);

      setSuccess("Branch added successfully!");
      setFormData({ name: "", district: "", city: "" });
      onSuccess?.();
    } catch (err) {
      setServerError(err.message || "Failed to add branch");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setErrors({});
        setSuccess("");
        setServerError("");
      }, 5000);
    }
  };

  /* ===================== RENDER ===================== */
  const fieldClass = name =>
    `${errors[name] ? "input-error" : ""} ${shake && errors[name] ? "shake" : ""}`;

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>New Branch</h2>      

      {serverError && <p className="server-error">{serverError}</p>}
        <div className="norrechel-grouped-inputs">
          {/* ===== DISTRICT & CITY ===== */}
          <div>
            <label className={`${errors.district ? "error-text" : ""} ${shake && errors.district ? "shake" : ""}`}>
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className={fieldClass("district")}
            >
              <option value="">-- Select --</option>
              {Object.keys(LOCATION_DATA).map(district => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {errors.district && <small className="error-text">{errors.district}</small>}
          </div>

          <div>
            <label className={`${errors.city ? "error-text" : ""} ${shake && errors.city ? "shake" : ""}`}>
              City
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!formData.district}
              className={fieldClass("city")}
            >
              <option value="">-- Select --</option>
              {formData.district &&
                LOCATION_DATA[formData.district].map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
            </select>
            {errors.city && <small className="error-text">{errors.city}</small>}
          </div>
        </div>
        {/* ===== BRANCH NAME ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.name ? "error-text" : ""} ${shake && errors.name ? "shake" : ""}`}>
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={fieldClass("name")}
            />
            {errors.name && <small className="error-text">{errors.name}</small>}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save "}
        </button>
      </form>
    </div>
  );
}

export default AddBranch;
