import React, { use, useEffect, useMemo, useRef, useState } from "react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useSearchParams } from "react-router-dom";
import { useGetBranches } from "../../../hooks/useBranches";
import { useGetEmployees } from "../../../hooks/useUsers";
import useAuthStore from "../../../store/authStore";

import AddEmployee from "./create";
import UpdateEmployee from "./update";



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
    const {data: employees = [], isLoading: employeesLoading, error: employeesError} = useGetEmployees();
    const {data: branches = [], isLoading: branchesLoading, error: branchesError} = useGetBranches();
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.role === "admin";
    const canManage = user?.role === "admin" || user?.role === "manager";

    /* ================= URL FILTER STATE ================= */
    const [searchParams, setSearchParams] = useSearchParams();
    const branchFilter = searchParams.get("branch") || "all";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
   
    const urlMode = searchParams.get("mode") || null;
    const value = searchParams.get("value") || "";
    const [localMode, setLocalMode] = useState(urlMode);
    const inputRef = useRef(null);

    
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
    
    const exportToExcel = () => {
        const dataToExport = employees.map((employe, index) => {
            return {
                "#": index + 1,
                "First Name": employe.firstName ?? "-",
                "Last Name": employe.lastName,
                "Contact": employe.contact ?? "-",
                "Email": employe.email,
                "Role": employe.role,
                "Branch": employe.branchName ?? "-",
                "Hired Date": formatDate(employe.date),
            };
        })
        // Create a worksheet
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Report");
    
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Employee_Report.xlsx`);
    };
    
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

    
    const inputType = localMode === "date" ? "date" : localMode === "month" ? "month" : "text";

    if(employeesLoading || branchesLoading) {
        return <div className="loading-wrapper">
            <div className="spinner"></div>
            <span>Loading Data...</span>
        </div>
    }
    if(employeesError || branchesError) {
        return <div className="error-message">
            {employeesError?.message || branchesError?.message}
        </div>
    }
    /* ================= RENDER ================= */
    return (
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
                        <AddEmployee branchData={branches} />
                    </div>
                    <div className="update-form-container mb-6">
                        <UpdateEmployee employeeData={employees} brancheData={branches} />
                    </div>
                </div>
            )}
            <div className="norrechel-table-wrapper">
                <div className="ispm-print-container">
                    <button onClick={exportToExcel} className="ispm-btn">
                        Export to Excel
                    </button>
                </div>
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
    )

}


export default Employees;