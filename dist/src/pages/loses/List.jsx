import React, { useEffect, useMemo, useState } from "react";
import { getBranches, getBirds, getEggs, getFeeds, getTypes, getLosses } from "../../api";
import AddLoss from "./Create";
import UpdateLoss from "./Update";

/* ================= TABS ================= */
const TABS = [
  { key: "dead-bird", label: "Dead Birds", item: "bird" },
  { key: "broken-egg", label: "Broken Eggs", item: "egg" },
  { key: "spoiled-egg", label: "Spoiled Eggs", item: "spoiled-egg" },
  { key: "feed", label: "Damaged Feed", item: "feed" },
];
/* ================= HELPERS ================= */
const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};

const formatDate = (date) => {
  if (!date) return "-";
  return date.toLocaleDateString();
};

const normalizeToArray = (input) => {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
};

export default function Losses() {
  const [branches, setBranches] = useState([]);
  const [birds, setBirds] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [types, setTypes] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dead-bird");
  const [lossRecords, setLossRecords] = useState([]);
  const [error, setError] = useState(null);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [br, t, b, e, f, l] = await Promise.all([
          getBranches(),
          getTypes(),
          getBirds(),
          getEggs(),
          getFeeds(),
          getLosses(),
        ]);

        setBranches(normalizeToArray(br));
        setTypes(normalizeToArray(t));
        setBirds(normalizeToArray(b));
        setEggs(normalizeToArray(e));
        setFeeds(normalizeToArray(f));
        setLossRecords(normalizeToArray(l));
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const reload = async () => {
    const data = await getLosses();
    setLossRecords(normalizeToArray(data));
  }
  // console.log(lossRecords);
  /* ================= CURRENT TAB ================= */
  const currentTab = useMemo(
    () => TABS.find((t) => t.key === activeTab),
    [activeTab]
  );
  const filteredLosses = useMemo(() => {
    return lossRecords
      .filter(loss => loss.item === currentTab.item)
      .map(loss => ({
        ...loss,
        date: formatDate(normalizeDate(loss.date)),
      }));
  }, [lossRecords, currentTab]);

   /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`dashboard-page `}>
      {/* ================= HEADER ================= */}
      <div className="dashboard-hero">
        <h1>Loss Management</h1>
        <p>Record dead birds, broken eggs, or spoiled eggs</p>
      </div>

      {/* ================= TABS ================= */}
      <div className="stock-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`stock-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= FORM ================= */}
      <div className="crud-container">
        <div className="add-form-container mb-6">
          <AddLoss
            activeItem={currentTab.item}
            birdData={birds}
            eggData={eggs}
            feedData={feeds}
            brancheData={branches}
            typeData={types}
            onSuccess={reload}
          />
        </div>
        <div className="update-form-container mb-6">
          <UpdateLoss
            activeItem={currentTab.item}
            lossData={filteredLosses}
            birdData={birds}
            eggData={eggs}
            feedData={feeds}
            branchData={branches}
            typeData={types}
            onSuccess={reload}
          />
        </div>
      </div>
      {currentTab.item !== 'spoiled-egg' && (
        <div className="norrechel-table-wrapper">
          <table className="norrechel-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLosses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No records yet
                  </td>
                </tr>
              ) : (
                filteredLosses.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{branches.find((b) => b.id === r.branchId)?.name || "-"}</td>
                    <td>{types.find((t) => t.id === r.typeId)?.name || "-"}</td>
                    <td>{r.quantity}</td>
                    <td>{r.reason}</td>
                    <td>{r.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      )}
      
    </div>
  );
}
