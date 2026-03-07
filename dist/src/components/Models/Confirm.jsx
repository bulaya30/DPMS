import React, { useState } from "react";
import Modal from "./Model";

function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm?.(); // supports async actions
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={!loading ? onCancel : undefined} title={title}>
      <p className="text-message">{message}</p>

      <div className="modal-btn-container">
        <button
          className="table-btn edit-btn"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </button>

        {/* Submit */}
        <button
          disabled={loading}
          onClick={handleConfirm}
          className={`table-btn
            ${title === "Delete" ? "delete-btn" : "" }
            save-btn ${loading ? "loading" : ""}`}
        >
          {loading && <span className="spinner" />}
          {loading ? `${confirmText}...` : confirmText}
        </button>

        {/* <button
          className="table-btn delete-btn"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            confirmText
          )}
        </button> */}
      </div>
    </Modal>
  );
}

export default ConfirmModal;
