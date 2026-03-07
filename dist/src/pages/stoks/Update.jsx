import React, { useState, useEffect, useMemo } from "react";
import { checkNumber } from "../../validations/validate";
import { processData } from "../../api";
import { FaEdit, FaSave } from "react-icons/fa";

const TAB_CONFIG = {
  Birds: { item: "bird", unit: "Birds", showType: true },
  Eggs: { item: "egg", unit: "Trays", showType: true },
  Feeds: { item: "feed", unit: "Kg / Bags", showType: false },
};

export default function UpdateStock({
  branchData = [],
  typeData = [],
  stockData = [],
  birdData = [],
  title,
  onSuccess,
}) {
  const tabConfig = useMemo(() => TAB_CONFIG[title] || {}, [title]);

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    age: "",
    quantity: "",
  });

  const [itemId, setItemId] = useState(null);
  const [originalQuantity, setOriginalQuantity] = useState(null);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ================= RESET ================= */
  useEffect(() => {
    setFormData({ branchId: "", typeId: "", age: "", quantity: "" });
    setItemId(null);
    setOriginalQuantity(null);
    setErrors({});
    setSuccess("");
    setServerError("");
  }, [tabConfig.item]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  /* ================= DERIVE AGES ================= */
  const existingAges = useMemo(() => {
    if (title !== "Birds" || !formData.branchId || !formData.typeId) return [];

    return [...new Set(
      birdData
        .filter(b =>
          b.branchId === formData.branchId &&
          b.typeId === formData.typeId &&
          b.active
        )
        .map(b => Number(b.age))
    )].sort((a, b) => a - b);
  }, [birdData, formData.branchId, formData.typeId, title]);

  /* ================= FIND ITEM ================= */
  useEffect(() => {
    const { branchId, typeId, age } = formData;

    resetItem();

    if (!branchId) return;

    /* ========== BIRDS ========== */
    if (title === "Birds") {
      if (!typeId || !age) return;

      const bird = birdData.find(
        b =>
          b.branchId === branchId &&
          b.typeId === typeId &&
          Number(b.age) === Number(age) &&
          b.active
      );

      if (!bird) return;

      applyItem(bird.id, bird.quantity);
      return;
    }

    /* ========== EGGS & FEEDS ========== */
    const stock = stockData.find(s =>
      s.branchId === branchId &&
      s.item === tabConfig.item &&
      (tabConfig.showType ? s.typeId === typeId : !s.typeId)
    );

    if (!stock) return;

    applyItem(stock.itemId || stock.id, stock.quantity);
  }, [
    formData.branchId,
    formData.typeId,
    formData.age,
    birdData,
    stockData,
    tabConfig,
    title,
  ]);

  function resetItem() {
    setItemId(null);
    setOriginalQuantity(null);
    setFormData(prev => ({ ...prev, quantity: "" }));
  }

  function applyItem(id, qty) {
    setItemId(id);
    setOriginalQuantity(qty);
    setFormData(prev => ({ ...prev, quantity: qty }));
  }

  /* ================= CHANGE DETECTION ================= */
  const hasQuantityChanged = useMemo(() => {
    if (originalQuantity === null) return false;
    return Number(formData.quantity) !== Number(originalQuantity);
  }, [formData.quantity, originalQuantity]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const e = {};

    if (!formData.branchId) e.branchId = "Branch is required";
    if (tabConfig.showType && !formData.typeId) e.typeId = "Type is required";
    if (title === "Birds" && !formData.age) e.age = "Age batch required";
    if (!checkNumber(formData.quantity)) e.quantity = `Invalid ${tabConfig.unit}`;
    if (!itemId) e.quantity = "No item exists";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!hasQuantityChanged || !validate()) return;

    setIsSaving(true);
    // console.log(formData);
    try {
      const collection =
        title === "Birds" ? "birds" :
        title === "Eggs" ? "eggs" :
        "feeds";

      const res = await processData({
        action: "update",
        collection,
        id: itemId,
        data: {...formData },
      });
      console.log(res);
      setSuccess(`${title} updated successfully`);
      setOriginalQuantity(Number(formData.quantity));
      onSuccess?.()
    } catch (err) {
      setServerError(err.message || "Update failed");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSuccess("");
        setServerError("");        
      }, 5000);
    }
  };

  return (
    <div className="norrechel-form-container">
      <h2 className="form-title"> Update {title}</h2>

      {serverError && <div className="error-message">{serverError}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="norrechel-grouped-inputs">
          <div>
            <label>Branch</label>
            <select name="branchId" value={formData.branchId} onChange={handleChange}>
              <option value="">-- Select --</option>
              {branchData.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <span className="error">{errors.branchId}</span>}
          </div>

          <div>
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              disabled={!itemId}
            />
            {errors.quantity && <span className="error">{errors.quantity}</span>}
          </div>
        </div>

        {tabConfig.showType && (
          <div className="norrechel-grouped-inputs">
            <div>
              <label>Type</label>
              <select name="typeId" value={formData.typeId} onChange={handleChange}>
                <option value="">-- Select --</option>
                {typeData.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.typeId && <span className="error">{errors.typeId}</span>}
            </div>

            {title === "Birds" && (
              <div>
                <label>Age (days)</label>
                <select
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!existingAges.length}
                >
                  <option value="">-- Select --</option>
                  {existingAges.map(a => (
                    <option key={a} value={a}>{a} days</option>
                  ))}
                </select>
                {errors.age && <span className="error">{errors.age}</span>}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!hasQuantityChanged || isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : `Save`}
        </button>
      </form>
    </div>
  );
}
