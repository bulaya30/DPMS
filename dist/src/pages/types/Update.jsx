import React, { useState, useEffect } from "react";
import { checkName } from "../../validations/validate";
import { useProcessType } from "../../hooks/useTypes";
import { FaSave } from "react-icons/fa";

function UpdateItemType({ types }) {
  const {mutate, isPending: isSaving} = useProcessType();
  /* ================= STATE ================= */
  const [selectedTypeId, setSelectedTypeId] = useState("");

  const [formData, setFormData] = useState({ name: "" });
  const [originalData, setOriginalData] = useState({ name: "" });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ===================== SHAKE RESET ===================== */
  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);


  /* ================= HANDLE SELECT ================= */
  const handleSelect = (e) => {
    const typeId = e.target.value;
    setSelectedTypeId(typeId);

    const selected = types.find(t => t.id === typeId);
    if (selected) {
      const data = { name: selected.name || "" };
      setFormData(data);
      setOriginalData(data);
      setErrors({});
      setSuccess("");
      setServerError("");
    }
  };

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (value.trim()) {
          if (!checkName(value)) return "Invalid item type name";
          if (value.trim().toLowerCase() === originalData.name.toLowerCase()) {
            return "New name must be different";
          }
        }
        return "";
      default:
        return "";
    }
  };

  /* ================= CHANGE HANDLER ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  /* ================= CHANGE DETECTION ================= */
  const hasChanges = formData.name.trim() !== "" && formData.name.trim() !== originalData.name;

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges || isSaving) return;

    const validationErrors = {};
    if (!selectedTypeId) validationErrors.type = "Select an item type";
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
    const payload = {
      collection: "types",
      action: "update",
      id: selectedTypeId,
      data: { name: formData.name.trim() }
    };
    mutate(payload, {
      onSuccess: ()=> {
        setSuccess("Item type updated successfully!");
        setErrors({});
    
        setOriginalData({ name: formData.name.trim() });
        setFormData(prev => ({ ...prev, name: "" }));

      },
      onError: (error)=>{
        setServerError(error.message || "Failed to update item type");

      },
      onSettled: ()=>{
        setTimeout(() => {
          setSuccess("");
          setServerError("");
        }, 5000);

      }
    })
    
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
        <h2>Update Item Type</h2>

        {/* ===== SELECT ITEM TYPE ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.type ? "error-text" : ""} ${shake && errors.type ? "shake" : ""}`}>
              Select Item Type
            </label>
            <select
              value={selectedTypeId}
              onChange={handleSelect}
              disabled={isSaving}
              className={fieldClass("type")}
            >
              <option value=""></option>
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.type && <small className="error-text">{errors.type}</small>}
          </div>
          {/* ===== NEW ITEM TYPE NAME ===== */}
          <div>
            <label className={`${errors.name ? "error-text" : ""} ${shake && errors.name ? "shake" : ""}`}>
              New Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={!selectedTypeId || isSaving}
              className={fieldClass("name")}
            />
            {errors.name && <small className="error-text">{errors.name}</small>}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedTypeId || !hasChanges || isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default UpdateItemType;
