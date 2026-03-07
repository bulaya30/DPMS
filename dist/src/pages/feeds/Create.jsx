import React, { useState, useEffect } from "react";
import { checkName, checkNumber } from "../../validations/validate";
import { getBranches, processData } from "../../api";
import { FaPlus, FaSave } from "react-icons/fa";

function AddFeed({branchData, onSuccess}) {
  const [branches, setBranches] = useState([]);
  

  const [formData, setFormData] = useState({
    branchId: "",
    name: "",
    quantity: "",
    unit: ""
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setBranches(branchData);
    };
    loadData();
  }, [branchData]);

  useEffect(() => {
    if(branches.length === 0) return;
    if (branches.length === 1) {
      setFormData(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches]);

  const validateField = (name, value) => {
    switch (name) {
      case "branchId":
      case "name":
      case "unit":
        return checkName(value) ? "" : "This field is required";

      case "quantity":
        return checkNumber(value) && value > 0
          ? ""
          : "Quantity must be greater than 0";

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

  const handleChange = e => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "quantity") {
      newValue = value < 0 ? 0 : value;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Inline validation
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, newValue),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if(isSaving) return;
    setServerError('');
    setShake(false);
    setTimeout(() => setShake(true), setServerError(''), 0);
    let newErrors = {};
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
      setIsSaving(true)
      const data = {
        collection: 'feeds',
        action: 'add',
        data: {
          ...formData
        }
      }
      await processData(data);
      setSuccess("Feed added successfully!");
      setFormData(prev => ({ ...prev, quantity: "", name:"" }));
      onSuccess?.()
    } catch (err) {
      setServerError( err.message);
    } finally {
      setTimeout(() => {
        setSuccess("");
        setServerError("");
      }, 5000);
      setIsSaving(false);
    }
  };


  return (
    <div className={`norrechel-form-container`}>
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>New Feed</h2>
        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Branch */}
              <label className={`${errors.branchId ? "error-text" : ""} ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
              {branches.length === 1 ? (
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className={`${errors.branchId ? "input-error" : ""} ${shake && errors.branchId ? "shake" : ""}`}
                  disabled
                >
                  <option value={branches[0].id}>{branches[0].name} ({branches[0].district})</option>
                </select>
              ):(
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className={`${errors.branchId ? "input-error" : ""} ${shake && errors.branchId ? "shake" : ""}`}
                >
                  <option value=""></option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.district})
                    </option>
                  ))}
                </select>

              )}
              {errors.branchId && <small className="error-text">{errors.branchId}</small>}

            </div>
            <div>
              {/* name */}
              <label className={`${errors.name ? "error-text" : ""} ${shake && errors.name ? "shake" : ""}`}>Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`${errors.name ? "input-error" : ""} ${shake && errors.name ? "shake" : ""}`}
              />
              {errors.type && (
                <small className="error-text">{errors.name}</small>
              )}
            </div>
          </div>
        </div>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Quantity */}
              <label className={`${errors.quantity ? "error-text" : ""} ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
              <input
                type="number"
                name="quantity"
                min={0}
                value={formData.quantity}
                onChange={handleChange}
                className={`${errors.quantity ? "input-error" : ""} ${shake && errors.quantity ? "shake" : ""}`}
              />
              {errors.quantity && (
                <small className="error-text">{errors.quantity}</small>
              )}

            </div>
            <div>
              <label className={`${errors.unit ? "error-text" : ""} ${shake && errors.unit ? "shake" : ""}`}>unit of Measure</label>
              <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className={`${errors.unit ? "input-error" : ""} ${shake && errors.unit ? "shake" : ""}`}
              >
                <option value=""></option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="bag">Bags</option>
                <option value="sack">Sacks</option>
                <option value="ton">Metric Tons (t)</option>
              </select>
              {errors.unit && <small className="error-text">{errors.unit}</small>}
            </div>
          </div>
        </div>
        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "save-btn loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AddFeed;
