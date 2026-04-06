import React, { useState, useEffect, useMemo } from "react";
import { checkNumber } from "../../validations/validate";
import { useProcessLoss } from "../../hooks/useLoss";
import { FaSave } from "react-icons/fa";

const LOSS_TAB_CONFIG = {
  feed: { item: 'feed', unit: "", showType: false, showAge: false, showName: true,},
  bird: { item: "bird", unit: "Pieces", showType: true, showAge: true,showName: false, },
  egg: { item: "egg", unit: "Trays", showType: true, showAge: false, showName: false, },
  "spoiled-egg": { item: "egg", unit: "Trays", showType: true, showAge: false, showName: false, },
};


function AddLoss({ activeItem, birdData, eggData, feedData, brancheData, typeData, onSuccess }) {
  const { mutate, isPending: isSaving } = useProcessLoss();
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [birds, setBirds] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const tabConfig = useMemo(
    () => LOSS_TAB_CONFIG[activeItem] || {},
    [activeItem]
  );

  const stock = useMemo(() => {
    if (activeItem === "Birds") return birdData;
    if (activeItem === "Eggs") return eggData;
    if (activeItem === "Feeds") return feedData;
    return [];
  }, [activeItem, birdData, eggData, feedData]);


  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    item: "",
    quantity: "",
    age: "",
    feed: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ================= INIT ================= */
  useEffect(() => {
    const normalizedBranches = Array.isArray(brancheData) ? brancheData : [brancheData];
      setBranches(normalizedBranches);
      setTypes(typeData);
      setBirds(birdData);
      setEggs(eggData);
      setFeeds(feedData);
      
      // Pre-select branch if only one
      if (normalizedBranches.length === 1) {
        setFormData(prev => ({ ...prev, branchId: normalizedBranches[0].id }));
      }
  }, [brancheData, typeData. birdData, eggData, feedData]);

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
  /* ================= DERIVE AGES ================= */
    const existingAges = useMemo(() => {
      if (!birds || !formData.branchId || !formData.typeId) return [];
        return [...new Set(
          birds
            .filter(b =>
              b.branchId === formData.branchId &&
              b.typeId === formData.typeId &&
              b.active
            )
          .map(b => Number(b.age))
      )].sort((a, b) => a - b);
    }, [birds, formData.branchId, formData.typeId]);

  /* ================= RESET ON TAB ================= */
  useEffect(() => {
    setFormData({
      branchId: brancheData?.length === 1 ? brancheData[0].id : "",
      typeId: "",
      item: tabConfig.item || "",
      quantity: "",
      age: "",
      feed: "",
    });
    setErrors({});
    setSuccess("");
    setServerError("");
  }, [tabConfig.item]);

  /* ================= LOAD SELECTED ITEM ================= */
  const selectedItem = useMemo(() => {
    if (!activeItem || !formData.branchId) return;
  
    let item = null;
  
    if (activeItem === "bird") {
      if (!formData.typeId || !formData.age) return;
        
      item = birds.find(
        b =>
          b.branchId === formData.branchId &&
          b.typeId === formData.typeId &&
          Number(b.age) === Number(formData.age)
      );
  
    } else if (activeItem === "egg") {
      if (!formData.typeId) return;
  
      item = eggs.find(
        e =>
          e.branchId === formData.branchId &&
          e.typeId === formData.typeId
      );
  
    } else if (activeItem === "feed") {
      if(!formData.feed) return
      item = feeds.find(
        f => f.branchId === formData.branchId &&
        f.name === formData.feed
      );
    }
    return item
  
  }, [
      activeItem,
      formData.branchId,
      formData.typeId,
      formData.age,
      birds,
      eggs,
      feeds
  ]);

   /* ================= SHAKE RESET ================= */
   useEffect(() => {
     if (shake) {
       const timeout = setTimeout(() => setShake(false), 500);
       return () => clearTimeout(timeout);
     }
   }, [shake]);

  /* ================= CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  /* ================= VALIDATION ================= */
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

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    setServerError("");
    setSuccess("");

    if (!validate()) {
      setShake(true);
      return;
    }
    
    const payload = {
      action: "add",
      collection: "losses",
      data: {
        branchId: formData.branchId,
        feed: tabConfig.showName ? formData.feed : null,
        typeId: tabConfig.showType ? formData.typeId : null,
        item: tabConfig.item,
        itemId: selectedItem.id ?? null,
        quantity: Number(formData.quantity),
        age: tabConfig.showAge ? Number(formData.age) : null,
        reason: activeItem === 'feed' ? 'Damaged Feed' : activeItem === 'bird' ? 'Dead Birds' : 
        activeItem === 'egg' ? 'Broken Eggs' : 'Spoiled Eggs',
      },
    };
    mutate(payload, {
      onSuccess: () => {
        setSuccess(`Information recorded successfully`);
        setFormData(prev => ({
          ...prev,
          branchId: brancheData?.length === 1 ? brancheData[0].id : "",
          quantity: "",
          age: "",
          typeId: "",
          feed: "",
        }));
      },
      onError: err => {
        setServerError(err.message || "Failed to process loss");
      },
      onSettled: () => {
        setTimeout(() => {
          setErrors({});
          setServerError("");
          setSuccess("");
          setShake(false);
        }, 5000);
      },
    });

  };
  const fieldClass = name =>
    `${errors[name] ? "input-error" : ""} ${shake && errors[name] ? "shake" : ""}`;

  return (
    <div className="norrechel-form-container">
      <h2 className="form-title">
        Add { activeItem === 'feed' ? 'Damaged Feed' :
        activeItem === 'bird' ? 'Dead Birds' : 
        activeItem === 'egg' ? 'Broken Eggs' : 'Spoiled Eggs'}
      </h2>

      {serverError && <p className="error-text">{serverError}</p>}
      {success && <p className="success-text">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={`${errors.branchId ? "error-text" : ""}  ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              disabled={branches.length === 1}
              className={fieldClass("branchId")}
            >
              <option value="">-- Select --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district})
                </option>
              ))}
            </select>
            {branches.length > 1 && errors.branchId && <small className="error-text">{errors.branchId}</small>}
          </div>
          {tabConfig.showName && (
            <div>
              <label className={`${errors.feed ? "error-text" : ""}  ${shake && errors.fedd ? "shake" : ""}`}>Name</label>
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
                  {types.map(t => (
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
              value={formData.quantity}
              onChange={handleChange}
              className={fieldClass("quantity")}
            />
            {errors.quantity && <small className="error-text">{errors.quantity}</small>}
          </div>

          {tabConfig.showAge && (
            <div>                
                <label className={`${errors.age ? "error-text" : ""}  ${shake && errors.quantity ? "shake" : ""}`}>Age (days)</label>
                <select
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!existingAges.length}
                  className={fieldClass("age")}
                >
                  <option value="">-- Select --</option>
                  {existingAges.map(a => (
                    <option key={a} value={a}>{a} days</option>
                  ))}
                </select>
                {errors.age && <small className="error-text">{errors.age}</small>}
              </div>
            )}
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

export default AddLoss;
