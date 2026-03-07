import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import KPIStatCard from "../../components/KPIStatCard";
import DashboardCard from "../../components/DashboardCard";
import ConfirmModal from "../../components/Models/Confirm";
import AlertModal from "../../components/Models/AlertModal";
import AddBird from "./create";
import UpdateBird from "./Update";
import { getBirds, getBranches, getTypes, processData } from "../../api";
import { FaDove } from "react-icons/fa";
import { Permission } from "../../utils/permission";

/* ================= AUTH ================= */
const user = JSON.parse(localStorage.getItem("user"));
const role = user?.role;
const isAdmin = role === "admin";
const isManager = role === "manager";
const canManage = Permission(role); // existing logic
/* ================= HELPERS ================= */
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

function Birds() {
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [allBirds, setAllBirds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });
  const [birdToDelete, setBirdToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  /* ================= BRANCH FILTER (LOCKED) ================= */
  const branchFilter = isAdmin
    ? searchParams.get("branch") || "all"
    : user?.branchId; // 🔐 forced

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchData, typeData, birdData] = await Promise.all([
          getBranches(), getTypes(), getBirds()
        ]);
        setBranches(normalizeToArray(branchData));
        setTypes(normalizeToArray(typeData));
        setAllBirds(normalizeToArray(birdData));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const reload = async () => {
    const data = await getBirds();
    setAllBirds(data);
  };
  /* ================= FILTERED DATA ================= */
  const filteredBirds = useMemo(() => {
    let data = [...allBirds];

    if (branchFilter !== "all") {
      data = data.filter(b => b.branchId === branchFilter);
    }

    return data
      .map(b => ({
        ...b,
        date: normalizeDate(b.date) 
      }))

  }, [allBirds, branchFilter]);


  /* ================= DELETE ================= */
  const handleDelete = bird => {
    if (isManager) return; 
    setBirdToDelete(bird);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    const { id, active, branchId, typeId } = birdToDelete;
    setUpdatingId(id);

    try {
      await processData({
        collection: "birds",
        action: active ? "delete" : "restore",
        id,
        data: { active: !active, restore: !active, branchId, typeId }
      });

      setMessageData({
        title: "Success",
        message: `Bird ${active ? "deleted" : "restored"} successfully`
      });

      await reload();
    } catch (err) {
      setMessageData({ title: "Error", message: err.message });
    } finally {
      setShowConfirm(false);
      setShowMessage(true);
      setUpdatingId(null);
      setBirdToDelete(null);
    }
  };

  /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;
  /* ================= RENDER ================= */
  return (
    <>
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
              <AddBird brancheData={branches} typeData={types} onSuccess={reload} />
            </div>
            <div className="update-form-container mb-6">
              <UpdateBird birdData={allBirds} brancheData={branches} typeData={types} onSuccess={reload} />
            </div>
          </div>
        )}
        {/* ===== TABLE ===== */}
        <div className="norrechel-table-wrapper">
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
    </>
  );
}

export default Birds;
