import React, { useState, useEffect, useMemo } from "react";
import { checkNumber } from "../../validations/validate";
import { useProcessStock } from "../../hooks/useStocks";
import { FaSave } from "react-icons/fa";

const TAB_CONFIG = {
  Birds: {
    item: "bird",
    unit: "Birds",
    showType: true,
    showAge: true,
    showName: false,
  },
  Eggs: {
    item: "egg",
    unit: "Trays",
    showType: true,
    showAge: false,
    showName: false,
  },
  Feeds: {
    item: "feed",
    unit: "Kg / Bags",
    showType: false,
    showAge: false,
    showName: true,
  },
};

function AddStock({ stockData, branchData, typeData, title, feedData, }) {
  const { mutate, isPending: isSaving } = useProcessStock();
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [stock, setStock] = useState([]);
  const [feeds, setFeeds] = useState([]);

  const tabConfig = useMemo(() => TAB_CONFIG[title] || {}, [title]);

  const [existingAges, setExistingAges] = useState([]);
  const [ageMatch, setAgeMatch] = useState(false);

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    item: "",
    quantity: "",
    age: "",
    name: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ================= FETCH DROPDOWNS ================= */
  useEffect(() => {
    setBranches(branchData);
    setTypes(typeData);
    setStock(stockData);
    setFeeds(feedData); 
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
      name: "",
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

  const feedNames = useMemo(() => {
    if (title !== "Feeds" || !formData.branchId) return [];
    return [
      ...new Set(
        feeds
          .filter(f => f.branchId === formData.branchId)
          .map(f => f.name)
    )].sort((a, b) => a - b);
  }, [title, feeds, formData.branchId]);


  /* ================= SHAKE RESET ================= */
   useEffect(() => {
     if (shake) {
       const timeout = setTimeout(() => setShake(false), 500);
       return () => clearTimeout(timeout);
     }
   }, [shake]);

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

    if(tabConfig.showName && !formData.name)
      newErrors.name = "Feed name is required";

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


    const isBirds = title === "Birds";
    const collection = title === "Birds" ? "birds" : title === "Eggs" ? "eggs" : "feeds";
    const payload = {
    action: collection !== 'birds' ? "stock" : "add",
      collection: collection,
      data: {
        branchId: formData.branchId,
        typeId: tabConfig.showType ? formData.typeId : null,
        item: tabConfig.item,
        quantity: Number(formData.quantity),
        age: tabConfig.showAge ? Number(formData.age) : null,
        name: tabConfig.showName ? formData.name : null
      },
    };
    console.log(payload);
    mutate(payload, {
      onSuccess: () => {
        setSuccess(
          isBirds
            ? ageMatch
              ? `${title} quantity updated successfully`
              : `${title} batch added successfully`
            : `${title} stock added successfully`
        );
        setFormData(prev => ({
          ...prev,
          branchId: branches.length === 1 ? branches[0].id : "",
          quantity: "",
          age: "",
          typeId: "",
        }));
      },
      onError: err => {
        setServerError(err.message || "Failed to process stock");
      },
      onSettled: () => {
        setTimeout(() => {
          setServerError("");
          setSuccess("");
        }, 5000);
      },
    });
    
  };


  return (
    <div className={`norrechel-form-container`}>
      <h2 className="form-title">
        New {title} Stock
      </h2>

      {serverError && <p className="error-text">{serverError}</p>}
      {success && <p className="success-text">{success}</p>}

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
          {/* Name */}
          {tabConfig.showName && (
            <div>
              <label>Name</label>
              <select 
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={feedNames.length === 0}
              >
                <option value="">-- Select --</option>
                {feedNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
          )}
          {/* Type */}
          {tabConfig.showType && (
            <div>
              <label>Type</label>
              <select
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
              >
                <option value="">-- Select --</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.typeId && <span className="error">{errors.typeId}</span>}
            </div>
          )}  
        </div>
          <div className="norrechel-grouped-inputs">
            {/* Quantity */}
            <div>
              <label>Quantity ({tabConfig.unit})</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <span className="error">{errors.quantity}</span>
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
