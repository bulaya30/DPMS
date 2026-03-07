import React, { useState, useEffect, Fragment } from "react";
import { getTypes, processData } from "../../api";
import { checkName, checkNumber } from "../../validations/validate";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";

function AddRule({typeData, onSuccess }) {
  const [types, setTypes] = useState([]);

  const [formData, setFormData] = useState({
    typeId: "",
    item:"",
    ranges: [{ minAge: "", maxAge: "", price: "", currency: "" }],
  });

  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ================= FETCH TYPES ================= */
  useEffect(() => {
    setTypes(typeData || []);
    
  }, [typeData]);

  /* ================= BASIC CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* ================= RANGE CHANGE ================= */
  const handleRangeChange = (index, field, value) => {
    const updated = [...formData.ranges];
    updated[index][field] = value;
    setFormData({ ...formData, ranges: updated });
  };

  /* ================= ADD ROW ================= */
  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      ranges: [...prev.ranges, { minAge: "", maxAge: "", price: "", currency: "" }],
    }));
  };

  /* ================= REMOVE ROW ================= */
  const removeRow = index => {
    const updated = [...formData.ranges];
    updated.splice(index, 1);
    setFormData({ ...formData, ranges: updated });
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {};

    if (!formData.typeId) newErrors.typeId = "Select bird type";
    if (!formData.item) newErrors.item = "Select an item";

    formData.ranges.forEach((r, i) => {
      if (!checkNumber(r.minAge)) newErrors[`min_${i}`] = "Invalid min age";
      if (!checkNumber(r.maxAge)) newErrors[`max_${i}`] = "Invalid max age";
      if (!checkNumber(r.price)) newErrors[`price_${i}`] = "Invalid price";
      if (!checkName(r.currency)) newErrors[`currency_${i}`] = "Invalid Currency";

      if (
        checkNumber(r.minAge) &&
        checkNumber(r.maxAge) &&
        Number(r.minAge) >= Number(r.maxAge)
      ) {
        newErrors[`range_${i}`] = "Min age must be less than max age";
      }
    });

    setErrors(newErrors);
    setShake(true);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    try {
      setLoading(true);
      setIsSaving(true);

      const payload = {
        collection: "prices",
        action: "add",
        data: {
          typeId: formData.typeId,
          item: formData.item,
          ranges: formData.ranges.map(r => ({
            minAge: Number(r.minAge),
            maxAge: Number(r.maxAge),
            price: Number(r.price),
            currency: r.currency,
          })),
        },
      };

      await processData(payload);
      setFormData({
        typeId: "",
        ranges: [{ minAge: "", maxAge: "", price: "" }],
      });

      onSuccess?.();
    } catch (err) {
      // console.log(err.message)
      setServerErrors(err.message);
    } finally {
      setLoading(false);
      setShake(false);
      setIsSaving(false);
    }
  };

  return (
    <div className="norrechel-form-container">
      <form onSubmit={handleSubmit} autoComplete="off">
      {serverErrors && <p className="error-text">{serverErrors}</p>}
        <h2>Add Price Rules</h2>

        {/* ================= HEADER ================= */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={errors.typeId ? "error-text" : ""}>Type</label>
            <select
              name="typeId"
              value={formData.typeId}
              onChange={handleChange}
              className={errors.typeId ? "input-error" : ""}
            >
              <option value="">-- Select --</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

          </div>
          <div>
            <label htmlFor="item" className={errors.item ? "error-text" : ""}>Item</label>
            <select
              name="item"
              value={formData.item}
              onChange={handleChange}
              className={errors.item ? "input-error" : ""}
            >
              <option value="">-- Select --</option>
              <option value="bird">Bird</option>
              <option value="egg">Egg</option>
            </select>
          </div>
        </div>

        {/* ================= RANGE BUILDER ================= */}
        <div className="schedule-builder">
          
          {formData.ranges.map((row, index) => (
            <Fragment key={index}>
              <div className="norrechel-grouped-inputs">

                <div>
                  <label className={errors[`min_${index}`] ? "error-text" : ""}>
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={row.minAge}
                    onChange={e =>
                      handleRangeChange(index, "minAge", e.target.value)
                    }
                    className={errors[`min_${index}`] ? "input-error" : ""}
                  />
                  {errors[`min_${index}`] && <small className="error-text">{errors[`min_${index}`]}</small>}
                </div>

                <div>
                  <label className={errors[`max_${index}`] ? "error-text" : ""}>
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={row.maxAge}
                    onChange={e =>
                      handleRangeChange(index, "maxAge", e.target.value)
                    }
                    className={errors[`max_${index}`] ? "input-error" : ""}
                  />
                  {errors[`max_${index}`] && <small className="error-text">{errors[`max_${index}`]}</small>}
                </div>
              </div>
              <div key={index} className="norrechel-grouped-inputs">
                <div>
                  <label className={errors[`price_${index}`] ? "error-text" : ""}>
                    Price
                  </label>
                  <input
                    type="number"
                    value={row.price}
                    onChange={e =>
                      handleRangeChange(index, "price", e.target.value)
                    }
                    className={errors[`price_${index}`] ? "input-error" : ""}
                  />
                  {errors[`price_${index}`] && <small className="error-text">{errors[`price_${index}`]}</small>}
                </div>
                <div>
                  <label htmlFor="" className={errors[`currency_${index}`] ? "error-text" : ""}>Currency</label>
                  <select
                    value={row.currency}
                    onChange={e =>
                      handleRangeChange(index, "currency", e.target.value)
                    }
                    className={errors[`currency_${index}`] ? "input-error" : ""}
                  >
                    <option value="">-- Select --</option>
                    <option value="UGX">UGX</option>
                    <option value="USD">USD</option>
                  </select>
                  {errors[`currency_${index}`] && <small className="error-text">{errors[`currency_${index}`]}</small>}
                </div>
              </div>
              {formData.ranges.length > 1 && (
                <button
                  type="button"
                  className="delete-row-btn"
                  onClick={() => removeRow(index)}
                >
                  <FaTrash />
                </button>
              )}            
            </Fragment>          
          ))}

          <div className="norrechel-grouped-inputs">
            <div>
              <button
                type="button"
                className="norrechel-btn split-btn"
                onClick={addRow}
                disabled={isSaving}
              >
                <FaPlus /> Add Range
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSaving}
                className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
              >
                {isSaving && <span className="spinner" />}
                <FaSave /> {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddRule;