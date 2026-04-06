import React, { useState, useEffect, act } from "react";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetSchedules, useProcessSchedule } from "../../hooks/useSchedule";

import AddSchedule from "./CreateSchedule";
import UpdateSchedule from "./Update";

import ConfirmModal from '../../components/Models/Confirm';
import AlertModal from '../../components/Models/AlertModal';

function VaccinationSchedule() {
  const {data: types = [], isLoading: typesLoading, error: typesError} = useGetTypes();
  const {data: schedules = [], isLoading: schedulesLoading, error: schedulesError} = useGetSchedules();
  const {mutate, isLoading: isSaving } = useProcessSchedule();

  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    birdType: "",
    name: "",
    active: true,
    schedule: [{ ageInDays: "", vaccine: "" }]
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });


  /* ================= DELETE ================= */
  const handleDelete = async (schedule) => {
    if (showConfirm || scheduleToDelete) return;
    setScheduleToDelete(schedule);
    setShowConfirm(true);    
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    const { id, active, typeId } = scheduleToDelete;
    mutate({ 
      collection: "schedules", 
      action: active ? "delete" : "restore", 
      id,
      data: { active: !active, typeId }
    }, {
      onSuccess: () => {
        setMessageData({ title: "Success", message: `Schedule ${active ? "deleted" : "restored"} successfully.` });
        setShowMessage(true);
      },
      onError: err => {
        setMessageData({ title: "Error", message: `${err.message}` });
        setShowMessage(true);
      },

      onSettled: () => {
        setShowConfirm(false);
        setScheduleToDelete(null);
      }
    });
    
  };


  if(typesLoading || schedulesLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    )
  }
  if(typesError || schedulesError) {
    return (
      <div className="error-message">
       {typesError?.message || schedulesError?.message}
      </div>
    )
  }

  return (
    <div className={`dashboard-page `}>
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Schedules</h1>
        <p>Schedule Management</p>
      </div>
      {success && <p className="success">{success}</p>}
      <div className="crud-container">
        {/* ================= ADD BRANCH ================= */}
        <div className="add-form-container">
          <AddSchedule typeData={types}/>
        </div>    
        {/* ================= UPDATE BRANCH ================= */}
        <div className="update-form-container">
          <UpdateSchedule 
            scheduleData={schedules} 
            typeData={types}
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
                      <span className="timeline-vaccine">{s.vaccine}</span>
                      <span className="timeline-day">Day {s.ageInDays}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div className="settings-card-actions">
                <button
                  className="table-btn delete-btn"
                  onClick={() => handleDelete(schedule)}
                  disabled={isSaving}
                >
                  {schedule.active ? "Delete" : "Restore"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm"
        message={`Are you sure you want to ${scheduleToDelete?.active ? "delete" : "restore"} ${scheduleToDelete?.name}?`}
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
            
      <AlertModal
        isOpen={showMessage}
        title={messageData.title}
        message={messageData.message}
        onClose={() => setShowMessage(false)}
      />
    </div>
  );
}

export default VaccinationSchedule;
