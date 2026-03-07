import React, { useState, useEffect, useMemo } from "react";
import { getTypes, processData } from "../../api";
import { checkName, checkNumber } from "../../validations/validate";
import { FaPlus, FaSave, FaTrash } from "react-icons/fa";

function UpdateSchedule({ schedules = [], onSuccess }) {
  const [types, setTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    typeId: "",
    name: "",
    schedule: []
  });

  const [originalData, setOriginalData] = useState(null);
  const [hasSchedule, setHasSchedule] = useState(false);

  /* ================= FETCH TYPES ================= */
  useEffect(() => {
    (async () => {
      try {
        const t = await getTypes();
        setTypes(t.filter(t => t.active));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  /* ================= LOAD SELECTED SCHEDULE ================= */
  useEffect(() => {
    if (!formData.typeId) {
      setHasSchedule(false);
      setFormData(prev => ({ ...prev, name: "", schedule: [] }));
      setOriginalData(null);
      return;
    }

    const schedule = schedules.find(
      s => s.typeId === formData.typeId
    );

    if (!schedule) {
      setHasSchedule(false);
      setFormData(prev => ({ ...prev, name: "", schedule: [] }));
      setOriginalData(null);
      return;
    }

    const next = {
      typeId: schedule.typeId,
      name: schedule.name || "",
      schedule: (schedule.schedule || [])
        .map(s => ({
          ageInDays: String(s.ageInDays ?? ""),
          vaccine: s.vaccine ?? ""
        }))
        .sort((a, b) => Number(a.ageInDays) - Number(b.ageInDays))
    };

    setHasSchedule(true);
    setFormData(next);
    setOriginalData(JSON.stringify(next));

  }, [formData.typeId, schedules]);

  /* ================= HANDLERS ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (index, field, value) => {
    const updated = [...formData.schedule];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, schedule: updated }));
  };

  const addScheduleRow = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, { ageInDays: "", vaccine: "" }]
    }));
  };

  const removeScheduleRow = index => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {};

    if (!checkName(formData.name)) {
      newErrors.name = "Invalid name";
    }

    formData.schedule.forEach((s, i) => {
      if (!checkNumber(s.ageInDays)) {
        newErrors[`age_${i}`] = "Invalid age";
      }
      if (!checkName(s.vaccine)) {
        newErrors[`vaccine_${i}`] = "Invalid vaccine";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasChanged = useMemo(() => {
    if (!originalData) return false;
    return originalData !== JSON.stringify(formData);
  }, [formData, originalData]);

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!hasSchedule || !hasChanged || isSaving) return;
    if (!validate()) return;

    try {
      setIsSaving(true);

      const selected = schedules.find(
        s => s.typeId === formData.typeId
      );

      if (!selected) return;

      const res = await processData({
        collection: "schedules",
        action: "update",
        id: selected.id,
        data: {
          typeId: formData.typeId,
          name: formData.name.trim(),
          schedule: formData.schedule.map(s => ({
            ageInDays: Number(s.ageInDays),
            vaccine: s.vaccine.trim()
          }))
        }
      });

      console.log(res)

      setSuccess("Schedule updated successfully");
      setServerError("");
      setOriginalData(JSON.stringify(formData));
      onSuccess?.();

    } catch (err) {
      console.error(err);
      setServerError(err.message || "Update failed");
      setSuccess("");
    } finally {
      setIsSaving(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">

      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Update Vaccination Schedule</h2>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">

            <div>
              <label>Type</label>
              <select
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
              >
                <option value="">-- Select --</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Schedule Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!hasSchedule}
                className={errors.name ? "input-error" : ""}
              />
            </div>

          </div>
        </div>

        {hasSchedule && (
          <div className="schedule-builder">
            <h4>Vaccination Plan</h4>

            {formData.schedule.map((row, index) => (
              <div key={index} className="norrechel-grouped-inputs">

                <div>
                  <label>Age (Days)</label>
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
                  <label>Vaccine</label>
                  <input
                    type="text"
                    value={row.vaccine}
                    onChange={e =>
                      handleScheduleChange(index, "vaccine", e.target.value)
                    }
                    className={errors[`vaccine_${index}`] ? "input-error" : ""}
                  />
                </div>

                <button
                  type="button"
                  className="delete-row-btn"
                  onClick={() => removeScheduleRow(index)}
                >
                  <FaTrash />
                </button>

              </div>
            ))}
          </div>
        )}

        <div className="norrechel-grouped-inputs">
          <div>
            <button
              type="button"
              className={`norrechel-btn split-btn ${isSaving ? "loading" : ""}`}
              onClick={addScheduleRow}
              disabled={!hasSchedule || isSaving}
            >
              <FaPlus /> Add Row
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={!hasSchedule || !hasChanged || isSaving}
              className={`norrechel-btn split-btn ${isSaving ? "loading" : ""}`}
            >
              {isSaving && <span className="spinner" />}
              <FaSave /> {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

export default UpdateSchedule;