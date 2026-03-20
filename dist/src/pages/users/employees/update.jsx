import React, { useEffect, useState } from "react";
import { getBranches, processData } from "../../../api";
import { checkPhone, checkName, checkMail, checkPassword } from "../../../validations/validate";
import { FaEdit, FaSave } from "react-icons/fa";

function Update({ employees = [], brancheData = [], onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);
  const [isSaving, setIsSaving] = useState(false)
  

  const [formData, setFormData] = useState({
    branch: "",
    employee: "",
    firstName: "",
    lastName: "",
    contact: "",
    email: "",
    role: "",
  });

  /* === DB truth === */
  const [originalData, setOriginalData] = useState({
    firstName: "",
    lastName: "",
    contact: "",
    email: "",
    role: "",
  });

  const [hasEmployee, setHasEmployee] = useState(false);

  /* ================= FETCH BRANCHES ================= */
  useEffect(() => {
    const fetchData = async () => {
      setBranches(brancheData);
    };
    fetchData();
  }, [brancheData]);
  /* ================= LOAD EMPLOYEE ================= */
  useEffect(() => {
    if (!formData.employee) {
      setHasEmployee(false);
      setFormData(prev => ({ 
        ...prev, 
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
        role: "",
    }));
      setOriginalData({
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
        role: "",
       });
      return;
    }

    const employee = employees.find(
      e => e.id === formData.employee 
    );

    if (!employee) {
      setHasEmployee(false);
      setFormData(prev => ({ 
        ...prev,
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
        role: "",
      }));
      setOriginalData({ 
        firstName: "",
        lastName: "",
        contact: "",
        email: "",
        role: "",
       });
      return;
    }

    setHasEmployee(true);
    const next = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        contact: employee.contact,
        email: employee.email,
        role: employee.role,
    };

    if (
      formData.firstName === next.firstName &&
      formData.lastName === next.lastName &&
      formData.contact === next.contact &&
      formData.role === next.role &&
      formData.email === next.email 
    ) {
      return;
    }

    setFormData(prev => ({ ...prev, ...next }));
    setOriginalData(next);
  }, [formData.employee, employees]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
        case "branch":
        case "firstName":
        case "lastName":
        case "role":
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

    if (name === "branch") {
      setFormData(prev => ({ ...prev, [name]: value, employee: "" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  /* ================= RULES ================= */
  const selectionComplete = formData.branch && formData.employee;

  const canEdit =
    hasEmployee &&
    (
        originalData.firstName ||
        originalData.lastName ||
        originalData.role ||
        originalData.email ||
        originalData.contact
    );

  const hasChanged =
    formData.firstName !== originalData.firstName ||
    formData.lastName !== originalData.lastName ||
    formData.role !== originalData.role ||
    formData.email !== originalData.email ||
    formData.contact !== originalData.contact;

  /* ================= SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!canEdit || !hasChanged || isSaving) return;

    try {
      setIsSaving(true);
      const employee = employees.find(
        e => e.id === formData.employee
      );
      if (!employee) return;

      const res = await processData({
        collection: "users",
        action: "update",
        id: employee.id,
        data: {
            branchId: employee.branchId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            contact: formData.contact,
            email: formData.email,
            role: formData.role,
        },
      });
      console.log(res)
      setSuccess("Information updated successfully!");
    } catch (err) {
      console.log(err)
      setServerError(err.message);
    } finally {
      setTimeout(() => setSuccess(""), setShake(false), setErrors({}), setServerError(''), 5000);
      setIsSaving(false)
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className={`norrechel-form-container`}>
      {success && <p className="success-text">{success}</p>}
      {serverError && <p className="error-text">{serverError}</p>}

      {selectionComplete && hasEmployee && !canEdit && (
        <p className="error-text">
          Employee exists but has no editable values.
        </p>
      )}

      <form onSubmit={handleSubmit} autoComplete="off">
        <h2>Update Employee</h2>
        {/* Branch */}
        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              <label>Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange}>
                <option value=""></option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Employee</label>
              <select 
                name="employee" 
                value={formData.employee} 
                onChange={handleChange}
                disabled={!formData.branch}
              >
                <option value=""></option>
                {employees
                  .filter(e => e.branchId === formData.branch)
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
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
                        disabled={!canEdit}
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
                        disabled={!canEdit}
                    />
                    {errors.lastName && (
                        <small className="error-text">{errors.lastName}</small>
                    )}
                </div>
            </div>            
        </div>

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Role */}
              <label className={`${errors.role ? "error-text" : ""} ${shake && errors.role ? "shake" : ""}`}>Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`${errors.role ? "input-error" : ""} ${shake && errors.role ? "shake" : ""}`}
                disabled={!canEdit}
              >
                <option value=""></option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
                
              </select>
              {errors.role && (
                <small className="error-text">{errors.role}</small>
              )}
            </div>
            <div>
              {/* Placeholder or another field */}
            </div>
          </div>
        </div>
        

        <div className="inputs">
          <div className="norrechel-grouped-inputs">
            <div>
              {/* Contact */}  
              <label className={`${errors.contact ? "error-text" : ""} ${shake && errors.contact ? "shake" : ""}`}>Contact</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="+256-777777777"
                className={`${errors.contact ? "input-error" : ""} ${shake && errors.contact ? "shake" : ""}`}
                disabled={!canEdit}
              />
              {errors.contact && (
                <small className="error-text">{errors.contact}</small>
              )}

            </div>
            <div>
              {/* ===== EMAIL ===== */}
              <label className={`${errors.email ? "error-text" : ""} ${shake && errors.email ? "shake" : ""}`}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`${errors.email ? "input-error" : ""} ${shake && errors.email ? "shake" : ""}`}
                disabled={!canEdit}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canEdit}
          className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
        >
          {isSaving && <span className="spinner" />}
          <FaSave /> {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default Update;
