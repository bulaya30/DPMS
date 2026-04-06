import React, { useEffect, useState, useMemo } from "react";
import { checkNumber, checkName } from "../../validations/validate";
import { useProcessLoss } from "../../hooks/useLoss";
import { FaSave } from "react-icons/fa";

const LOSS_TAB_CONFIG = {
  feed: { item: 'feed', unit: "", showType: false, showAge: false, showName: true,},
  bird: { item: "bird", unit: "Pieces", showType: true, showAge: true,showName: false, },
  egg: { item: "egg", unit: "Trays", showType: true, showAge: false, showName: false, },
  "spoiled-egg": { item: "egg", unit: "Trays", showType: true, showAge: false, showName: false, },
};

export default function UpdateLoss({
  activeItem,
  lossData = [],
  birdData = [],
  eggData = [],
  feedData = [],
  branchData = [],
  typeData = [],
  onSuccess
}) {
  const { mutate, isPending: isSaving } = useProcessLoss();
  const tabConfig = LOSS_TAB_CONFIG[activeItem] || {};

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    age: "",
    quantity: "",
    feed: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ================== RESET ON TAB ================== */
   useEffect(() => {
     setFormData({
       branchId: branchData?.length === 1 ? branchData[0].id : "",
       typeId: "",
       item: tabConfig.item || "",
       quantity: "",
       age: "",
       feed: ""
     });
     setErrors({});
     setSuccess("");
     setServerError("");
   }, [tabConfig.item]);

  /* ================== DERIVE SELECTED ITEM ================== */
  const selectedItem = useMemo(() => {
    const { branchId, typeId, age, feed } = formData;
    if (!branchId) return null;

    if (activeItem === "bird") {
      if (!typeId || !age) return null;

      return birdData.find(
        b =>
          b.branchId === branchId &&
          b.typeId === typeId &&
          Number(b.age) === Number(age)
      );
    }

    if (activeItem === "egg" || activeItem === "spoiled-egg") {
      if (!typeId) return null;

      return eggData.find(
        e => e.branchId === branchId && e.typeId === typeId
      );
    }

    if (activeItem === "feed") {
      return feedData.find(f => f.branchId === branchId && f.name === feed);
    }

    return null;
  }, [activeItem, birdData, eggData, feedData, formData]);


  /* ================== FIND LOSS ================== */
  const selectedLoss = useMemo(() => {
    if (!selectedItem) return null;

    return lossData.find(l => l.itemId === selectedItem.id) || null;
  }, [lossData, selectedItem]);

  /* ================== LOAD EXISTING QUANTITY ================== */
  useEffect(() => {
    if (!selectedLoss) {
      setFormData(prev => ({ ...prev, quantity: "" }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      quantity: selectedLoss.quantity ?? "",
    }));
  }, [selectedLoss]);

  /* ================== DERIVE NAMES ================== */
  const existingNames = useMemo(() => {
    if(!formData.branchId) return [];
    return [ 
      ...new Set(
        feedData.filter(
          f => 
            f.branchId === formData.branchId
        )
        .map (f => f.name)
      )
    ]
  }, [feedData, formData.branchId]);

  /* ================== DERIVE AGES ================== */
  const existingAges = useMemo(() => {
    if (!formData.branchId || !formData.typeId) return [];

    return [
      ...new Set(
        birdData
          .filter(
            b =>
              b.branchId === formData.branchId &&
              b.typeId === formData.typeId
          )
          .map(b => Number(b.age))
      ),
    ].sort((a, b) => a - b);
  }, [birdData, formData.branchId, formData.typeId]);

  /* ================== VALIDATION ================== */
   const validate = () => {
      const newErrors = {};
  
      if (!formData.branchId) newErrors.branchId = "Branch is required";
  
      if (tabConfig.showName && !formData.feed) newErrors.feed = "Feed name is required";
  
      if (tabConfig.showType && !formData.typeId)
        newErrors.typeId = "Type is required";
  
      if (!checkNumber(formData.quantity) || formData.quantity === 0)
        newErrors.quantity = `Enter valid Quantity ${tabConfig.unit}`;
  
      if (tabConfig.showAge && !checkNumber(formData.age))
        newErrors.age = "Enter valid bird age (days)";
  
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

   /* ================= SHAKE RESET ================= */
    useEffect(() => {
      if (shake) {
       const timeout = setTimeout(() => setShake(false), 500);
       return () => clearTimeout(timeout);
     }
    }, [shake]);

  /* ================== CHANGE HANDLER ================== */
  const handleChange = e => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: ["quantity", "age"].includes(name)
        ? Math.max(0, value)
        : value,
    }));
  };

  /* ================== SUBMIT ================== */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedItem || !selectedLoss || isSaving) return;
    
    if (!validate()) {
      setShake(true);
      return;
    }
    const payload = {
      collection: "losses",
      action: "update",
      id: selectedLoss.id,
      data: {
        branchId: selectedLoss.branchId,
        typeId: tabConfig.showType ? selectedLoss.typeId : null,
        item: tabConfig.item,
        itemId: selectedItem.id,
        quantity: Number(formData.quantity),
        age: tabConfig.showAge ? Number(formData.age) : null,
        name: tabConfig.showName ? Number(formData.feed) : null,
        reason: activeItem === 'feed' ? 'Damaged Feeds quantity correction' : activeItem === 'bird' ? 'Dead Birds quantity correction' : 
        activeItem === 'egg' ? 'Broken Eggs quantity correction' : 'Spoiled Eggs quantity correction',
      },
    }
    mutate(payload, {
      onSuccess: () =>{
        setSuccess("Information updated successfully");
        setFormData(prev => ({ ...prev, quantity: "", typeId: "", age: "", feed: "" }));
      },
      onError: (err) => {
        setServerError(err.message || "Failed to update loss");
      },
      onSettled: () =>{
        setTimeout(() => {
          setSuccess("");
          setServerError("");
        }, 5000);
      }
    })
    
  };
  const fieldClass = name =>
    `${errors[name] ? "input-error" : ""} ${shake && errors[name] ? "shake" : ""}`;
  /* ================== RENDER ================== */
  return (
    <div className="norrechel-form-container">
      {serverError && <p className="error-text">{serverError}</p>}
      {success && <p className="success-text">{success}</p>}

      <form onSubmit={handleSubmit}>
        <h2 className="form-title">
          Update{" "}
          { activeItem === 'feed' ? 'Damaged Feed' :
          activeItem === "bird"
            ? "Dead Birds"
            : activeItem === "egg"
            ? "Broken Eggs"
            : "Spoiled Eggs"}
        </h2>

        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.branchId ? "error-text" : ""}  ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
            {branchData.length > 1 ? (
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className={fieldClass("branchId")}
              >
                <option value="">-- Select --</option>
                {branchData.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district})
                  </option>
                ))}
              </select>
            ) : (
            <select
              name="branchId"
              value={formData.branchId}
              disabled
            >
              <option value={branchData[0].id}>{branchData[0].name} ({branchData[0].district})</option>
            </select>
            )}
            {errors.branchId && <span className="error">{errors.branchId}</span>}
          </div>
          {tabConfig.showName && (
            <div>
              <label className={`${errors.feed ? "error-text" : ""}  ${shake && errors.feed ? "shake" : ""}`}>Name</label>
              <select
                name="feed"
                value={formData.feed}
                onChange={handleChange}
                className={fieldClass("feed")}
              >
                 <option value="">-- Select --</option>
                {existingNames.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {errors.feed && <small className="error-text">{errors.feed}</small>}
            </div>
          )}
          {tabConfig.showType && (
            <div>
              <label className={`${errors.typeId ? "error-text" : ""}  ${shake && errors.typeId ? "shake" : ""}`}>Type</label>
              <select
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
                className={fieldClass("typeId")}
              >
                <option value="">-- Select --</option>
                {typeData.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.typeId && <small className="error-text">{errors.typeId}</small>}
            </div>
          )}
        </div>

        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.quantity ? "error-text" : ""} ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
            <input
              type="number"
              name="quantity"
              min={0}
              value={formData.quantity}
              onChange={handleChange}
              disabled={!selectedLoss}
              className={fieldClass("quantity")}
            />
            {errors.quantity && <small className="error-text">{errors.quantity}</small>}
          </div>

          {tabConfig.showAge && (
            <div>
              <label className={`${errors.age ? "error-text" : ""}  ${shake && errors.age ? "shake" : ""}`}>Age (days)</label>
              <select
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={fieldClass("age")}
              >
                <option value="">-- Select --</option>
                {existingAges.map(a => (
                  <option key={a} value={a}>
                    {a} days
                  </option>
                ))}
              </select>
              {errors.age && <small className="error-text">{errors.age}</small>}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!selectedLoss || isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
