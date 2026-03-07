import React, { useEffect, useMemo, useState } from "react";
import DashboardCard from "../../components/DashboardCard";
import KPIStatCard from "../../components/KPIStatCard";
import Modal from "../../components/Models/Model";
import ConfirmModal from "../../components/Models/Confirm";
import AlertModal from "../../components/Models/AlertModal";
import AddFeed from "./Create"; 
import UpdateFeed from "./Update";
import { getFeeds, getBranches, processData } from "../../api";
import { FaSeedling } from "react-icons/fa";
import { Permission } from "../../utils/permission"

const user = JSON.parse(localStorage.getItem("user"));
const userRole = user?.role;
const canManage = Permission(userRole);
const isAdmin = userRole === "admin";

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
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [allFeeds, setAllFeeds] = useState([]);
  const [feedToDelete, setFeedToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [branchData, feedData] = await Promise.all ([
          getBranches(), getFeeds()
        ]);
        setBranches(normalizeToArray(branchData));
        setAllFeeds(normalizeToArray(feedData))
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ================= REFRESH ALL FEEDS ================= */
  const refreshData = async () => {
    const data = await getFeeds();
    setAllFeeds(data);
  };
  /* ================= FILTERED DATA ================= */
  const filteredFeeds = useMemo(() => {
    let data = allFeeds;
    if (selectedBranch !== "all") {
      data = data.filter(f => f.branch === selectedBranch);
    }
    return data.map(b => ({
      ...b,
      date: normalizeDate(b.date) 
    }));
  }, [allFeeds, selectedBranch]);

  const totalStock = useMemo(() => {
    return filteredFeeds.reduce((sum, f) => sum + Number(f.quantity), 0);
  }, [filteredFeeds]);

  const tableRows = useMemo(() => {
    
    return filteredFeeds.map(f => ({
      id: f.id,
      name: f.name,
      quantity: f.quantity,
      branch: branches.find(b => b.name === f.branchName)?.name || "",
      unit: f.unit,
      date: f.date
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
      try {
        await processData({
          collection: "feeds",
          action: active ? "delete" : "restore",
          id,
        data: {
          active: !active,
          restore: !active,
          branchId,
        }
        });
  
        
        setMessageData({
          title: "Success",
          message: `Feed ${active ? "deleted" : "restored"} successfully.`
        });
        setShowMessage(true);
        await refreshData()
      } catch (err) {
        setMessageData({
          title: "Error",
          message: `Failed to ${active ? "delete" : "restore"} feed.\n${err.message}`
        });
        setShowMessage(true);
      } finally {
        setUpdatingId(null);
        setShowConfirm(false);
        setFeedToDelete(null);
      }
    };

  const handleBranchChange = e => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    updateURL(branch);
  };

  return (
    <>
       {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <span>Loading data...</span>
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
              <h1>Feeds</h1>
              <p>Feeds Management</p>
            </div>
            {/* ===== FILTERS ===== */}
            {isAdmin && (
              <div className="dashboard-filters">
                {/* <div className="filter-card"> */}
                  {/* <h4>Branches</h4> */}
                  <select value={selectedBranch} onChange={handleBranchChange}>
                    <option value="all">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name} ({b.district})</option>
                      ))}
                    </select>
                </div>
              // </div>
            )}

            {canManage && (
              <div className="crud-container">
                <div className="add-form-container mb-6">
                  <AddFeed
                    branchData={branches}
                    onSuccess={refreshData}
                  />
                </div>

                <div className="update-form-container mb-6">
                  <UpdateFeed
                    feeds={allFeeds}
                    branchData={branches}
                    onSuccess={refreshData }
                  />
                </div>
              </div>
            )}

            {/* ===== FEEDS TABLE ===== */}
            <div className="norrechel-table-wrapper">
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
                          </td>
                        )}
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
        </>
      )}
    </>
  );
}

export default Feeds;
