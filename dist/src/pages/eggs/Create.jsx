import React, { useState, useEffect } from "react";
import { checkDate, checkName, checkNumber } from "../../validations/validate";
import { getBranches, getTypes, getBirds, processData } from "../../api";
import { FaPlus, FaSave } from "react-icons/fa";

const user = JSON.parse(localStorage.getItem("user"));

function AddEgg({branchData, typeData,onSuccess}) {
  // Auto-fill today's date
  const today = new Date().toISOString().split("T")[0];

  const [branches, setBranches] = useState([]);
  const [birdTypes, setBirdTypes] = useState([]);
  const [formData, setFormData] = useState({
    branch: "",
    birdType: "",
    eggColor: "",
    date: today,
    quantity: "",
    price: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false)

  // Function to determine default egg color based on bird type
  const getDefaultEggColor = (birdType) => {
    switch (birdType) {
      case "Local":
        return "White";
      case "Layer":
      case "Broiler":
        return "Yellow";
      default:
        return "White"; // fallback for new types
    }
  };

  /* ================= LOAD BRANCHES && BIRD TYPES ================= */
  useEffect(() => {
    const loadData = async () => {
      setBranches(branchData || []);
      setBirdTypes(typeData || [])
      if (branchData.length === 1) {
        setFormData(prev => ({ ...prev, branch: branchData[0].id }));
      }
    };
    loadData();
  }, [branchData, typeData]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branch":
      case "birdType":
      case "eggColor":
        return checkName(value) ? "" : "This field is required";
      case "date":
        return checkDate(value) ? "" : "Invalid Date format";
      case "quantity":
        return checkNumber(value) && value > 0 ? "" : "Quantity must be greater than 0";
      case "price" :
        return checkNumber(value) && value > 0 ? "" : "Price must be greater than 0";
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
    if (name === "quantity" || name === "price") newValue = value < 0 ? 0 : value;

    setFormData(prev => {
      let updated = { ...prev, [name]: newValue };
      // Auto-update egg color when bird type changes
      if (name === "birdType") {
        updated.eggColor = getDefaultEggColor(newValue);
      }
      return updated;
    });

    setErrors(prev => ({ ...prev, [name]: validateField(name, newValue) }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if(isSaving) return;
    

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
      setIsSaving(true)
      const payload = {
        collection: "eggs",
        action: "add",
        data: {
          branchId: formData.branch,
          typeId: formData.birdType,
          color: formData.eggColor,
          date: formData.date || today,
          quantity: Number(formData.quantity),
          price: Number(formData.price)
        }
      };

      await processData(payload);
      setSuccess("Egg added successfully!");
      // Reset form but keep today as date
      setFormData(prev => ({
        branch: branches.length === 1 ? branches[0].id : "",
        birdType: "",
        eggColor: "",
        date: today,
        quantity: "",
        price: "",
      }));
      onSuccess?.()
    } catch (err) {
      setServerError(err.message);
    } finally {
      setTimeout(() => setShake(false), setServerError(""), setSuccess(""), setIsSaving(false), 5000);
      
    }
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit}>
        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Branch */}
              {/* <label className={`${errors.branch ? "error-text" : ""} ${shake && errors.branch ? "shake" : ""}`}>Branch</label> */}
              <label className={`${errors.branch ? "error-text" : ""}  ${shake && errors.branch ? "shake" : ""}`}>Branch</label>
              {branches.length === 1 ? (
                <select
                  name="branch"
                  value={formData.branch}
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
              <label className={`${errors.birdType ? "error-text" : ""} ${shake && errors.birdType ? "shake" : ""}`}>
                Bird Type
                <span title="Select the bird type that laid the egg. Egg color will default automatically." style={{ marginLeft: '5px', cursor: 'help' }}>🛈</span>
              </label>
              <select
                name="birdType"
                value={formData.birdType}
                onChange={handleChange}
                className={`${errors.birdType ? "input-error" : ""} ${shake && errors.birdType ? "shake" : ""}`}
              >
                <option value=""></option>
                {birdTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              {errors.birdType && <small className="error-text">{errors.birdType}</small>}

            </div>
          </div>
        </div>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Egg Color */}
              <label className={`${errors.eggColor ? "error-text" : ""} ${shake && errors.eggColor ? "shake" : ""}`}>Egg Color</label>
              <select
                name="eggColor"
                value={formData.eggColor}
                onChange={handleChange}
                className={`${errors.eggColor ? "input-error" : ""} ${shake && errors.eggColor ? "shake" : ""}`}
              >
                <option value=""></option>
                <option value="White">White</option>
                <option value="Yellow">Yellow</option>
              </select>
              {errors.eggColor && <small className="error-text">{errors.eggColor}</small>}
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
              />
              {errors.price && <small className="error-text">{errors.price}</small>}
            </div>
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

export default AddEgg;
