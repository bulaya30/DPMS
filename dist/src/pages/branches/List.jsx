import React, { useState, useEffect, useMemo } from "react";
import { getBranches, processData } from "../../api";

import AddBranch from "./Create";
import UpdateBranch from "./Update";
import ConfirmModal from "../../components/Models/Confirm";
import AlertModal from "../../components/Models/AlertModal";
import { isAdmin } from "../../utils/permission";

const user = JSON.parse(localStorage.getItem("user"));
const userRole = user?.role;
const canManage = isAdmin(userRole);
function toJSDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

function Branches() {
  const [branches, setBranches] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({
    title: "",
    message: ""
  });

  const [districtFilter, setDistrictFilter] = useState("all");

  /* ================= HUMAN READABLE DATE ================= */
  const formatDate = (date) => {
    if (!date) return "-";

    const d = date instanceof Date ? date : new Date(date);

    const day = d.getDate();
    const month = d.getMonth() + 1; // Months are 0-based
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  /* ================= FETCH ALL BRANCHES ================= */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setServerError("");
    try {
      const data = await getBranches();
      setBranches(Array.isArray(data) ? data : [data]);
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
    const data = await getBranches();
    setBranches(Array.isArray(data) ? data : [data]);
  };

  /* ================= FILTERS ================= */
  const districts = useMemo(() => {
    return [
      "all",
      ...new Set(branches.map(b => b.district).filter(Boolean))
    ];
  }, [branches]);

  const filteredBranches = useMemo(() => {
    return branches
      .filter(branch => {
        if (districtFilter !== "all" && branch.district !== districtFilter) {
          return false;
        }
        return true;
      })
      .map(branch => ({
        ...branch,
        date: toJSDate(branch.date)   // ✅ keep full object
      }));
  }, [branches, districtFilter]);

  /* ================= OPEN CONFIRM ================= */
  const handleToggleRequest = (branch) => {
    if (branch.active && branch.inUse) {
      setMessageData({
        title: "Action Blocked",
        message:
          "This branch cannot be deactivated because it is currently in use."
      });
      setShowMessage(true);
      return;
    }

    setSelectedBranch(branch);
    setShowConfirm(true);
  };

  /* ================= CONFIRM ACTION ================= */
  const confirmToggleStatus = async () => {
    if (!selectedBranch) return;

    const { id, active, name } = selectedBranch;
    setUpdatingId(id);
    setShowConfirm(false);

    try {
      await processData({
        collection: "branches",
        action: "update",
        id,
        data: { active: !active, restore: !active }
      });

      await reload();

      setMessageData({
        title: "Success",
        message: `Branch "${name}" has been ${
          active ? "deactivated" : "activated"
        } successfully.`
      });
      setShowMessage(true);

    } catch (err) {
      setMessageData({
        title: "Error",
        message: err.message || "Failed to update branch"
      });
      setShowMessage(true);
    } finally {
      setUpdatingId(null);
      setSelectedBranch(null);
    }
  };

  /* ================= RENDER ================= */
  return (
    <>
      {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <span>Loading data...</span>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="dashboard-page">
          {/* ================= HERO ================= */}
          <div className="dashboard-hero">
            <h1>Branches</h1>
            <p>Branch Management</p>
          </div>

          {/* ================= FILTER ================= */}
          {canManage && (
            <div className="dashboard-filters">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                {districts.map(d => (
                  <option key={d} value={d}>
                    {d === "all" ? "All Districts" : d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="branch-content">
            {serverError && <p className="error-text">{serverError}</p>}

            {/* ================= CRUD ================= */}
            {canManage && (
              <div className="crud-container">
                <div className="add-form-container">
                  <AddBranch onSuccess={reload} />
                </div>
                <div className="update-form-container">
                  <UpdateBranch branches={branches} onSuccess={reload} />
                </div>
              </div>
            )}

            {/* ================= TABLE ================= */}
            <div className="norrechel-table-wrapper">
              <h3>Branch Details</h3>

              <table className="norrechel-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Date</th>
                    {canManage && <th>Action</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        No branches found
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch, index) => {
                      const isUpdating = updatingId === branch.id;

                      return (
                        <tr
                          key={branch.id}
                          className={!branch.active ? "row-inactive" : ""}
                        >
                          <td>{index + 1}</td>
                          <td>{branch.name}</td>

                          <td>
                            {branch.district || "-"} - {branch.city}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                branch.active ? "active" : "inactive"
                              }`}
                            >
                              {branch.active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* ✅ Human Readable Date */}
                          <td>{formatDate(branch.date)}</td>

                          {canManage && (
                            <td>
                              <button
                                className={`table-btn ${
                                  branch.active
                                    ? branch.inUse
                                      ? "activate-btn"
                                      : "delete-btn"
                                    : "delete-btn"
                                }`}
                                disabled={
                                  isUpdating ||
                                  (branch.active && branch.inUse)
                                }
                                onClick={() =>
                                  handleToggleRequest(branch)
                                }
                              >
                                {branch.active
                                  ? branch.inUse
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
                selectedBranch
                  ? `Are you sure you want to ${
                      selectedBranch.active ? "deactivate" : "restore"
                    } branch "${selectedBranch.name}"?`
                  : ""
              }
              confirmText="Yes, Continue"
              cancelText="Cancel"
              onConfirm={confirmToggleStatus}
              onCancel={() => {
                setShowConfirm(false);
                setSelectedBranch(null);
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
        </div>
      )}
    </>
  );
}

export default Branches;