import React, { useEffect, useState, useMemo } from "react";
import { checkNumber, checkName } from "../../validations/validate";
import { processData } from "../../api";
import { FaEdit, FaSave } from "react-icons/fa";

function UpdateBird({birdData, brancheData, typeData }) {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    quantity: "",
    age: "",
  });
  // console.log(birdData)
  const [originalData, setOriginalData] = useState({
    quantity: "",
    age: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasBird, setHasBird] = useState(false);

  /* ================= FETCH BRANCHES & TYPES ================= */
  useEffect(() => {
    const fetchData = async () => {
      const normalizedBranches = Array.isArray(brancheData) ? brancheData : [brancheData];
      setBranches(normalizedBranches);
      setTypes(typeData);
      
      // Pre-select branch if only one
      if (normalizedBranches.length === 1) {
        setFormData(prev => ({ ...prev, branchId: normalizedBranches[0].id }));
      }
    };
    fetchData();
  }, [brancheData, typeData]);
  /* ================= DERIVE AGES ================= */
  const existingAges = useMemo(() => {
    if (!birdData || !formData.branchId || !formData.typeId) return [];
      return [...new Set(
        birdData
          .filter(b =>
            b.branchId === formData.branchId &&
            b.typeId === formData.typeId &&
            b.active
          )
        .map(b => Number(b.age))
    )].sort((a, b) => a - b);
  }, [birdData, formData.branchId, formData.typeId]);
  /* ================= LOAD SELECTED BIRD ================= */
  useEffect(() => {
    const { branchId, typeId, age } = formData;

    if (!branchId || !typeId || !age) {
      setHasBird(false);
      setFormData(prev => ({ ...prev, quantity: "",}));
      return;
    }

    const bird = birdData.find(
      b =>
        String(b.branchId) === String(branchId) &&
        String(b.typeId) === String(typeId) &&
        Number(b.age) === Number(age)
    );

    if (!bird) {
      setHasBird(false);
      setFormData(prev => ({ ...prev, quantity: "", }));
      return;
    }

    setHasBird(true);
    setFormData(prev => ({
      ...prev,
      quantity: bird.quantity ?? "",
    }));
  }, [formData.branchId, formData.typeId, formData.age, birdData]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branchId":
      case "typeId":
        return checkName(value) ? "" : "This field is required";
      case "quantity":
      case "age":
        return checkNumber(value) && value > 0
          ? ""
          : "Must be greater than 0";
      default:
        return "";
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    const newValue = ["quantity", "age"].includes(name)
      ? Math.max(0, value)
      : value;

    if (name === "typeId") {
      setFormData(prev => ({
        ...prev,
        typeId: value,
        age: "",
        quantity: "",
      }));
    }
    else if (name === "age") {
      setFormData(prev => ({
        ...prev,
        age: value,
        quantity: "",
      }));
    }
    else {
      setFormData(prev => ({ ...prev, [name]: newValue }));
    }
    setErrors(prev => ({ ...prev, [name]: validateField(name, newValue) }));
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
    if (!hasBird || isSaving) return;

    // Validate all fields
    let newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      return;
    }

    try {
      setIsSaving(true);
      const bird = birdData.find(
        b => b.branchId === formData.branchId &&
        b.typeId === formData.typeId &&
        Number(b.age) === Number(formData.age)
      );
      if (!bird) return;

      await processData({
        collection: "birds",
        action: "update",
        id: bird.id,
        data: {
          branchId: bird.branchId,
          typeId: bird.typeId,
          quantity: Number(formData.quantity),
          age: Number(formData.age),
        },
      });

      setSuccess("Information updated successfully!");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setTimeout(() => {
        setShake(false);
        setErrors({});
        setServerError("");
        setSuccess("");
      }, 5000);
      setIsSaving(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      {hasBird === false && formData.branchId && formData.typeId && (
        <p className="error-text">No bird found for selected branch and type.</p>
      )}

      <form onSubmit={handleSubmit}>
        <h2>Update a Bird</h2>
        {/* ===== BRANCH & TYPE ===== */}
        {/* <div className="inputs"> */}
          <div className="norrechel-grouped-inputs">
            <div>
              <label>Branch</label>
              {branches.length === 1 ? (
                <select
                  name="branchId"
                  value={branches[0].id}
                  className={errors.branchId ? "input-error" : ""}
                  disabled
                >
                  <option value={branches[0].id}>{branches[0].name} ({branches[0].district})</option>
                </select>
              ) : (
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className={errors.branchId ? "input-error" : ""}
                >
                  <option value=""></option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.district})
                    </option>
                  ))}
                </select>
              )}
              {branches.length > 1 && errors.branchId && (
                <small className="error-text">{errors.branchId}</small>
              )}
            </div>

            <div>
              <label className={errors.typeId ? "error-text" : ""}>
                Bird Type
              </label>
              <select
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
                className={errors.typeId ? "input-error" : ""}
              >
                <option value=""></option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.typeId && (
                <small className="error-text">{errors.typeId}</small>
              )}
            </div>
          </div>
        {/* </div> */}

        {/* ===== QUANTITY & AGE ===== */}
        {/* <div className="inputs"> */}
          <div className="norrechel-grouped-inputs">
            <div>
              <label className={errors.quantity ? "error-text" : ""}>
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                min={0}
                value={formData.quantity}
                onChange={handleChange}
                className={errors.quantity ? "input-error" : ""}
                disabled={!hasBird}
              />
              {errors.quantity && (
                <small className="error-text">{errors.quantity}</small>
              )}
            </div>

            <div>
              <div>                
                <label className={errors.age ? "error-text" : ""}>
                  Age (days)
                </label>
                <select
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!existingAges.length}
                  className={errors.age ? "input-error" : ""}
                >
                  <option value="">Select age batch</option>
                  {existingAges.map(a => (
                    <option key={a} value={a}>{a} days</option>
                  ))}
                </select>
                {errors.age && <span className="error">{errors.age}</span>}
              </div>

            </div>
          </div>
        {/* </div> */}

        {/* ===== SUBMIT BUTTON ===== */}
        <button
          type="submit"
          disabled={!hasBird || isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default UpdateBird;
