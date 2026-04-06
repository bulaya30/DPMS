import React, { useMemo, useState, useEffect } from "react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import ConfirmModal from "../../components/Models/Confirm";
import AlertModal from "../../components/Models/AlertModal";
import AddFeed from "./Create"; 
import UpdateFeed from "./Update";
import { useGetBranches } from "../../hooks/useBranches";
import { useGetFeeds } from "../../hooks/useFeeds";
import { useProcessFeed } from "../../hooks/useFeeds";
import useAuthStore from "../../store/authStore";


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

function Feeds() {
  const { data: branches = [], loading: branchesLoading, error: branchesError } = useGetBranches();
  const { data: feeds = [], loading: feedsLoading, error: feedsError } = useGetFeeds();
  const { mutate, isPending: isSaving } = useProcessFeed();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [selectedBranch, setSelectedBranch] = useState("all");
  const [feedToDelete, setFeedToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  

  const [messageData, setMessageData] = useState({
    title: "",
    message: ""
  });

  /* ================= URL PARAMS ================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branch = params.get("branch") || "all";
    setSelectedBranch(branch);
  }, []);

  const updateURL = branch => {
    const params = new URLSearchParams();
    if (branch !== "all") params.set("branch", branch);
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  };

  /* ================= FILTERED DATA ================= */
  const filteredFeeds = useMemo(() => {
    let data = feeds || [];
    if (selectedBranch !== "all") {
      data = data.filter(f => f.branch === selectedBranch);
    }
    return data.map(b => ({
      ...b,
      date: normalizeDate(b.date) 
    }));
  }, [feeds, selectedBranch]);

  const exportToExcel = () => {
    const dataToExport = feeds.map((row, index) => ({
      "#": index + 1,
      "Branch": row.branchName,
      "Quantity": row.quantity,
      "Unit": row.unit,
      "Date": normalizeDate(row.date)?.toLocaleDateString(),
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feed Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Feed_Report.xlsx`);
  }

  const tableRows = useMemo(() => {
    
    return filteredFeeds.map(f => ({
      id: f.id,
      name: f.name,
      quantity: f.quantity,
      branch: branches.find(b => b.name === f.branchName)?.name || "",
      unit: f.unit,
      date: f.date,
      active: f.active,
    }));
  }, [filteredFeeds, branches]);

  /* ================= HANDLERS / DELETE ================= */

  const handleDelete = feed => {
    if (showConfirm || feedToDelete) return;
    setFeedToDelete(feed);
    setShowConfirm(true);
  };
 
  const confirmDelete = async () => {
    if (!feedToDelete) return;
    const { id, active, branchId } = feedToDelete;
    setUpdatingId(id);

    mutate({
      collection: "feeds",
      action: active ? "delete" : "restore",
      id,
      data: { active: !active, branchId }
    }, {
      onSuccess: () => {
        setMessageData({
          title: "Success",
          message: `Feed ${active ? "deleted" : "restored"} successfully.`
        });
        setShowMessage(true);
      },
      onError: (err) => {
        setMessageData({
          title: "Error",
          message: `Failed to ${active ? "delete" : "restore"} feed.\n${err.message}`
        });
        setShowMessage(true);
      },
      onSettled: () => {
        setUpdatingId(null);
        setShowConfirm(false);
        setFeedToDelete(null);
      } 
      }
    );
  };

  const handleBranchChange = e => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    updateURL(branch);
  };
  if(branchesLoading || feedsLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    );
  }
  if(branchesError || feedsError) {
    return (
      <div className="error-message">
        {branchesError.message || feedsError.message}
      </div>
    );
  }
  
  return (
    <div className={`dashboard-page `}>
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Feeds</h1>
        <p>Feeds Management</p>
      </div>
      {/* ===== FILTERS ===== */}
      {isAdmin && (
        <div className="dashboard-filters"> 
          <select value={selectedBranch} onChange={handleBranchChange}>
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name} ({b.district})</option>
            ))}
          </select>
        </div>
      )}

      {canManage && (
        <div className="crud-container">
          <div className="add-form-container mb-6">
            <AddFeed
              branchData={branches}
            />
          </div>

          <div className="update-form-container mb-6">
            <UpdateFeed
              feedData={feeds}
              branchData={branches}
            />
          </div>
        </div>
      )}

      {/* ===== FEEDS TABLE ===== */}
      <div className="norrechel-table-wrapper">
        <div className="ispm-print-container">
          <button onClick={exportToExcel} className="ispm-btn">
            Export to Excel
          </button>
        </div>
        <h3>Feed Details</h3>
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Branch</th>
              <th>Date</th>
              {canManage && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>No feeds found</td>
              </tr>
            ) : (
              tableRows.map((feed, index) => {
                const isUpdating = updatingId === feed.id;
                return(
                  <tr 
                    key={feed.id}
                    className={!feed.active ? "row-inactive" : ""}
                  >
                    <td>{index + 1}</td>
                    <td>{feed.name}</td>
                    <td>{feed.quantity}</td>
                    <td>{feed.unit}</td>
                    <td>{feed.branch}</td>
                    <td>{feed.date.toLocaleDateString()}</td>
                    {canManage && (<td>
                      <button
                        className={`table-btn ${
                          feed.active
                          ? "delete-btn deactivate-btn"
                          : "activate-btn"
                        }`
                        }
                        disabled={isUpdating}
                        onClick={() => handleDelete(feed)}
                      >
                        {feed.active ? "Delete" : "Restore"}
                      </button>
                    </td>)}
                  </tr>
                )})
              )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Delete Feed"
        message={`Are you sure you want to delete ${feedToDelete?.name}?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirm(false);
          setFeedToDelete(null);
        }}
      />
            
      <AlertModal
        isOpen={showMessage}
        title={messageData.title}
        message={messageData.message}
        onClose={() => setShowMessage(false)}
      />
    </div>
  );
}

export default Feeds;
