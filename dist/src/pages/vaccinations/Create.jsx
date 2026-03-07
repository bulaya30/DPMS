import React, { useState, useEffect } from "react";
import { checkName, checkNumber } from "../../validations/validate";
import { getBranches, getTypes, processData } from "../../api";
import { FaPlus, FaEdit } from "react-icons/fa";

function AddVaccination({ vaccination = null, onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);

  const [formData, setFormData] = useState({
    branch: "",
    birdType: "",
    vaccine: "",
    vaccinationDate: "",
    dueAfterDays: "",
    completed: false
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const loadData = async () => {
      const br = await getBranches();
      const cat = await getTypes();

      setBranches(br || []);
      setTypes(cat || []);

      if (!vaccination && br?.length && cat?.length) {
        setFormData(prev => ({
          ...prev,
          branch: br[0].name,
          birdType: cat[0].name
        }));
      }
    };
    loadData();
  }, [vaccination]);

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (vaccination) {
      setFormData({
        branch: vaccination.branch,
        birdType: vaccination.birdType,
        vaccine: vaccination.vaccine,
        vaccinationDate: vaccination.vaccinationDate,
        dueAfterDays: vaccination.dueAfterDays,
        completed: vaccination.completed
      });
    }
  }, [vaccination]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branch":
      case "birdType":
      case "vaccine":
        return checkName(value) ? "" : "This field is required";
      case "dueAfterDays":
        return checkNumber(value) && value >= 0 ? "" : "Must be 0 or greater";
      case "vaccinationDate":
        return value ? "" : "Date is required";
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

  /* ================= CHANGE HANDLER ================= */
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, newValue) }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    // if(is)
    let newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      return;
    }

    try {
      // calculate next vaccination date
      const vaccinationDateObj = new Date(formData.vaccinationDate);
      const nextDate = new Date(vaccinationDateObj);
      nextDate.setDate(nextDate.getDate() + Number(formData.dueAfterDays));

      // check duplicates
      const existingVaccinations = await processData({ collection: "vaccinations", action: "list" });
      const duplicate = existingVaccinations.find(
        v =>
          v.branch === formData.branch &&
          v.birdType === formData.birdType &&
          v.vaccine === formData.vaccine &&
          v.id !== vaccination?.id
      );

      if (duplicate) {
        setServerError("This vaccine for this bird type in this branch already exists.");
        return;
      }

      const payload = {
        collection: "vaccins",
        action: "add",
        data: {
          ...formData,
          nextVaccinationDate: nextDate.toISOString().split("T")[0]
        }
      };

      await processData(payload);

      setSuccess("Vaccination added successfully!");
      if (!vaccination) {
        setFormData(prev => ({
          ...prev,
          birdType: types[0]?.name || "",
          vaccine: "",
          vaccinationDate: "",
          dueAfterDays: "",
          completed: false
        }));
      }

      onSuccess && onSuccess();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setTimeout(() => setShake(false), setServerError(""), setSuccess(""), setIsSaving(false), 5000);
      
    }
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit}>
        {/* Branch */}
        <div className="inputs">
          {/* <label className={errors.branch ? "error-text" : ""}>Branch</label> */}
          <label className={`${errors.branch ? "error-text" : ""}  ${shake && errors.branch ? "shake" : ""}`}>Branch</label>
          <select 
            name="branch" 
            value={formData.branch} 
            onChange={handleChange} 
            className={`${errors.branch ? "input-error" : ""} ${shake && errors.branch ? "shake" : ""}`}>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
          {errors.branch && <small className="error-text">{errors.branch}</small>}
        </div>

        {/* Bird Type */}
        <div className="inputs">
          <label className={errors.birdType ? "error-text" : ""}>Bird Type</label>
          <select name="birdType" value={formData.birdType} onChange={handleChange} className={errors.birdType ? "input-error shake" : ""}>
            {types.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {errors.birdType && <small className="error-text">{errors.birdType}</small>}
        </div>

        {/* Vaccine */}
        <div className="inputs">
          <label className={errors.vaccine ? "error-text" : ""}>Vaccine</label>
          <input type="text" name="vaccine" value={formData.vaccine} onChange={handleChange} className={errors.vaccine ? "input-error shake" : ""} />
          {errors.vaccine && <small className="error-text">{errors.vaccine}</small>}
        </div>

        {/* Vaccination Date */}
        <div className="inputs">
          <label className={errors.vaccinationDate ? "error-text" : ""}>Vaccination Date</label>
          <input type="date" name="vaccinationDate" value={formData.vaccinationDate} onChange={handleChange} className={errors.vaccinationDate ? "input-error shake" : ""} />
          {errors.vaccinationDate && <small className="error-text">{errors.vaccinationDate}</small>}
        </div>

        {/* Due After Days */}
        <div className="inputs">
          <label className={errors.dueAfterDays ? "error-text" : ""}>Due After (Days)</label>
          <input type="number" min="0" name="dueAfterDays" value={formData.dueAfterDays} onChange={handleChange} className={errors.dueAfterDays ? "input-error shake" : ""} />
          {errors.dueAfterDays && <small className="error-text">{errors.dueAfterDays}</small>}
        </div>

        {/* Completed */}
        {vaccination && (
          <div className="inputs checkbox">
            <label>
              <input type="checkbox" name="completed" checked={formData.completed} onChange={handleChange} /> Mark as completed
            </label>
          </div>
        )}

        <button type="submit">{vaccination ? <FaEdit /> : <FaPlus />} {vaccination ? "Update" : "Add"} Vaccination</button>
      </form>
    </div>
  );
}

export default AddVaccination;
