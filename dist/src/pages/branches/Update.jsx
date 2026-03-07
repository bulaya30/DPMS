import React, { useState, useEffect } from "react";
import { checkName } from "../../validations/validate";
import { processData } from "../../api";
import { FaEdit, FaSave } from "react-icons/fa";

/* ================= LOCATION DATA ================= */
const LOCATION_DATA = {
  Kampala: ["Central", "Nakawa", "Makindye", "Rubaga", "Kawempe"],
  Wakiso: ["Nansana", "Kira", "Entebbe", "Kajansi"],
  Mukono: ["Mukono Town", "Seeta", "Nama"],
  Jinja: ["Jinja City", "Bugembe"]
};

function UpdateBranch({ branches, onSuccess }) {
  /* ================= STATE ================= */
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    district: "",
    city: ""
  });

  const [originalData, setOriginalData] = useState({
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

  /* ================= BRANCH SELECT ================= */
  const handleBranchSelect = (e) => {
    const branchId = e.target.value;
    setSelectedBranchId(branchId);

    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    setFormData({
      name: "",
      district: branch.district || "",
      city: branch.city || ""
    });

    setOriginalData({
      name: branch.name || "",
      district: branch.district || "",
      city: branch.city || ""
    });

    setErrors({});
    setSuccess("");
    setServerError("");
  };

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (value.trim()) {
          if (!checkName(value)) return "Invalid branch name";
          if (value.trim().toLowerCase() === originalData.name.toLowerCase()) {
            return "New name must be different";
          }
        }
        return "";
      case "district":
        return checkName(value) ? "" : "District is required";
      case "city":
        return checkName(value) ? "" : "City is required";
      default:
        return "";
    }
  };

  /* ================= INPUT CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "district") {
      setFormData(prev => ({
        ...prev,
        district: value,
        city: ""
      }));
      setErrors(prev => ({
        ...prev,
        district: validateField("district", value),
        city: ""
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  /* ================= CHANGE DETECTION ================= */
  const hasChanges =
    formData.name.trim() !== "" ||
    formData.district !== originalData.district ||
    formData.city !== originalData.city;

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges || isSaving) return;

    const validationErrors = {};
    if (!selectedBranchId) validationErrors.branch = "Select a branch";
    if (!hasChanges) validationErrors.general = "No changes detected";

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
        action: "update",
        id: selectedBranchId,
        data: {
          ...(formData.name.trim() && { name: formData.name.trim() }),
          district: formData.district.trim(),
          city: formData.city.trim()
        }
      };

      await processData(payload);

      setSuccess("Branch updated successfully!");
      setErrors({});

      setOriginalData({
        name: formData.name.trim() || originalData.name,
        district: formData.district,
        city: formData.city
      });

      setFormData(prev => ({ ...prev, name: "" }));
      onSuccess?.();
    } catch (err) {
      setServerError(err.message || "Failed to update branch");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSuccess("");
        setServerError("");
      }, 4000);
    }
  };

  /* ===================== RENDER ===================== */
  const fieldClass = name =>
    `${errors[name] ? "input-error" : ""} ${shake && errors[name] ? "shake" : ""}`;

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}
      {errors.general && <p className="error-text">{errors.general}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Update Branch</h2>

        {/* ===== SELECT BRANCH ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.branch ? "error-text" : ""} ${shake && errors.branch ? "shake" : ""}`}>
              Select Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={handleBranchSelect}
              disabled={isSaving}
              className={fieldClass("branch")}
            >
              <option value=""></option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branch && <small className="error-text">{errors.branch}</small>}
          </div>
          {/* ===== DISTRICT ===== */}
          <div>
            <label className={`${errors.district ? "error-text" : ""} ${shake && errors.district ? "shake" : ""}`}>
              District
            </label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              disabled={!selectedBranchId || isSaving}
              className={fieldClass("district")}
            >
              <option value=""></option>
              {Object.keys(LOCATION_DATA).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.district && <small className="error-text">{errors.district}</small>}
          </div>
        </div>

        

        <div className="norrechel-grouped-inputs">
        {/* ===== DISTRICT ===== */}
          <div>
            <label className={`${errors.city ? "error-text" : ""} ${shake && errors.city ? "shake" : ""}`}>
              City
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!formData.district || isSaving}
              className={fieldClass("city")}
            >
              <option value=""></option>
              {(LOCATION_DATA[formData.district] || []).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <small className="error-text">{errors.city}</small>}
          </div>

          {/* ===== NEW BRANCH NAME ===== */}
            <div>
              <label className={`${errors.name ? "error-text" : ""} ${shake && errors.name ? "shake" : ""}`}>
                New Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!selectedBranchId || isSaving}
                className={fieldClass("name")}
              />
              {errors.name && <small className="error-text">{errors.name}</small>}
            </div>
          </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedBranchId || !hasChanges || isSaving}
          className={`norrechel-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default UpdateBranch;
