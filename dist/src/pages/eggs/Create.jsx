import React, { useState, useEffect } from "react";
import { checkDate, checkName, checkNumber } from "../../validations/validate";
import { useProcessEgg } from "../../hooks/useEggs";
import { FaSave } from "react-icons/fa";

const user = JSON.parse(localStorage.getItem("user"));

function AddEgg({branchData, typeData}) {
  const { mutate, isPending } = useProcessEgg();
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
    if(isPending) return;
    

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
    mutate(payload, {
      onSuccess: () => {
        setSuccess("Egg added successfully!");
        setFormData({
          branch: branches.length === 1 ? branches[0].id : "",
          birdType: "",
          eggColor: "",
          date: today,
          quantity: "",
          price: "",
        });
      },

      onError: (err) => {
        setServerError(err.message);
      }
    });
    setTimeout(() => {
      setShake(false);
      setServerError("");
      setSuccess("");
    }, 5000);
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
            disabled={isPending}
            className={`norrechel-btn save-btn ${isPending ? "loading" : ""}`}
          >
            {isPending && <span className="spinner" />}
            <FaSave /> {isPending ? "Saving..." : "Save "}
        </button>
      </form>
    </div>
  );
}

export default AddEgg;
