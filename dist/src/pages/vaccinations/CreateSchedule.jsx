import React, { useState, useEffect } from "react";
import { checkName, checkNumber } from "../../validations/validate";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { useProcessSchedule } from "../../hooks/useSchedule";

function AddSchedule({typeData = []}) {
  const { mutate, isPending: isSaving } = useProcessSchedule();
  const types = typeData;
  const [formData, setFormData] = useState({
    typeId: "",
    name: "",
    schedule: [{ ageInDays: "", vaccine: "" }]
  });
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  /* ================= BASIC CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* ================= SCHEDULE CHANGE ================= */
  const handleScheduleChange = (index, field, value) => {
    const updated = [...formData.schedule];
    updated[index][field] = value;
    setFormData({ ...formData, schedule: updated });
  };

  /* ================= ADD ROW ================= */
  const addScheduleRow = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, { ageInDays: "", vaccine: "" }]
    }));
  };

  /* ================= REMOVE ROW ================= */
  const removeScheduleRow = index => {
    const updated = [...formData.schedule];
    updated.splice(index, 1);
    setFormData({ ...formData, schedule: updated });
  };

  /* ===================== SHAKE RESET ===================== */
  useEffect(() => {
    if (!shake) return;
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
  }, [shake]);
  

  /* ================= VALIDATE ================= */
  const validate = () => {
    const newErrors = {};

    if (!formData.typeId) newErrors.typeId = "Select bird type";
    if (!checkName(formData.name)) newErrors.name = "Invalid schedule name";

    formData.schedule.forEach((s, i) => {
      if (!checkNumber(s.ageInDays)) {
        newErrors[`age_${i}`] = "Invalid age";
      }
      if (!checkName(s.vaccine)) {
        newErrors[`vaccine_${i}`] = "Invalid vaccine name";
      }
    });

    setErrors(newErrors);
    setShake(true);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    const payload = {
      collection: "schedules",
      action: "add",
      data: {
        typeId: formData.typeId,
        name: formData.name,
        active: true,
        schedule: formData.schedule.map(s => ({
          ageInDays: Number(s.ageInDays),
          vaccine: s.vaccine
        }))
      }
    };
    mutate(payload, {
      onSuccess: () => {
        setSuccess("Schedule added successfully!");
        setFormData({
          typeId: "",
          name: "",
          schedule: [{ ageInDays: "", vaccine: "" }]
        });
      },
      onError: error => {
        setErrors(error);
      },
      onSettled: () => {
        setTimeout(() => {
          setSuccess("");
          setServerError("");
          setErrors({});
        }, 5000);
      }
    });

  };

  return (
    <div className="norrechel-form-container">

      {success && <p className="success-text">{success}</p>}
      {errors && <p className="error-text">{errors.message}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Add Schedule</h2>
        {/* ================= HEADER ================= */}
        <div className="inputs">
          <div className="norrechel-grouped-inputs">
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
                <option value="">--Select--</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={errors.name ? "error-text" : ""}>
                Schedule Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "input-error" : ""}
              />
            </div>
          </div>
        </div>

        {/* ================= SCHEDULE BUILDER ================= */}
        <div className="schedule-builder">
          <h4>Vaccination Plan</h4>

          {formData.schedule.map((row, index) => (
            <div key={index} className="norrechel-grouped-inputs">

              <div>
                <label className={errors[`age_${index}`] ? "error-text" : ""}>
                  Age (Days)
                </label>
                <input
                  type="number"
                  value={row.ageInDays}
                  onChange={e =>
                    handleScheduleChange(index, "ageInDays", e.target.value)
                  }
                  className={errors[`age_${index}`] ? "input-error" : ""}
                />
              </div>

              <div>
                <label className={errors[`vaccine_${index}`] ? "error-text" : ""}>
                  Vaccine
                </label>
                <input
                  type="text"
                  value={row.vaccine}
                  onChange={e =>
                    handleScheduleChange(index, "vaccine", e.target.value)
                  }
                />
              </div>

              {formData.schedule.length > 1 && (
                <button
                  type="button"
                  className="delete-row-btn"
                  onClick={() => removeScheduleRow(index)}
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}

          <div className="norrechel-grouped-inputs">
            <div>
              <button
                type="button"
                className={`norrechel-btn split-btn ${isSaving ? "loading" : ""}`}
                onClick={addScheduleRow}
                disabled={isSaving}
              >
                <FaPlus /> Add Row
              </button>
            </div>
            <div>
              {/* ================= SUBMIT ================= */}
              <button
                type="submit"
                disabled={isSaving}
                className={`norrechel-btn split-btn ${isSaving ? "loading" : ""}`}
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

export default AddSchedule;