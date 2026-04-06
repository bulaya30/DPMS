import React, { useState, useMemo } from 'react'

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useSearchParams } from 'react-router-dom'

import { useGetBranches } from '../../hooks/useBranches';
import { useGetTypes } from '../../hooks/useTypes';
import { useGetEggs } from '../../hooks/useEggs';
import { useProcessEgg } from '../../hooks/useEggs';
import useAuthStore from '../../store/authStore'

import AddEgg from './Create';
import UpdateEgg from './Update';

import ConfirmModal from '../../components/Models/Confirm';
import AlertModal from '../../components/Models/AlertModal';


const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};
export default function Eggs() {
  const { data: branches = [], isLoading: branchesLoading, error: branchesError } = useGetBranches();
  const { data: types = [], isLoading: typesLoading, error: typesError } = useGetTypes();
  const { data: eggs = [], isLoading: eggsLoading, error: eggsError } = useGetEggs();
  const { mutate, isLoading: isLoading,  } = useProcessEgg();

  const user = useAuthStore(state => state.user);
  const isAdmin = user.role === 'admin';
  const canManage = user.role === 'admin' || user.role === 'manager';

  const [eggToDelete, setEggToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const branchFilter = searchParams.get("branch") || "all";
  const typeFilter = searchParams.get("type") || "all";

  /* ================= FILTER LOGIC ================= */
  const filteredEggs = useMemo(() => {
    let data = eggs;
  
    if (branchFilter !== "all") {
      data = data.filter(b => b.branchName === branchFilter);
    }
  
    if (typeFilter !== "all") {
      data = data.filter(b => b.typeName === typeFilter);
    }
  
    return data.map(b => ({
        ...b,
        date: normalizeDate(b.date) 
      }));
  }, [eggs, branchFilter, typeFilter]);  

  const exportToExcel = () => {
    const dataToExport = eggs.map((row, index) => ({
      "#": index + 1,
      "Branch": row.branchName,
      "Type": row.typeName,
      "Quantity": row.quantity,
      "Price": row.price,
      "Date": normalizeDate(row.date)?.toLocaleDateString(),
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Egg Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Egg_Report.xlsx`);
  }

  /* ================= FILTER HANDLER ================= */
  const updateFilter = (key, value) => {
    const params = Object.fromEntries(searchParams.entries());
    value === "all" ? delete params[key] : (params[key] = value);
    setSearchParams(params);
  };

  /* ================= ACTIONS ================= */

  const handleDelete = egg => {
    if (showConfirm || eggToDelete) return;
    setEggToDelete(egg);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eggToDelete) return;
    const { id, active, branchId, typeId } = eggToDelete;
    setUpdatingId(id);
    mutate({
      collection: "eggs",
      action: active ? "delete" : "restore",
      id,
      data: { active: !active, restore: !active, branchId, typeId }
    }, {
      onSuccess: () => {
        setMessageData({ title: "Success", message: `Eggs ${active ? "deleted" : "restored"} successfully.` });
        setShowMessage(true);
      },
      onError: err => {
        setMessageData({ title: "Error", message: `Failed to ${active ? "delete" : "restore"} Eggs.\n${err.message}` });
        setShowMessage(true);
      }
    });
    setUpdatingId(null);
    setShowConfirm(false);
    setEggToDelete(null);
    
  };

  if (branchesLoading || typesLoading || eggsLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    );
  }
  
  if(branchesError || typesError || eggsError) {
    return (
      <div className="error-message">
        {branchesError.message || typesError.message || eggsError.message}
      </div>
    )
  }
  return (
    <div className={`dashboard-page `}> 
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Eggs</h1>
        <p>Eggs Management</p>
      </div>
      {isAdmin && (
        <div className="dashboard-filters">
          <select
            value={branchFilter}
            onChange={e => updateFilter("branch", e.target.value)}
          >
            <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.district})</option>
              ))}
            </select>
        </div>
      )}
      {canManage && (
        <div className="crud-container">
          <div className="add-form-container mb-6">
            <AddEgg
              branchData={branches}
              typeData={types}
            />
          </div>
          <div className="update-form-container mb-6">
            <UpdateEgg
              eggs={eggs}
              branchData={branches}
              typeData={types}
            />
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
        <h3>Egg Records</h3>
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Branch</th>
              <th>Type</th>
              <th>Color</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Date</th>
              {canManage && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEggs.map((e, i) => {
              const isUpdating = updatingId === e.id;
              return (
                <tr key={e.id} className={!e.active ? "row-inactive" : ""}>
                  <td>{i + 1}</td>
                  <td>{e.branchName}</td>
                  <td>{e.typeName}</td>
                  <td>{e.color}</td>
                  <td>{e.quantity}</td>
                  <td>{e.price}</td>
                  <td>{e.date.toLocaleDateString()}</td>
                  {canManage && (
                    <td>
                      <button
                        className={`table-btn ${
                          e.active
                          ? "delete-btn deactivate-btn"
                          : "activate-btn"
                        }`}
                        disabled={isLoading}
                        onClick={() => handleDelete(e)}
                      >
                        {e.active ? "Delete" : "Restore"}
                      </button>
                    </td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
            
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm"
        message={`Are you sure you want to ${eggToDelete?.active ? "delete" : "restore"} this egg?`}
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
            
      <AlertModal
        isOpen={showMessage}
        title={messageData.title}
        message={messageData.message}
        onClose={() => setShowMessage(false)}
      />
    </div>
  )
}

