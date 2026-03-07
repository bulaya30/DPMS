import React, { useEffect, useState, useMemo } from "react";
import {
  getBranches,
  getTypes,
  getBirds,
  getEggs,
  getFeeds,
  getStocks,
} from "../../api";
import KPIStatCard from "../../components/KPIStatCard";
import { FaDove } from "react-icons/fa";
import AddStock from "./create";
import UpdateStock from "./Update";

const TABS = [
  { label: "Birds", key: "birds", item: "bird" },
  { label: "Eggs", key: "eggs", item: "egg" },
  { label: "Feeds", key: "feeds", item: "feed" },
];

const user = JSON.parse(localStorage.getItem("user"));
const role = user?.role;
const canManager = role === "admin" || role === "manager";
const isAdmin = role === "admin";

export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

export default function StockStock() {
  const [activeTab, setActiveTab] = useState("birds");
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [birds, setBirds] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [stock, setStock] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeTabObj = useMemo(
    () => TABS.find(t => t.key === activeTab),
    [activeTab]
  );

  const activeItem = activeTabObj?.item;
  const activeTabLabel = activeTabObj?.label || "";

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    async function fetchData() {
      setError(null);
      setLoading(true);
      try {
        const [b, t, s, bd, ed, fd] = await Promise.all([
          getBranches(),
          getTypes(),
          getStocks(),
          getBirds(),
          getEggs(),
          getFeeds(),
        ]);

        setBranches(normalizeToArray(b));
        setTypes(normalizeToArray(t));
        setStock(normalizeToArray(s));
        setBirds(normalizeToArray(bd));
        setEggs(normalizeToArray(ed));
        setFeeds(normalizeToArray(fd));
      } catch (err) {
        console.error("Stock fetch error:", err);
        setError(err.message || "Failed to load stock");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const reload = async () => {
    const data = await getStocks()
    setStock(normalizeToArray(data))
  }
  // console.log(stock)

  /* ================= FILTERED STOCK ================= */
  const filteredStock = useMemo(() => {
    return stock.filter(row => {
      const branchMatch =
        selectedBranch === "all" || row.branchName === selectedBranch;

      return (
        branchMatch &&
        row.item === activeItem 
      );
    });
  }, [stock, selectedBranch, activeItem]);

  /* ================= KPI: AVAILABLE BIRDS BY TYPE ================= */
  const availableByType = useMemo(() => {
    if (activeItem !== "bird") return {};

    const map = {};

    filteredStock.forEach(s => {
      const type = s.typeName || "Unknown";
      const available = Number(s.quantity || 0);

      map[type] = (map[type] || 0) + available;
    });

    return map;
  }, [filteredStock, activeItem]);

  const totalAvailable = useMemo(() => {
    return Object.values(availableByType).reduce((a, b) => a + b, 0);
  }, [availableByType]);

  const lossColumnConfig = useMemo(() => {
  switch (activeItem) {
    case "bird":
      return { label: "Lost", field: "quantityLost", unit: 'Pieces'};
    case "egg":
      return { label: "Spoiled", field: "quantityLost", unit: 'Trays' };
    case "feed":
      return { label: "Damaged", field: "quantityLost" };
    default:
      return { label: "Lost", field: "quantityLost" };
  }
}, [activeItem]);

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
            <h1>Stock Report</h1>
            <p>Decision Maker</p>
          </div>
          {/* ================= FILTERS ================= */}
          {isAdmin && (
            <div className="dashboard-filters">
              {/* <div className="filter-card"> */}
                <h4>Branches</h4>
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                  >
                    <option value="all">All branches</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                {/* </div> */}
              </div>
          )}
          {/* ================= TABS ================= */}
          <div className="stock-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* ================= KPI DASHBOARD ================= */}
          {activeItem === "bird" && (
            <div className="dashboard-kpis">
              {Object.entries(availableByType).map(([type, qty]) => (
                <KPIStatCard
                  key={type}
                  title={`${type} Available`}
                  value={qty}
                  icon={<FaDove />}
                />
              ))}
              <KPIStatCard
                title="Total Available Birds"
                value={totalAvailable}
                icon={<FaDove />}
              />
            </div>
          )}
          {/* ================= CRUD ================= */}
          {canManager && (
            <div className="crud-container">
              <div className="add-form-container">
                <AddStock
                  stockData={stock}
                  branchData={branches}
                  typeData={types}
                  title={activeTabLabel}
                  onSucess={reload}
                />
              </div>
              <div className="update-form-container">
                <UpdateStock
                  branchData={branches}
                  typeData={types}
                  stockData={stock}
                  birdData={birds}
                  eggData={eggs}
                  feedData={feeds}
                  title={activeTabLabel}
                  onSucess={reload}
                />
              </div>
            </div>
          )}
          {/* ================= STOCK TABLE ================= */}
          <div className="norrechel-table-wrapper">
            <table className="norrechel-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Branch</th>
                  <th>Type</th>
                 <th>{lossColumnConfig.label}</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.itemName || row.item}</td>
                    <td>{row.branchName}</td>
                    <td>{row.typeName ?? '-'}</td>
                    <td className="lost">{row[lossColumnConfig.field] ?? 0} {lossColumnConfig.unit ?? ''}</td>
                    <td className="available">
                      {row.quantity} {lossColumnConfig.unit ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}