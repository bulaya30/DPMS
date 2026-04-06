import React, { useState } from 'react'
import { useGetTypes, useProcessType } from '../../hooks/useTypes'
import useAuthStore from '../../store/authStore';
import AddItemType from './Create';
import UpdateItemType from './Update';
import ConfirmModal from '../../components/Models/Confirm';
import AlertModal from '../../components/Models/AlertModal';


  /* ================= DATE FORMATTER ================= */
  function toJSDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
    return new Date(timestamp);
  }

export default function Types() {

  const {data: types = [], isLoading, error } = useGetTypes();
  const updateType = useProcessType();

  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isAdmin = userRole === "admin";

  const [selectedItemType, setSelectedItemType] = useState(null);
    
  const [updatingId, setUpdatingId] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({
    title: "",
    message: "",
  });
    
  const [showConfirm, setShowConfirm] = useState(false);


  /* ================= OPEN CONFIRM ================= */
  const handleToggleRequest = (type) => {
    if (type.active && type.inUse) {
      setMessageData({
        title: "Action Blocked",
        message:
          "This item type cannot be deactivated because it is currently in use.",
      });
      setShowMessage(true);
      return;
    }

    setSelectedItemType(type);
    setShowConfirm(true);
  };

  /* ================= CONFIRM ACTION ================= */
  const confirmToggleStatus = async () => {
    if (!selectedItemType) return;

    const { id, active, name } = selectedItemType;
    setUpdatingId(id);
    setShowConfirm(false);

    try {
      updateType.mutate({
        collection: "types",
        action: "update",
        id,
        data: { active: !active, name, restore: !active },
      })

      setMessageData({
        title: "Success",
        message: `Item type "${name}" has been ${
          active ? "deactivated" : "activated"
        } successfully.`,
      });
      setShowMessage(true);

    } catch (err) {
      setMessageData({
        title: "Error",
        message: err.message || "Failed to update the item type",
      });
      setShowMessage(true);
    } finally {
      setUpdatingId(null);
      setSelectedItemType(null);
    }
  };

  if(isLoading) {
    <div className="loading-wrapper">
      <div className="spinner"></div>
      <span>Loading data...</span>
    </div>
  }

  if(error) {
    <div className="error-message">
      {error}
    </div>
  }


  return (
    <div className="dashboard-page">

      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Types</h1>
        <p>Types Management</p>
      </div>

      {isAdmin && (
        <div className="crud-container">
          <div className="add-form-container">
            <AddItemType />
          </div>
      
          <div className="update-form-container">
            <UpdateItemType
              types={types}
              selectedItemType={selectedItemType}
            />
          </div>
        </div>
      )}
      {/* ================= TABLE ================= */}
      <div className="norrechel-table-wrapper">
        <h3>Item Type Details</h3>

        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Status</th>
              <th>Date</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No item types found
                </td>
              </tr>
            ) : (
              types.map((itemType, index) => {
                const isUpdating = updatingId === itemType.id;

                return (
                  <tr
                    key={itemType.id}
                    className={!itemType.active ? "row-inactive" : ""}
                  >
                    <td>{index + 1}</td>
                    <td>{itemType.name}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          itemType.active ? "active" : "inactive"
                        }`}
                      >
                        {itemType.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>{toJSDate(itemType.date).toLocaleDateString()}</td>

                      {isAdmin && (
                        <td>
                          <button
                            className={`table-btn ${
                              itemType.active
                                ? itemType.inUse
                                  ? "activate-btn"
                                  : "delete-btn"
                                : "delete-btn"
                            }`}
                            disabled={
                              isUpdating ||
                              (itemType.active && itemType.inUse)
                            }
                            onClick={() =>
                              handleToggleRequest(itemType)
                            }
                          >
                            {itemType.active
                              ? itemType.inUse
                                ? "In Use"
                                : "Deactivate"
                              : "Restore"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
        </table>
      </div>
      {/* ================= CONFIRM MODAL ================= */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm Action"
        message={
          selectedItemType
          ? `Are you sure you want to ${
              selectedItemType.active ? "deactivate" : "restore"
            } item type "${selectedItemType.name}"?`
          : ""
        }
        confirmText="Yes, Continue"
        cancelText="Cancel"
        onConfirm={confirmToggleStatus}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedItemType(null);
        }}
      />

      {/* ================= ALERT MODAL ================= */}
      <AlertModal
        isOpen={showMessage}
        title={messageData.title}
        message={messageData.message}
        onClose={() => setShowMessage(false)}
      />
    </div>
  )
}
