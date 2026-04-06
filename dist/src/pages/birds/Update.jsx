import React, { useEffect, useState, useMemo } from "react";
import { checkNumber, checkName } from "../../validations/validate";
import { useProcessBird } from "../../hooks/useBirds";
import { FaSave } from "react-icons/fa";

function UpdateBird({birdData = [], brancheData = [], typeData = [] }) {
  const {mutate, isPending: isSaving} = useProcessBird();

  const branches = Array.isArray(brancheData) ? brancheData : [brancheData];;
  const types = Array.isArray(typeData) ? typeData : [typeData];;
  const birds = Array.isArray(birdData) ? birdData : [birdData];;

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    quantity: "",
    age: "",
  });
  
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [hasBird, setHasBird] = useState(false);


  useEffect(() => {
    if (branches.length === 1) {
      setFormData(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches]);

  /* ================= DERIVE AGES ================= */
  const existingAges = useMemo(() => {
    if (!birds || !formData.branchId || !formData.typeId) return [];

    return [...new Set(
      birds
        .filter(b =>
          String(b.branchId) === String(formData.branchId) &&
          String(b.typeId) === String(formData.typeId) &&
          b.active
        )
        .map(b => Number(b.age))
    )].sort((a, b) => a - b);



  }, [birds, formData.branchId, formData.typeId]);
  
  /* ================= LOAD SELECTED BIRD ================= */
  useEffect(() => {
    const { branchId, typeId, age } = formData;

    if (!branchId || !typeId || !age) {
      setHasBird(false);
      setFormData(prev => ({ ...prev, quantity: "",}));
      return;
    }

    const bird = birds.find(
      b =>
        String(b.branchId) === String(branchId) &&
        String(b.typeId) === String(typeId) &&
        Number(b.age) === Number(age)
    );

    if (!bird) {
      setHasBird(false);
      setFormData(prev => ({ ...prev, quantity: "" }));
      return;
    }

    setHasBird(true);
    setFormData(prev => ({
      ...prev,
      quantity: bird.quantity ?? "",
    }));
  }, [formData.branchId, formData.typeId, formData.age, birds]);

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

    const bird = birds.find(
      b =>
        String(b.branchId) === String(formData.branchId) &&
        String(b.typeId) === String(formData.typeId) &&
        Number(b.age) === Number(formData.age)
    );

    if (!bird) return;

    const payload = {
      collection: "birds",
      action: "update",
      id: bird.id,
      data: {
        branchId: bird.branchId,
        typeId: bird.typeId,
        quantity: Number(formData.quantity),
        age: Number(formData.age),
      },
    }
    
    mutate(payload, {
      onSuccess: () => {
        setSuccess("Information updated successfully!");
      },
      onError: err => {
        setServerError(err.message);
      },
      onSettled: () => {
        setTimeout(() => {
          setShake(false);
          setErrors({});
          setServerError("");
          setSuccess("");
        }, 5000);
      }
    });
  };

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}


      <form onSubmit={handleSubmit}>
        <h2>Update a Bird</h2>
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
                Type
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
          
          <div className="norrechel-grouped-inputs">
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

          </div>

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
