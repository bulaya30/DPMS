import React, { useState, useEffect, useMemo } from "react";
import { checkDate, checkName, checkNumber } from "../../validations/validate";
import { getBranches, getBirds, processData, getTypes } from "../../api";
import { FaEdit, FaSave } from "react-icons/fa";


const normalizeDate = (value) => {
  if (!value) return "";

  // Firestore Timestamp
  if (value?.seconds) {
    return new Date(value.seconds * 1000)
      .toISOString()
      .split("T")[0];
  }

  // JS Date
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  // ISO string
  if (typeof value === "string") {
    return value.split("T")[0];
  }

  return "";
};

function UpdateEgg({ eggs, branchData, typeData, onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    branch: "",
    type: "",
    color: "",
    date: "",
    quantity: "",
    price : "",
  });  
  /* === DB truth === */
  const [originalData, setOriginalData] = useState({
    branch: "",
    type: "",
    color: "",
    date: "",
    quantity: "",
    price : "",
  });

  const [hasEgg, setHasEgg] = useState(false);

  // Function to determine default egg color based on bird type
  const getDefaultColor = (typeId) => {
    const type = types.find(t => t.id === typeId);
    const name = type?.name;
    switch (name) {
      case "Locals":
        return "White";
      case "Layers":
      case "Broilers":
        return "Yellow";
      default:
        return "White";
    }
  };




  /* ================= LOAD BRANCHES && TYPES ================= */
  useEffect(() => {
    const loadData = async () => {
      setBranches(branchData || []);
      setTypes(typeData || []);
      if (branchData.length === 1) {
        setFormData(prev => ({ ...prev, branch: branchData[0].id }));
      }
    };
    loadData();
  }, [branchData, typeData]);
  /* ================= RESETTING FORM ============== */
  useEffect(() => {
    if (!formData.branch) {
      setHasEgg(false);
      setFormData(prev => ({
        ...prev,
        type: "",
        quantity: "",
        price: "",
        date: "",
        color: ""
      }));
    }
  }, [formData.branch]);

  /* ================= LOAD EGG ================= */
  useEffect(() => {
    if (!formData.branch || !formData.type) return;

    const egg = eggs.find(e =>
      String(e.branchId) === String(formData.branch) &&
      String(e.typeId) === String(formData.type)
    );

    if (!egg) {
      setHasEgg(false);
      setFormData(prev => ({
        ...prev,
        quantity: "",
        price: "",
        date: "",
        color: getDefaultColor(formData.type)
      }));
      return;
    }

    setHasEgg(true);

    const next = {
      quantity: egg.quantity ?? "",
      price: egg.price ?? "",
      date: normalizeDate(egg.date),
      color: egg.color ?? getDefaultColor(formData.type)
    };


    setFormData(prev => ({ ...prev, ...next }));
    setOriginalData(next);

  }, [formData.branch, formData.type, eggs]);





  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branch":
      case "type":
      case "color":
        return checkName(value) ? "" : "This field is required";

      case "date":
        return checkDate(normalizeDate(value)) ? "" : "Invalid Date format";

      case "quantity":
        return checkNumber(value) && value > 0
          ? ""
          : "Quantity must be greater than 0";
      case "price":
          return checkNumber(value) && value > 0
            ? ""
            : "Price must be greater than 0";
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

  /* ================= CHANGE HANDLER ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "quantity" || name === "price") {
      newValue = value < 0 ? 0 : value;
    }

    setFormData(prev => {
      if (name === "type") {
        return {
          ...prev,
          type: newValue,
          color: getDefaultColor(newValue),
          quantity: "",
          price: "",
          date: ""
        };
      }

      return { ...prev, [name]: newValue };
    });

    setErrors(prev => ({ ...prev, [name]: validateField(name, newValue) }));
  };

  // console.log(eggs)

  /* ================= RULES ================= */
  const selectionComplete = formData.branch && formData.type;

  const canEdit =
    hasEgg &&
    (
      originalData.color ||
      Number(originalData.quantity) > 0 ||
      Number(originalData.price) > 0 ||
      originalData.date
    );

  const hasChanged =
    formData.color !== originalData.color ||
    Number(formData.quantity) !== Number(originalData.quantity) ||
    Number(formData.price) !== Number(originalData.price) ||
    formData.date !== originalData.date;

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!canEdit || !hasChanged || isSaving) return;

    let newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      return;
    }

    try {
      setIsSaving(true);
       const egg = eggs.find(
        b => b.branchId === formData.branch && b.typeId === formData.type
      );
      if (!egg) return;
      const payload = {
        collection: "eggs",
        action: "update",
        id: egg.id,
        data: {
          branchId: formData.branch,
          typeId: formData.type,
          color: formData.color,
          date: formData.date,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
        }
    };
    await processData(payload);
    setSuccess("Information successfully!");
        setFormData(prev => ({ 
          ...prev, 
          branch: branches.length === 1 ? branches[0].id : "", 
          quantity: "", 
          date: "", 
          type:"", 
          color:"",
          price: "",
      }));
      onSuccess?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setTimeout(() =>
        setSuccess(""), 
        setShake(false), 
        setErrors(''), 
        setServerError(''), 
      5000);
      setIsSaving(false)
    }
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}
      {selectionComplete && hasEgg && !canEdit && (
        <p className="error-text">
          Egg exists but has no editable values.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Branch */}
              <label className={`${errors.branch ? "error-text" : ""} ${shake && errors.branch ? "shake" : ""}`}>Branch</label>
              {branches.length === 1 ? (
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className={`${errors.branch ? "input-error" : ""} ${shake && errors.branch ? "shake" : ""}`}
                  disabled
                >
                  <option value={branches[0].id}>{branches[0].name} ({branches[0].district})</option>
                </select>
              ): (
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className={`${errors.branch ? "input-error" : ""} ${shake && errors.branch ? "shake" : ""}`}
                >
                  <option value=""></option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.district})</option>
                  ))}
                </select>
              )}
              {errors.branch && <small className="error-text">{errors.branch}</small>}
            </div>
            <div>
              {/* Bird Type */}
              <label className={`${errors.type ? "error-text" : ""} ${shake && errors.type ? "shake" : ""}`}>
                Bird Type
                <span title="Select the bird type that laid the egg. Egg color will default automatically." style={{ marginLeft: '5px', cursor: 'help' }}>🛈</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`${errors.type ? "input-error" : ""} ${shake && errors.type ? "shake" : ""}`}
              >
                <option value=""></option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              {errors.type && <small className="error-text">{errors.type}</small>}
            </div>
          </div>
        </div>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Egg Color */}
              <label className={`${errors.color ? "error-text" : ""} ${shake && errors.color ? "shake" : ""}`}>Egg Color</label>
              <select
                name="color"
                value={formData.color}
                onChange={handleChange}
                className={`${errors.color ? "input-error" : ""} ${shake && errors.color ? "shake" : ""}`}
                disabled={!(formData.branch && formData.type)}
              >

                <option value=""></option>
                <option value="White">White</option>
                <option value="Yellow">Yellow</option>
              </select>
              {errors.color && <small className="error-text">{errors.color}</small>}
            </div>
            <div>
              {/* Date */}
              <label className={`${errors.date ? "error-text" : ""} ${shake && errors.date ? "shake" : ""}`}>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`${errors.date ? "input-error" : ""} ${shake && errors.date ? "shake" : ""}`}
                disabled={!(formData.branch && formData.type)}
              />
              {errors.date && <small className="error-text">{errors.date}</small>}
            </div>
          </div>
        </div>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Quantity */}
              <label className={`${errors.quantity ? "error-text" : ""} ${shake && errors.quantity ? "shake" : ""}`}>Quantity (Tray Unit)</label>
              <input
                type="number"
                min="0"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className={`${errors.quantity ? "input-error" : ""} ${shake && errors.quantity ? "shake" : ""}`}
                disabled={!(formData.branch && formData.type)}
              />
              {errors.quantity && <small className="error-text">{errors.quantity}</small>}
            </div>
            <div>
              {/* Price */}
              <label className={`${errors.price ? "error-text" : ""} ${shake && errors.price ? "shake" : ""}`}>
                Price (per tray)
              </label>
              <input
                type="number"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className={`${errors.price ? "input-error" : ""} ${shake && errors.price ? "shake" : ""}`}
                disabled={!(formData.branch && formData.type)}
              />
              {errors.price && <small className="error-text">{errors.price}</small>}

            </div>
          </div>
        </div>
        {/* Submit */}
        <button
          type="submit"
          disabled={!hasEgg || isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default UpdateEgg;
