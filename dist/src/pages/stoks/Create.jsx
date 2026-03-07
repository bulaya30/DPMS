import React, { useState, useEffect, useMemo } from "react";
import { checkNumber } from "../../validations/validate";
import { processData, getStocks } from "../../api";
import { FaPlus, FaSave } from "react-icons/fa";

const TAB_CONFIG = {
  Birds: {
    item: "bird",
    unit: "Birds",
    showType: true,
    showAge: true,
  },
  Eggs: {
    item: "egg",
    unit: "Trays",
    showType: true,
    showAge: false,
  },
  Feeds: {
    item: "feed",
    unit: "Kg / Bags",
    showType: false,
    showAge: false,
  },
};

function AddStock({ stockData, branchData, typeData, title, onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [stock, setStock] = useState([]);

  const tabConfig = useMemo(() => TAB_CONFIG[title] || {}, [title]);

  const [existingAges, setExistingAges] = useState([]);
  const [ageMatch, setAgeMatch] = useState(false);

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    item: "",
    quantity: "",
    age: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ================= FETCH DROPDOWNS ================= */
  useEffect(() => {
    setBranches(branchData);
    setTypes(typeData);
    setStock(stockData);
    if (branchData.length === 1) {
      setFormData(prev => ({ ...prev, branchId: branchData[0].id }));
    }

  }, [stockData, branchData, typeData]);

  /* ================= AUTO-SET ITEM + RESET ================= */
  useEffect(() => {
    setFormData({
      branchId: branchData.length === 1 ? branchData[0].id : "",
      typeId: "",
      item: tabConfig.item || "",
      quantity: "",
      age: "",
    });
    setExistingAges([]);
    setAgeMatch(false);
    setErrors({});
    setSuccess("");
    setServerError("");
  }, [tabConfig.item]);

  /* ================= SMART AGE DETECTION ================= */
  useEffect(() => {
    if (!tabConfig.showAge || !formData.typeId) return;

    const ages = stock
      .filter(
        s =>
          s.item === "bird" &&
          s.typeId === formData.typeId &&
          s.branchId === formData.branchId
      )
      .map(s => Number(s.age))
      .filter(a => !isNaN(a))
      .sort((a, b) => a - b);

    setExistingAges([...new Set(ages)]);
    setAgeMatch(false);
    setFormData(prev => ({ ...prev, age: "" }));
  }, [formData.typeId, formData.branchId, stock, tabConfig.showAge]);

  const handleAgeChange = val => {
    const age = Number(val);
    setFormData(prev => ({ ...prev, age }));
    setAgeMatch(existingAges.includes(age));
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {};

    if (!formData.branchId) newErrors.branchId = "Branch is required";

    if (tabConfig.showType && !formData.typeId)
      newErrors.typeId = "Type is required";

    if (!checkNumber(formData.quantity))
      newErrors.quantity = `Enter valid ${tabConfig.unit}`;

    if (tabConfig.showAge && !checkNumber(formData.age))
      newErrors.age = "Enter valid bird age (days)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSaving(true);

    const isBirds = title === "Birds";

    try {
      const payload = {
        action: "add",
        collection: isBirds ? "birds" : "stocks",
        data: {
          branchId: formData.branchId,
          typeId: tabConfig.showType ? formData.typeId : null,
          item: tabConfig.item,
          quantity: Number(formData.quantity),
          age: tabConfig.showAge ? Number(formData.age) : null,
        },
      };

      const res = await processData(payload);
      console.log(res);

      setSuccess(
        isBirds
          ? ageMatch
            ? `${title} quantity updated successfully`
            : `${title} batch added successfully`
          : `${title} stock added successfully`
      );

      setFormData(prev => ({
        ...prev,
        quantity: "",
        age: "",
        typeId: "",
      }));
      onSuccess?.()
    } catch (err) {
      setServerError(err.message || "Failed to process stock");
    } finally {
      setIsSaving(false);
      setTimeout(()=>{
        setServerError("");
        setSuccess("");
      }, 5000);
    }
  };


  return (
    <div className={`norrechel-form-container`}>
      <h2 className="form-title">
        Add {title}
      </h2>

      {serverError && <div className="error-message">{serverError}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="norrechel-grouped-inputs">
          {/* Branch */}
          <div>
            <label>Branch</label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              disabled={branches.length === 1}
            >
              <option value="">-- Select --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district})
                </option>
              ))}
            </select>
            {errors.branchId && (
              <span className="error">{errors.branchId}</span>
            )}
          </div>
          {/* Quantity */}
          <div>
            <label>Quantity </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder={`In ${tabConfig.unit}`}
            />
            {errors.quantity && (
              <span className="error">{errors.quantity}</span>
            )}
          </div>

        </div>
        
          {tabConfig.showType && (
            <div className="norrechel-grouped-inputs">
              {/* Type */}
              <div>
                <label>Type</label>
                <select
                  name="typeId"
                  value={formData.typeId}
                  onChange={handleChange}
                  placeholder="-- Select --"
                >
                  <option value="">-- Select --</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      </option>
                    ))}
                </select>
                {errors.typeId && (
                  <span className="error">{errors.typeId}</span>
                )}
              </div>
              {/* Age */}
              
              {tabConfig.showAge && 
                <div>
                  <label>Age (days)</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={e => handleAgeChange(e.target.value)}
                    placeholder="In days"
                  />
                  {existingAges.length > 0 && (
                    <div className="age-suggestions">
                      {existingAges.map(a => (
                        <button
                          key={a}
                          type="button"
                          className="age-chip"
                          onClick={() => handleAgeChange(a)}
                        >
                          {a} days
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {formData.age !== "" && (
                    <small className={ageMatch ? "age-match" : "age-new"}>
                      {ageMatch
                        ? "Existing batch — quantity will be updated"
                        : "New age batch — new birds group will be created"}
                    </small>
                  )}

                  {errors.age && <span className="error">{errors.age}</span>}

              </div>
            } 
            </div>
          )}

        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : `Save`}
        </button>
      </form>
    </div>
  );
}

export default AddStock;
