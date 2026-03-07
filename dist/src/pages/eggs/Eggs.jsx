import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardCard from "../../components/DashboardCard";
import KPIStatCard from "../../components/KPIStatCard";
import Modal from "../../components/Models/Model";
import ConfirmModal from "../../components/Models/Confirm";
import AlertModal from "../../components/Models/AlertModal";
import AddEgg from "./Create";
import UpdateEgg from "./Update";
import { getEggs, getBranches, getTypes, getSales, processData } from "../../api";
import {FaEgg } from "react-icons/fa";
import { Permission } from "../../utils/permission";

const user = JSON.parse(localStorage.getItem("user"));
const userRole = user?.role;
const canManage = Permission(userRole);
const isAdmin = userRole === "admin";
// console.log(canManage)
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
const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};


function Eggs() {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [eggs, setEggs] = useState([]);

  const [eggToDelete, setEggToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });

  const [searchParams, setSearchParams] = useSearchParams();
  const branchFilter = searchParams.get("branch") || "all";
  const typeFilter = searchParams.get("type") || "all";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [branchData, eggData, typeData] = await Promise.all([
        getBranches(), getEggs(), getTypes()])
        setBranches(normalizeToArray(branchData));
        setEggs(normalizeToArray(eggData));
        setTypes(normalizeToArray(typeData))
      } catch (error) {
        console.log(error)
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  // console.log(types)
  
  const refreshData = async () => {
    setEggs(await getEggs());
  };
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
        date: normalizeDate(b.date) // ✅ normalize once
      }));
  }, [eggs, branchFilter, typeFilter]);

/* ================= CARD STATS (FIXED) ================= */
  const stats = useMemo(() => {
    const map = {};
    filteredEggs.forEach(b => {
      map[b.typeName] = (map[b.typeName] || 0) + Number(b.quantity);
    });
    return map;
  }, [filteredEggs]);


  const totalProduced = useMemo(
    () => filteredEggs.reduce((sum, b) => sum + Number(b.quantity), 0),
    [filteredEggs]
  );


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
    const { id, active, branchId, typeId } = birdToDelete;
    setUpdatingId(id);
    try {
      await processData({
        collection: "eggs",
        action: active ? "delete" : "restore",
        id,
        data: {
          active: !active,
          restore: !active,
          branchId,
          typeId
        }
      });

      setMessageData({ title: "Success", message: `Eggs ${active ? "deleted" : "restored"} successfully.` });
      setShowMessage(true);
      await refreshData();
    } catch (err) {
      setMessageData({ title: "Error", message: `Failed to ${active ? "delete" : "restore"} Eggs.\n${err.message}` });
      setShowMessage(true);
    } finally {
      setUpdatingId(null);
      setShowConfirm(false);
      setEggToDelete(null);
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
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className={`dashboard-page `}>
          {/* ================= HERO ================= */}
          <div className="dashboard-hero">
            <h1>Eggs</h1>
            <p>Eggs Management</p>
          </div>
          {isAdmin && (
           <div className="dashboard-filters">
              {/* <div className="filter-card"> */}
                {/* <h4>Branches</h4> */}
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
            // </div>
          )}
      
            {canManage && (
              <div className="crud-container">
                <div className="add-form-container mb-6">
                  <AddEgg
                    branchData={branches}
                    typeData={types}
                    onSuccess={refreshData}
                  />
                </div>
                <div className="update-form-container mb-6">
                  <UpdateEgg
                    eggs={eggs}
                    branchData={branches}
                    typeData={types}
                    onSuccess={refreshData}
                  />
                </div>
              </div>
            )}
            {/* ===== TABLE ===== */}
            <div className="norrechel-table-wrapper">
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
                              disabled={isUpdating}
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
              title="Delete Egg"
              message="Are you sure?"
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
      )}
    </>
  );
}

export default Eggs;
