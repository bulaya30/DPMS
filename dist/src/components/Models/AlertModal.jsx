import React from "react";
import Modal from "./Model";

function alertModal({
  isOpen,
  title = "Message",
  message = "",
  buttonText = "OK",
  onClose
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-message">{message}</p>

      <div className="modal-btn-container">
        <button
          onClick={onClose}
          className={`norrechel-btn`}
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  );
}

export default alertModal;
