import React, { useState, useEffect } from "react";
import { getTypes, getVaccinationSchedules, processData } from "../../api";
import { checkName, checkNumber } from "../../validations/validate";
import AddSchedule from "./CreateSchedule";
import UpdateSchedule from "./Update";

function VaccinationSchedule() {
  const [birdTypes, setBirdTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    birdType: "",
    name: "",
    active: true,
    schedule: [{ ageInDays: "", vaccine: "" }]
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleData, typeData] = await Promise.all([
        getVaccinationSchedules(), getTypes()
      ]);
      setSchedules(scheduleData || []);
      setBirdTypes(typeData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData()
  }, []);
  // console.log(schedules)

    const refreshData = async () => {
      const data = await getVaccinationSchedules();
      setSchedules(data || []);
    };


  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    setDeletingId(id);
    console.log('Deleting data...')
    // try {
    //   await deleteVaccinationSchedule(id);
    //   fetchSchedules();
    // } catch (error) {
    //   processData(error);
    // } finally {
    //   setDeletingId(null);
    // }
  };

  /* ================= EDIT ================= */
  const handleEdit = (schedule) => {
    setFormData({ ...schedule });
    setUpdatingId(schedule.id);
  };

  return (
    <>
       {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <span>Loading data...</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className={`dashboard-page `}>
          {/* ================= HERO ================= */}
          <div className="dashboard-hero">
            <h1>Schedules</h1>
            <p>Schedule Management</p>
          </div>
          {/* <div> */}
              {success && <p className="success">{success}</p>}
              <div className="crud-container">
                  {/* ================= ADD BRANCH ================= */}
                  <div className="add-form-container">
                      <AddSchedule 
                        onAcallback={refreshData}
                      />
                  </div>
              
                  {/* ================= UPDATE BRANCH ================= */}
                  <div className="update-form-container">
                      <UpdateSchedule 
                        schedules={schedules}
                        onSuccess={refreshData}

                      />
                  </div>
              </div>

              {/* List of schedules */}
              <div className="settings-card-wrapper">
                <h3>Schedule Details</h3>

                <div className="settings-card-grid">
                  {schedules.map((schedule, index) => (
                    <div key={schedule.id} className="settings-card">
                      
                      {/* Header */}
                      <div className="settings-card-header">
                        <div>
                          <h4>{schedule.name}</h4>
                          <p className="muted-text">{schedule.typeName}</p>
                        </div>

                        <span className={`status-pill ${schedule.active ? "active" : "inactive"}`}>
                          {schedule.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Schedule Timeline */}
                      <div className="settings-card-body">
                        <h5>Vaccination Timeline</h5>

                        <div className="timeline-list">
                          {schedule.schedule.map((s, i) => (
                            <div key={i} className="timeline-item">
                              <span className="timeline-day">Day {s.ageInDays}</span>
                              <span className="timeline-vaccine">{s.vaccine}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="settings-card-actions">
                        <button
                          className="table-btn delete-btn"
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deletingId === schedule.id}
                        >
                          {deletingId === schedule.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
          {/* </div> */}
        </div>
      )}
    </>
  );
}

export default VaccinationSchedule;
