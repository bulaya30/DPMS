import React, { useState, useEffect, Fragment, useMemo } from "react";
import { useProcessPrice } from "../../hooks/usePrice";
import { checkName, checkNumber } from "../../validations/validate";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";

function UpdateRule({ priceRules = [], typeData = [] }) {
  const { mutate, isPending: isSaving } = useProcessPrice();
  const types = typeData;


  const [formData, setFormData] = useState({
    typeId: "",
    item: "",
    ranges: [{ minAge: "", maxAge: "", price: "", currency: "" }],
  });

  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState();


  /* ================= AUTO-FILL FROM EXISTING RULE ================= */
  useEffect(() => {
    if (!formData.typeId || !formData.item) return;

    const existing = priceRules.find(
      r =>
        r.typeId === formData.typeId &&
        r.item === formData.item &&
        r.active !== false
    );

    if (existing) {
      setFormData(prev => ({
        ...prev,
        ranges: existing.ranges.map(r => ({
          minAge: r.minAge,
          maxAge: r.maxAge,
          price: r.price,
          currency: r.currency || "",
        })),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ranges: [{ minAge: "", maxAge: "", price: "", currency: "" }],
      }));
    }
  }, [formData.typeId, formData.item, priceRules]);

    const selectedRule = useMemo(() => {
    if (!formData.typeId || !formData.item) return null;

    return priceRules.find(
        r =>
        r.typeId === formData.typeId &&
        r.item === formData.item &&
        r.active !== false
    ) || null;
    }, [formData.typeId, formData.item, priceRules]);

    const isDirty = useMemo(() => {
        if (!selectedRule) return false;

        const normalize = r => ({
            minAge: Number(r.minAge),
            maxAge: Number(r.maxAge),
            price: Number(r.price),
            currency: r.currency || "",
        });

        const original = selectedRule.ranges.map(normalize);
        const current = formData.ranges.map(normalize);

        return (
            selectedRule.typeId !== formData.typeId ||
            selectedRule.item !== formData.item ||
            JSON.stringify(original) !== JSON.stringify(current)
        );
    }, [formData, selectedRule]);

  /* ================= BASIC CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors({});
    setServerErrors("");
  };

  /* ================= RANGE CHANGE ================= */
  const handleRangeChange = (index, field, value) => {
    const updated = [...formData.ranges];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, ranges: updated }));
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
    setFormData(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index),
    }));
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
      if (!checkName(r.currency)) newErrors[`currency_${i}`] = "Invalid currency";

      if (
        checkNumber(r.minAge) &&
        checkNumber(r.maxAge) &&
        Number(r.minAge) >= Number(r.maxAge)
      ) {
        newErrors[`range_${i}`] = "Min age must be less than max age";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate() || isSaving || !selectedRule || selectedRule === null) return;

    const payload = {
      collection: "prices",
      action: "update",
      id: selectedRule.id,
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
    mutate(payload, {
      onSuccess: () => {
        setSuccess("Rule updated successfully!");
        setFormData(prev => ({
          ...prev,
          typeId: "",
          item: "",
          ranges: [{ minAge: "", maxAge: "", price: "", currency: "" }],
        }))
      },
      onError: err => {
        setServerErrors(err.message);
      },
      onSettled: () => {
        setTimeout(() => {
          setSuccess("");
          setErrors({});
          setServerErrors("");
        }, 5000);
      },
    });
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverErrors && <p className="error-text">{serverErrors}</p>}
      <form onSubmit={handleSubmit} autoComplete="off">
       
        <h2>Update Rules</h2>

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
            <label className={errors.item ? "error-text" : ""}>Item</label>
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
                </div>
              </div>

              <div className="norrechel-grouped-inputs">
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
                </div>

                <div>
                  <label
                    className={errors[`currency_${index}`] ? "error-text" : ""}
                  >
                    Currency
                  </label>
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
                </div>
              </div>

              {formData.ranges.length > 1 && (
                <button
                  type="button"
                  className="delete-row-btn"
                  disabled={!selectedRule}
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
                disabled={isSaving || !isDirty}
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

export default UpdateRule;