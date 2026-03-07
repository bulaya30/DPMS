import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getInventories, getBranches } from "../../api";

const isAdmin = true;

/* ================= TABS ================= */
const TABS = [
  { label: "Birds", key: "bird" },
  { label: "Eggs", key: "egg" },
  { label: "Feeds", key: "feed" },
];

/* ================= DATE HELPERS ================= */
const formatDate = (date) => {
  if (!date) return "";
  if (date._seconds) return new Date(date._seconds * 1000).toLocaleDateString();
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const normalizeDate = (date) => {
  if (!date) return "";
  if (date._seconds) return new Date(date._seconds * 1000).toISOString().split("T")[0];
  return date;
};

export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

const today = () => new Date().toISOString().split("T")[0];
const currentMonth = () => today().slice(0, 7);

export default function Inventories() {
  const [branches, setBranches] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("bird");

  const inputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const branchFilter = searchParams.get("branch") || "all";
  const urlMode = searchParams.get("mode") || null;
  const value = searchParams.get("value") || "";

  const [localMode, setLocalMode] = useState(urlMode);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [b, i] = await Promise.all([getBranches(), getInventories()]);
        setBranches(normalizeToArray(b));
        setInventories(normalizeToArray(i));
      } catch (err) {
        console.error(err);
        setError("Failed to fetch inventories. Check your Internet connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ================= FILTER UPDATE ================= */
  const updateFilter = (key, val) => {
    const params = Object.fromEntries(searchParams.entries());

    if (!val || val === "all") delete params[key];
    else params[key] = val;

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
    updateFilter("value", mode === "date" ? today() : currentMonth());

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.showPicker?.();
    });
  };

  /* ================= FILTERED INVENTORIES ================= */
  const filteredInventories = useMemo(() => {
    let data = [...inventories];

    data = data.filter(i => i.item === activeTab);

    if (branchFilter !== "all") {
      data = data.filter(i => i.branchId === branchFilter);
    }

    if (value) {
      if (localMode === "date") {
        data = data.filter(i => normalizeDate(i.date) === value);
      }
      if (localMode === "month") {
        data = data.filter(i => normalizeDate(i.date)?.startsWith(value));
      }
    }

    // 🔽 SORT: Latest date first
    data.sort((a, b) => {
      const da = new Date(normalizeDate(a.date));
      const db = new Date(normalizeDate(b.date));
      return db - da;
    });

    return data;
  }, [inventories, branchFilter, activeTab, localMode, value]);


  const inputType = localMode === "date" ? "date" : localMode === "month" ? "month" : "text";
  const showConsumed = activeTab === "feed";


  return (
    <>
      {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <span>Loading Data...</span>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className={`dashboard-page `}>
          {/* ================= HERO ================= */}
          <div className="dashboard-hero">
            <h1>Inventories</h1>
            <p>Ledger Performance</p>
          </div>
          {/* ================= FILTERS ================= */}
          <div className="dashboard-filters">
            {branches.length > 1 && (
              // <div className="filter-card">
              // <h4>Branches</h4>
              <select value={branchFilter} onChange={e => updateFilter("branch", e.target.value)}>
                <option value="all">All branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              // </div>
            )}

            {/* <div className="filter-card">
              <h4>Filter by</h4> */}
              <div className="mode-switch">
                {["date", "month"].map(m => (
                  <label key={m} className={localMode === m ? "active" : ""}>
                    <input
                      type="radio"
                      checked={localMode === m}
                      onChange={() => switchMode(m)}
                    />
                    <span className="radio-label">
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </span>
                  </label>
                ))}
              {/* </div> */}
            </div>
          </div>
          {/* ================= TABS ================= */}
          <div className="stock-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`stock-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* ================= SMART INPUT ================= */}
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
          {/* ================= TABLE ================= */}
          <div className="norrechel-table-wrapper">
            <table className="norrechel-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>Opening</th>
                  <th>Added</th>
                  {!showConsumed && <th>Sold</th>}
                  {showConsumed && <th>Consumed</th>}
                  <th>Closing</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredInventories.length === 0 ? (
                  <tr>
                    <td colSpan={showConsumed ? 9 : 8} style={{ textAlign: "center" }}>
                      No inventory found
                    </td>
                  </tr>
                ) : (
                  filteredInventories.map((inv, i) => (
                    <tr key={inv.id} className="table-row" style={{ animationDelay: `${i * 40}ms` }}>
                      <td>{i + 1}</td>
                      <td>{inv.branchName}</td>
                      <td>{inv.typeName}</td>
                      <td>{inv.openingStock}</td>
                      <td>{inv.quantityAdded}</td>
                      {!showConsumed && <td>{inv.quantitySold}</td>}
                      {showConsumed && <td>{inv.quantityConsumed}</td>}
                      <td>{inv.closingStock}</td>
                      <td>{formatDate(inv.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>
      )}
    </>
  );
}
