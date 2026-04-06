import React, { useState, useEffect, useMemo } from "react";
import { checkNumber } from "../../validations/validate";
import { useProcessStock } from "../../hooks/useStocks";
import { FaEdit, FaSave } from "react-icons/fa";

const TAB_CONFIG = {
  Birds: { item: "bird", unit: "Birds", showType: true, showAge: true, showName: false },
  Eggs: { item: "egg", unit: "Trays", showType: true, showAge: false, showName: false },
  Feeds: { item: "feed", unit: "Kg / Bags", showType: false, showAge: false, showName: true },
};

export default function UpdateStock({
  branchData = [],
  typeData = [],
  stockData = [],
  birdData = [],
  feedData = [],
  title,
}) {
  const { mutate, isPending: isSaving } = useProcessStock();
  const tabConfig = useMemo(() => TAB_CONFIG[title] || {}, [title]);

  const branches = branchData || [];
  const types = typeData || [];
  const stocks = stockData || [];
  const feeds = feedData || [];
  const birds = birdData || [];

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    age: "",
    quantity: "",
    name: "",
  });

  const [itemId, setItemId] = useState(null);
  const [originalQuantity, setOriginalQuantity] = useState(null);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

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
      birds
        .filter(b =>
          b.branchId === formData.branchId &&
          b.typeId === formData.typeId &&
          b.active
        )
        .map(b => Number(b.age))
    )].sort((a, b) => a - b);
  }, [birds, formData.branchId, formData.typeId, title]);

  /* ================= FIND ITEM ================= */
  useEffect(() => {
    const { branchId, typeId, age } = formData;

    resetItem();

    if (!branchId) return;

    /* ========== BIRDS ========== */
    if (title === "Birds") {
      if (!typeId || !age) return;

      const bird = birds.find(
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
    const stock = stocks.find(s =>
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
    birds,
    stocks,
    tabConfig,
    title,
  ]);

  const feedNames = useMemo(() => {
    if (title !== "Feeds" || !formData.branchId ) return [];

    return [...new Set(
      feeds
        .filter(b =>
          b.branchId === formData.branchId
        )
        .map(b => b.name)
    )].sort((a, b) => a - b);
  }, [feeds, formData.branchId, title]);

  /* ================= RESET ITEM ================= */
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
    if(tabConfig.showName && !formData.name) e.name = "Feed name is required";
    if (!itemId) e.quantity = "No item exists";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SHAKE RESET ================= */
   useEffect(() => {
     if (shake) {
       const timeout = setTimeout(() => setShake(false), 500);
       return () => clearTimeout(timeout);
     }
   }, [shake]);

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!hasQuantityChanged || !validate()) return;

    
    const collection =
      title === "Birds" ? "birds" :
      title === "Eggs" ? "eggs" :
      "feeds";
    const payload = {
      action: "update",
      collection: collection,
      id: itemId,
      data: {...formData },
    };
    mutate(payload, {
      onSuccess: () => {
        setSuccess(`${title} updated successfully`);
        setOriginalQuantity(Number(formData.quantity));
        setFormData(prev => ({ 
          ...prev, 
          branchId: branches.length === 1 ? branches[0].id : "", 
          typeId: "", 
          age: "",
          name: "",
          quantity: "" 
        }));
      },
      onError: (error) => {
        setServerError(error.message || "Update failed");
      },
      onSettled: () => {
        setTimeout(() => {
          setSuccess("");
          setServerError("");
        }, 5000);
      },
    });
  };

  return (
    <div className="norrechel-form-container">
      <h2 className="form-title"> Update {title}</h2>

      {serverError && <p className="error-text">{serverError}</p>}
      {success && <p className="success-text">{success}</p>}

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

          {tabConfig.showType && (
            <div>
              <label>Type</label>
              <select name="typeId" value={formData.typeId} onChange={handleChange}>
                <option value="">-- Select --</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.typeId && <span className="error">{errors.typeId}</span>}
            </div>
          )}

          {tabConfig.showName && (
            <div>
              <label>Name</label>
              <select 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                disabled={!feedNames.length}
                >
                  <option value="">-- Select --</option>
                  {feedNames.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
          )}
        </div>

        <div className="norrechel-grouped-inputs">
          <div>
            <label>Quantity</label>
            <input
              type="text"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
            />
            {errors.quantity && <span className="error">{errors.quantity}</span>}
          </div>
          {tabConfig.showAge && (
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
