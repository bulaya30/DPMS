import React, { useState, useEffect } from "react";
import { checkName } from "../../validations/validate";
import { useProcessType } from "../../hooks/useTypes";
import { FaSave } from "react-icons/fa";

function AddItemType() {
  const {mutate, isPending: isSaving} = useProcessType();
  /* ================= STATE ================= */
  const [formData, setFormData] = useState({
    name: ""
  });

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

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return checkName(value) ? "" : "Item type name is required";
      default:
        return "";
    }
  };

  /* ================= CHANGE HANDLER ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
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
    const payload = {
      collection: "types",
      action: "add",
      data: {
        name: formData.name.trim()
      }
    };
    mutate(payload, {
      onSuccess: ()=>{
        setSuccess("Item type added successfully!");
        setFormData({ name: "" });

      },
      onError: (error)=>{
        setServerError(error.message || "Failed to add item type");
      },
      onSettled: ()=>{
        setErrors({});
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

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Add a Type</h2>     

        {/* ===== ITEM TYPE NAME ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.name ? "error-text" : ""} ${shake && errors.name ? "shake" : ""}`}>
              Type Name
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
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AddItemType;
