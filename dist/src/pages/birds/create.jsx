import React, { useState, useEffect } from "react";
import { checkName, checkNumber } from "../../validations/validate";
import { useProcessBird } from "../../hooks/useBirds";
import { FaSave } from "react-icons/fa";

function AddBird({brancheData, typeData, onSuccess}) {
  const { mutate, isPending: isSaving }= useProcessBird();
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    quantity: "",
    age: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ===================== LOAD DATA ===================== */
  useEffect(() => {
    (async () => {
      setBranches(brancheData);
      setTypes(typeData);
      
      // Pre-select branch if only one
      if (brancheData.length === 1) {
        setFormData(prev => ({ ...prev, branchId: brancheData[0].id }));
      }
    })();
  }, [brancheData, typeData]);

  /* ===================== VALIDATION ===================== */
  const validateField = (name, value) => {
    switch (name) {
      case "branchId":
      case "typeId":
        return checkName(value) ? "" : "This field is required";

      case "quantity":
      case "age":
        return checkNumber(value) && value > 0
          ? ""
          : "Must be greater than 0";

      default:
        return "";
    }
  };

  /* ===================== SHAKE RESET ===================== */
  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);

  /* ===================== INPUT HANDLER ===================== */
  const handleChange = e => {
    const { name, value } = e.target;

    const safeValue =
      ["quantity", "age",].includes(name) && value < 0 ? 0 : value;

    setFormData(prev => ({ ...prev, [name]: safeValue }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, safeValue) }));
  };

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async e => {
    e.preventDefault();

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

    mutate({
      collection: "birds",
      action: "add",
      data: formData,
    }, {
      onSuccess: () => {
        setSuccess("Bird added successfully!");
        setFormData(prev => ({ ...prev, 
          branchId: branches.length === 1 ? branches[0].id : "", 
          typeId: "",
          quantity: "",
          age: "",
        }));
      },
      onError: (err) => {
        setServerError(err.message || "Something went wrong");
      }
    })
    setTimeout(() => {
      setSuccess("");
      setServerError("");
      setErrors({});
    }, 5000);
  };

  const fieldClass = name =>
    `${errors[name] ? "input-error" : ""} ${shake && errors[name] ? "shake" : ""}`;
  /* ===================== RENDER ===================== */

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Add a Bird</h2>
        {/* ===== BRANCH & TYPE ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.branchId ? "error-text" : ""}  ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
            {branches.length === 1 ? (
              <select
                name="branchId"
                value={branches[0].id}
                onChange={handleChange}
                className={fieldClass("branchId")}
                disabled
              >
                <option value={branches[0].id}>{branches[0].name} ({branches[0].district})</option>
              </select>
            ) : (
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className={fieldClass("branchId")}
              >
                <option value=""></option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district})
                  </option>
                ))}
              </select>
            )}
            {branches.length > 1 && errors.branchId && <small className="error-text">{errors.branchId}</small>}
          </div>

          <div>
            <label className={`${errors.typeId ? "error-text" : ""}  ${shake && errors.typeId ? "shake" : ""}`}>Type</label>
            <select
              name="typeId"
              value={formData.typeId}
              onChange={handleChange}
              className={fieldClass("typeId")}
            >
              <option value=""></option>
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.typeId && <small className="error-text">{errors.typeId}</small>}
          </div>
        </div>

        {/* ===== QUANTITY & AGE ===== */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.quantity ? "error-text" : ""} ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className={fieldClass("quantity")}
            />
            {errors.quantity && <small className="error-text">{errors.quantity}</small>}
          </div>
          {/* ===== AGE ===== */}
          <div>
            <label className={`${errors.age ? "error-text" : ""}  ${shake && errors.quantity ? "shake" : ""}`}>Age (days)</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className={fieldClass("age")}
            />
            {errors.age && <small className="error-text">{errors.age}</small>}
          </div>
        </div>

        {/* ===== SUBMIT ===== */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save "}
        </button>
      </form>
    </div>
  );
}

export default AddBird;
