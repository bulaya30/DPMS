import React, { useEffect, useState, useMemo } from "react";
import { checkNumber, checkName } from "../../validations/validate";
import { processData } from "../../api";
import { FaEdit, FaSave } from "react-icons/fa";

function UpdateFeed({ feeds = [], branchData = [], onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shake, setShake] = useState(false);

  const [formData, setFormData] = useState({
    branch: "",
    feedId: "",
    name: "",
    quantity: "",
    unit: "kg",
  });

  const [originalData, setOriginalData] = useState({
    branch: "",
    feedId: "",
    name: "",
    quantity: "",
    unit: "",
  });

  const [hasFeed, setHasFeed] = useState(false);

  /* ================= INIT BRANCHES ================= */
  useEffect(() => {
    setBranches(branchData);

    if (branchData.length === 1) {
      setFormData(prev => ({
        ...prev,
        branch: branchData[0].id
      }));
    }
  }, [branchData]);


  /* ================= FILTERED FEEDS ================= */
  const branchFeeds = useMemo(() => {
    if (!formData.branch) return [];
    return feeds.filter(
      f => String(f.branchId) === String(formData.branch)
    );
  }, [feeds, formData.branch]);

  /* ================= BRANCH CHANGE ================= */
  useEffect(() => {
    if (!formData.branch) {
      setHasFeed(false);
      setFormData(prev => ({
        ...prev,
        feedId: "",
        name: "",
        quantity: "",
        unit: "",
      }));
      setOriginalData({
        branch: "",
        feedId: "",
        name: "",
        quantity: "",
        unit: "",
      });
      return;
    }

    if (!branchFeeds.length) {
      setHasFeed(false);
      return;
    }

    setHasFeed(true);
  }, [formData.branch, branchFeeds]);

  /* ================= FEED CHANGE ================= */
  useEffect(() => {
    if (!formData.feedId) return;

    const feed = feeds.find(f => f.id === formData.feedId);
    if (!feed) return;

    const next = {
      branch: feed.branchId,
      feedId: feed.id,
      name: feed.name ?? "",
      quantity: feed.quantity ?? "",
      unit: feed.unit ?? "",
    };

    setFormData(prev => ({ ...prev, ...next }));
    setOriginalData(next);
  }, [formData.feedId, feeds]);
  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branch":
      case "feedId":
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

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));

    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  /* ================= RULES ================= */
  const canEdit =
    hasFeed &&
    (Number(originalData.quantity) > 0 ||
      originalData.name ||
      originalData.unit);

  const hasChanged =
    Number(formData.quantity) !== Number(originalData.quantity) ||
    formData.name !== originalData.name ||
    formData.unit !== originalData.unit;

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!canEdit || !hasChanged || isSaving) return;

    let newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setShake(true);
      return;
    }

    try {
      setIsSaving(true);

      await processData({
        collection: "feeds",
        action: "update",
        id: formData.feedId,
        data: {
          quantity: Number(formData.quantity),
          name: formData.name,
          unit: formData.unit,
        },
      });
      setSuccess("Information updated successfully!");

      setFormData(prev => ({
        ...prev,
        feedId: "",
        name: "",
        quantity: "",
        unit: "",
      }));
      onSuccess?.();
    } catch (err) {
      setServerError(err.message || "Update failed");
    } finally {
      setTimeout(() => {
        setSuccess("");
        setServerError("");
      }, 5000);
      setIsSaving(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Update Feed</h2>

        <div className="norrechel-grouped-inputs">
          {/* ===== BRANCH ===== */}
          <div>
            <label className={`${errors.branch ? "error-text" : ""} ${shake && errors.branch ? "shake" : ""}`}>Branch</label>
            {branches.length === 1 ? (
              <select disabled value={branches[0].id}>
                <option>{branches[0].name}</option>
              </select>
            ) : (
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className={`${errors.branch ? "input-error" : ""} ${shake && errors.branch ? "shake" : ""}`}
              >
                <option value=""></option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district})
                  </option>
                ))}
              </select>
            )}
            {errors.branch && <small className="error-text">{errors.branch}</small>}
          </div>

          {/* ===== FEED SELECT ===== */}
          <div>
            <label className={`${errors.feedId ? "error-text" : ""} ${shake && errors.feedId ? "shake" : ""}`}>Name</label>
            <select
              name="feedId"
              value={formData.feedId}
              onChange={handleChange}
              className={`${errors.feedId ? "input-error" : ""} ${shake && errors.feedId ? "shake" : ""}`}
              disabled={!formData.branch}
            >
              <option value=""></option>
              {branchFeeds.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {errors.feedId && (
              <span className="error-text">{errors.feedId}</span>
            )}
          </div>
        </div>

        <div className="norrechel-grouped-inputs">
          {/* ===== QUANTITY ===== */}
          <div>
            <label className={`${errors.quantity ? "error-text" : ""} ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              disabled={!canEdit}
              className={`${errors.quantity ? "input-error" : ""} ${shake && errors.quantity ? "shake" : ""}`}
            />
            {errors.quantity && (
              <span className="error-text">{errors.quantity}</span>
            )}
          </div>

          {/* ===== UNIT ===== */}
          <div>
            <label className={`${errors.unit ? "error-text" : ""} ${shake && errors.unit ? "shake" : ""}`}>unit of Measure</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              disabled={!canEdit}
              className={`${errors.unit ? "input-error" : ""} ${shake && errors.unit ? "shake" : ""}`}
            >
              <option value=""></option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="bag">Bags</option>
              <option value="sack">Sacks</option>
              <option value="ton">Metric Tons (t)</option>
            </select>
            {errors.unit && (
              <span className="error-text">{errors.unit}</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canEdit || !hasChanged}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default UpdateFeed;
