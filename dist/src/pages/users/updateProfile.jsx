import React, { useEffect, useState } from "react";
import { processData } from "../../api";
import { checkPhone, checkName, checkMail, checkPassword } from "../../validations/validate";
import { FaEdit, FaSave } from "react-icons/fa";

function UpdateProfile({ profile = [], onSuccess }) {
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false)
  

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    email: "",
  });

  /* === DB truth === */
  const [originalData, setOriginalData] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    email: "",
  });

  const [hasProfile, setHasProfile] = useState(false);


  /* ================= LOAD PROFILE ================= */
  useEffect(() => {

    if (!profile) {
      setHasProfile(false);
      setFormData(prev => ({ 
        ...prev,
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
      }));
      setOriginalData({ 
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
       });
      return;
    }

    setHasProfile(true);

    const next = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        contact: profile.contact,
        email: profile.email,
    };

    if (
      formData.firstName === next.firstName &&
      formData.lastName === next.lastName &&
      formData.contact === next.contact &&
      formData.email === next.email 
    ) {
      return;
    }

    setFormData(prev => ({ ...prev, ...next }));
    setOriginalData(next);
  }, [profile]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
        case "firstName":
        case "lastName":
            return checkName(value) ? "" : "This field is required";
    
        case "email":
            return checkMail(value) ? "" : "Invalid email "
        case "contact": 
          return checkPhone(value) ? "" : "Invalid Phone number"
        case "password":
            return checkPassword(value) && value > 0
              ? ""
              : "Wrong password";
    
        default:
            return "";
    }
  };

  /* ================= HANDLERS ================= */
  const handleChange = e => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };



  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if ( isSaving) return;

    let newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => setShake(true), 400);
      return;
    }

    try {
      setIsSaving(true);
    
      if (!profile) return;

      const res = await processData({
        collection: "users",
        action: "update",
        id: profile.id,
        data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            contact: formData.contact,
            email: formData.email,
        },
      });
      setSuccess("Information updated successfully!");
      onSuccess?.();
    } catch (err) {
      console.log(err)
      setServerError(err.messemail);
    } finally {
      setTimeout(() => setShake(false), setErrors(''), setServerError(''), 5000);
      setIsSaving(false)
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Update Profile</h2>
        <div className="inputs">
            <div className="norrechel-grouped-inputs">
                <div>
                    <label className={`${errors.firstName ? "error-text" : ""} ${shake && errors.firstName ? "shake" : ""}`}>First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`${errors.firstName ? "input-error" : ""} ${shake && errors.firstName ? "shake" : ""}`}
                        
                    />
                  
                    {errors.firstName && (
                        <small className="error-text">{errors.firstName}</small>
                    )}
                </div>
                <div>
                    <label className={`${errors.lastName ? "error-text" : ""} ${shake && errors.lastName ? "shake" : ""}`}>Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`${errors.lastName ? "input-error" : ""} ${shake && errors.lastName ? "shake" : ""}`}
                        
                    />
                    {errors.lastName && (
                        <small className="error-text">{errors.lastName}</small>
                    )}
                </div>
            </div>            
        </div>

        {/* ===== CONTACT & EMAIL ===== */}
        <div className="inputs">
            <div className="norrechel-grouped-inputs">
                <div>
                    <label className={`${errors.contact ? "error-text" : ""} ${shake && errors.contact ? "shake" : ""}`}>Contact</label>
                    <input
                        type="text"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        className={`${errors.contact ? "input-error" : ""} ${shake && errors.contact ? "shake" : ""}`}
                        
                    />
                    {errors.contact && (
                        <small className="error-text">{errors.contact}</small>
                    )}
                </div>
                <div>
                <label className={`${errors.email ? "error-text" : ""} ${shake && errors.email ? "shake" : ""}`}>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`${errors.email ? "input-error" : ""} ${shake && errors.email ? "shake" : ""}`}
                        
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
            </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : `Save`}
        </button>
      </form>
    </div>
  );
}

export default UpdateProfile;
