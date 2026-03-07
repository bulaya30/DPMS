import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBranches, getEmployees } from "../../../api";
import AddEmployee from "./create";
import UpdateEmployee from "./update";

const user = JSON.parse(localStorage.getItem("user"));
const role = user?.role;
const isAdmin = role === "admin";

/* ================= DATE HELPERS ================= */
const formatDate = (date) => {
  if (!date) return "";
  if (date._seconds) return new Date(date._seconds * 1000).toLocaleDateString();
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};

/**
 * Ensures the input is always an array.
 * - If input is already an array, returns it as-is
 * - If input is a single object, wraps it in an array
 * - If input is null/undefined, returns an empty array
 */
export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

const today = () => new Date().toISOString().split("T")[0];
const currentMonth = () => today().slice(0, 7);

const Employees = () => {
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([])
    /* ================= URL FILTER STATE ================= */
    const [searchParams, setSearchParams] = useSearchParams();
    const branchFilter = searchParams.get("branch") || "all";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
   
    const urlMode = searchParams.get("mode") || null;
    const value = searchParams.get("value") || "";
    const [localMode, setLocalMode] = useState(urlMode);
    const inputRef = useRef(null);

    /* ================= FETCH ALL DATA ================= */
    const fetchData = async () => {
        setLoading(true)
        setError(null);
        try {
            const [employeeData, branchData] = await Promise.all([ 
                getEmployees(), getBranches()
            ]);
            setEmployees(normalizeToArray(employeeData));
            setBranches(normalizeToArray(branchData));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
        
    useEffect(() => {
        fetchData();
    }, []);
    const reload = async () => {
        const data = await getEmployees();
        setEmployees(normalizeToArray(data));
    };
    
    /* ================= FILTERED EMPLOYEES ================= */
    const filteredEmployees = useMemo(() => {
        let data = [...employees];
        
        if (branchFilter !== "all") {
          data = data.filter(b => b.branchId === branchFilter);
        }
        if (value) {
            if (localMode === "date") data = data.filter(i => normalizeDate(i.date) === value);
            if (localMode === "month") data = data.filter(i => normalizeDate(i.date)?.startsWith(value));
        }

        return data.map(b => ({
            ...b,
            date: normalizeDate(b.date) 
        }));
    }, [employees, branchFilter, localMode, value]);
    /* ================= TABLE ROWS ================= */
        const tableRows = useMemo(
            () =>
              filteredEmployees.map(employee => ({
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                contact: employee.contact,
                email: employee.email,
                role: employee.role,
                branch: employee.branchName,
                address: employee.address,
                active: employee.active,
                date: employee.date,
            })),
        [filteredEmployees]
    );
    /* ================= FILTER HANDLER ================= */
    const updateFilter = (key, value) => {
        const params = Object.fromEntries(searchParams.entries());

        if (value === "all") delete params[key];
        else params[key] = value;

        setSearchParams(params);
    };

    const switchMode = (mode) => {
        if (localMode === mode) {
        setLocalMode(null);
        updateFilter("mode", null);
        updateFilter("value", null);
        return;
        }

        setLocalMode(mode);
        updateFilter("mode", mode);
        if (mode === "date") updateFilter("value", today());
        if (mode === "month") updateFilter("value", currentMonth());

        requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.showPicker?.();
        });
    };
    const inputType = localMode === "date" ? "date" : localMode === "month" ? "month" : "text";
    /* ================= RENDER ================= */
    return (
        <>
           {loading && (
                <div className="loading-wrapper">
                <div className="spinner"></div>
                <span>Loading Data...</span>
                </div>
            )}
            {error && (
                <div className="error-message">
                {error}
                </div>
            )}
            {!loading && !error && (
                <> 
                <div className={`dashboard-page `}>
                    {/* ================= HERO ================= */}
                    <div className="dashboard-hero">
                        <h1>Employees</h1>
                        <p>User Management</p>
                    </div>
                    <div className="dashboard-filters">
                        {isAdmin && (
                            <select
                                className="branch-selector"
                                value={branchFilter}
                                onChange={e => updateFilter("branch", e.target.value)}
                            >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>
                                {b.name} ({b.district})
                                </option>
                            ))}
                            </select>
                        )}
                        {/* Smart input */}
                        {localMode && (
                            <div className="smart-input-wrapper">
                                <input
                                    ref={inputRef}
                                    className={`smart-input mode-${localMode}`}
                                    type={inputType}
                                    value={value}
                                    onChange={e => updateFilter("value", e.target.value)}
                                    onClick={() => inputRef.current?.showPicker?.()}
                                />
                                {isAdmin && value && (
                                    <div className="badges">
                                        <span className="badge">
                                            {localMode === "date" ? "Date Filter Active" : "Month Filter Active"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {isAdmin && (
                        <div className="crud-container">
                            <div className="add-form-container mb-6">
                                <AddEmployee branchData={branches} onSuccess={reload} />
                            </div>

                            <div className="update-form-container mb-6">
                                <UpdateEmployee employees={employees} brancheData={branches} onSuccess={[]} />
                            </div>
                        </div>
                    )}

                    <div className="norrechel-table-wrapper">
                        <table className="norrechel-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Branch</th>
                                    <th>Employee</th>
                                    <th>Contact</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.length === 0 ? (
                                    <tr>
                                    <td colSpan="8" style={{ textAlign: "center" }}>
                                        No Employee found
                                    </td>
                                    </tr>
                                ) : (
                                    tableRows.map((employee, index) => {
                                    //   const isUpdating = updatingId === employee.id;
                                    return (
                                        <tr
                                            key={employee.id}
                                            className={!employee.active ? "row-inactive" : ""}
                                        >
                                            <td>{index + 1}</td>
                                            <td>{employee.branch}</td>
                                            <td>{employee.firstName} {employee.lastName}</td>
                                            <td>{employee.contact}</td>
                                            <td>{employee.email}</td>
                                            <td>{employee.role}</td>
                                            <td>
                                                <span
                                                    className={`status-badge ${
                                                    employee.active ? "active" : "inactive"
                                                    }`}
                                                >
                                                    {employee.active ? "Active" : "Fired"}
                                                </span>
                                            </td>
                                            <td>{employee.date.toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                className={`table-btn ${
                                                    employee.active ? "delete-btn" : "activate-btn"
                                                }`}
                                                // disabled={isUpdating || (branch.active && branch.inUse)}
                                                // onClick={() => handleToggleRequest(branch)}
                                                >
                                                {employee.active
                                                    ? 
                                                    "Fire"
                                                    : "Restore"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )} 
        </>
    )

}


export default Employees;