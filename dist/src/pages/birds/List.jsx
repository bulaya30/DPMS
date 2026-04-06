import React, { useState, useMemo } from 'react'

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useSearchParams } from 'react-router-dom'
import { useGetBirds, useProcessBird } from '../../hooks/useBirds'
import { useGetBranches } from '../../hooks/useBranches'
import { useGetTypes } from '../../hooks/useTypes'

import AddBird from './create'
import UpdateBird from './Update'

import ConfirmModal from '../../components/Models/Confirm'
import AlertModal from '../../components/Models/AlertModal'
import useAuthStore from '../../store/authStore'

/* ================= DATE FORMATTER ================= */
function toJSDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

export default function Birds() {
  const user = useAuthStore(state => state.user);
  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';
  const canManage = user.role === 'admin' || user.role === 'manager';
  
  const { data: branches = [], isLoading: branchesLoading, error: branchesError } = useGetBranches();
  const { data: types = [], isLoading: typesLoading, error: typesError } = useGetTypes();
  const { data: birds = [], isLoading: birdsLoading, error: birdsError } = useGetBirds();
  const { mutate, isPending: isSaving}  = useProcessBird();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });
  const [birdToDelete, setBirdToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  /* ================= BRANCH FILTER (LOCKED) ================= */
  const branchFilter = isAdmin
    ? searchParams.get("branch") || "all"
    : user?.branchId;

  /* ================= FILTERED DATA ================= */
  const filteredBirds = useMemo(() => {
    let data = [...birds];

    if (branchFilter !== "all") {
      data = data.filter(b => b.branchId === branchFilter);
    }

    return data
      .map(b => ({
        ...b,
        date: toJSDate(b.date) 
      }))

  }, [birds, branchFilter]);

  const exportToExcel = () => {
    const dataToExport = birds.map((row, index) => ({
      "#": index + 1,
      "Branch": row.branchName,
      "Type": row.typeName,
      "Age": row.age,
      "Quantity": row.quantity,
      "Price": row.price,
      "Active": row.active ? "Yes" : "No",
      "Date": toJSDate(row.date)?.toLocaleDateString(),
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bird Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Bird_Report.xlsx`);
  }
  /* ================= DELETE ================= */
  const handleDelete = bird => {
    if (isManager) return; 
    setBirdToDelete(bird);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    const { id, active, branchId, typeId } = birdToDelete;
    setUpdatingId(id);

    mutate({
      collection: "birds",
      action: active ? "delete" : "restore",
      id,
      data: { active: !active, restore: !active, branchId, typeId }
    }, {
      onSuccess: () => {
        setMessageData({
          title: "Success",
          message: `Bird ${active ? "deleted" : "restored"} successfully`
        });
        setShowMessage(true);
      },
      onError: err => {
        setMessageData({ title: "Error", message: err.message });
        setShowMessage(true);
      },
      onSettled: () => {
        setUpdatingId(null);
        setShowConfirm(false);
        setBirdToDelete(null);
      }
    })
  };

  /* ================= UI STATES ================= */
  if (birdsLoading || branchesLoading || typesLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading data…</span>
      </div>
    );
  }

  if (birdsError || branchesError || typesError) {
    const errorMsg = birdsError.message || branchesError.message || typesError.message;
    return <div className="error-message">{errorMsg}</div>
  };
  return (
    <div className={`dashboard-page `}>
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Birds</h1>
        <p>Birds Management</p>
      </div>

      {/* ===== FILTERS (ADMIN ONLY) ===== */}
      {isAdmin && (
        <div className="dashboard-filters">
          <select
            value={branchFilter}
            onChange={e =>
              setSearchParams({ branch: e.target.value })
            }
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* ===== FORMS (ADMIN / MANAGER) ===== */}
      {canManage && (
        <div className="crud-container">
          {/* ===== ADD BIRD ===== */}
          <div className="add-form-container mb-6">
            <AddBird brancheData={branches} typeData={types} />
          </div>
          <div className="update-form-container mb-6">
            <UpdateBird birdData={birds} brancheData={branches} typeData={types} />
          </div>
        </div>
      )}
      {/* ===== TABLE ===== */}
        <div className="norrechel-table-wrapper">
          <div className="ispm-print-container">
            <button onClick={exportToExcel} className="ispm-btn">
              Export to Excel
            </button>
          </div>
          <h3>Birds Details</h3>
          <table className="norrechel-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Age</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Date</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {filteredBirds.map((bird, index) => (
                <tr
                  key={bird.id}
                  className={!bird.active ? "row-inactive" : ""}
                >
                  <td>{index + 1}</td>
                  <td>{bird.branchName}</td>
                  <td>{bird.typeName}</td>
                  <td>{bird.age} days</td>
                  <td>{bird.quantity}</td>
                  <td>{bird.price && `${bird.price} UGX`}</td>
                  <td>{bird.date?.toLocaleDateString()}</td>
                  {canManage && (
                    <td>
                      <button
                        disabled={isManager || updatingId === bird.id}
                        className={`table-btn ${
                          bird.active ? "delete-btn" : "activate-btn"
                        }`}
                        onClick={() => handleDelete(bird)}
                        title={
                          isManager
                            ? "Managers are not allowed to delete records"
                            : ""
                        }
                        >
                        {bird.active ? "Delete" : "Restore"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* ===== MODALS ===== */}
        <ConfirmModal
          isOpen={showConfirm}
          title="Confirm Action"
          message="Are you sure?"
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />

        <AlertModal
          isOpen={showMessage}
          {...messageData}
          onClose={() => setShowMessage(false)}
        />
    </div>
  )
}
