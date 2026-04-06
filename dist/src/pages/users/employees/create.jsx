import React, { useState, useEffect } from "react";
import { useProcessUser } from "../../../hooks/useUsers";
import {
  checkPhone,
  checkName,
  checkMail,
  checkPassword,
} from "../../../validations/validate";
import { FaSave, FaEye, FaEyeSlash } from "react-icons/fa";

function AddEmployee({ branchData = [] }) {
  const {mutate, isPending: isSaving } = useProcessUser();
  const branches = branchData;
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    branchId: "",
    firstName: "",
    lastName: "",
    contact: "",
    email: "",
    gender: "",
    role: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  
  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branchId":
      case "firstName":
      case "lastName":
      case "role":
      case "gender":
        return checkName(value) ? "" : "This field is required";

      case "email":
        return checkMail(value) ? "" : "Invalid email";

      case "contact":
        return checkPhone(value) ? "" : "Invalid phone number";

      case "password":
        return checkPassword(value)
          ? ""
          : "Password must be at least 8 characters, 1 uppercase, 1 lowercase, 1 number";

      default:
        return "";
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  /* ================= HANDLE SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    let newErrors = {};

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShake(true);
      return;
    }
    const payload = {
      collection: "users",
      action: "add",
      data: { ...formData },
    };
    mutate(payload, {
      onSuccess: () =>{
        setSuccess("Employee added successfully!");
    
        setFormData({
          branchId: "",
          firstName: "",
          lastName: "",
          contact: "",
          email: "",
          gender: "",
          role: "",
          password: "",
        });
    
        setShowPassword(false);
      },
      onError: error => {
        setServerError(error?.message || "Something went wrong");

      }, 
      onSettled: () =>{
        setTimeout(() => {
          setShake(false);
          setErrors({});
          setServerError("");
          setSuccess("");
        }, 5000);
      }
    });
    
  };

  return (
    <div className="norrechel-form-container">
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Add Employee</h2>

        {/* FIRST & LAST NAME */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={errors.firstName ? "error-text" : ""}>
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={errors.firstName ? "input-error" : ""}
            />
            {errors.firstName && (
              <small className="error-text">{errors.firstName}</small>
            )}
          </div>

          <div>
            <label className={errors.lastName ? "error-text" : ""}>
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={errors.lastName ? "input-error" : ""}
            />
            {errors.lastName && (
              <small className="error-text">{errors.lastName}</small>
            )}
          </div>
        </div>

        {/* BRANCH & GENDER */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={errors.branchId ? "error-text" : ""}>
              Branch
            </label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              className={errors.branchId ? "input-error" : ""}
            >
              <option value=""></option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district})
                </option>
              ))}
            </select>
            {errors.branchId && (
              <small className="error-text">{errors.branchId}</small>
            )}
          </div>

          <div>
            <label className={errors.gender ? "error-text" : ""}>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={errors.gender ? "input-error" : ""}
            >
              <option value=""></option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            {errors.gender && (
              <small className="error-text">{errors.gender}</small>
            )}
          </div>
        </div>

        {/* CONTACT & EMAIL */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={errors.contact ? "error-text" : ""}>
              Contact
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder="+256-777777777"
              className={errors.contact ? "input-error" : ""}
            />
            {errors.contact && (
              <small className="error-text">{errors.contact}</small>
            )}
          </div>

          <div>
            <label className={errors.email ? "error-text" : ""}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && (
              <small className="error-text">{errors.email}</small>
            )}
          </div>
        </div>

        {/* PASSWORD & ROLE */}
        <div className="norrechel-grouped-inputs">
          <div>
            <label className={errors.password ? "error-text" : ""}>
              Password
            </label>
            {/* Password wrapper for positioning the toggle icon */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "input-error" : ""}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <small className="error-text">{errors.password}</small>
            )}
          </div>

          <div>
            <label className={errors.role ? "error-text" : ""}>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? "input-error" : ""}
            >
              <option value=""></option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
            {errors.role && (
              <small className="error-text">{errors.role}</small>
            )}
          </div>
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={isSaving}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AddEmployee;