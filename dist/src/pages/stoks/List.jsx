import React, { useEffect, useState, useMemo } from "react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useGetBranches } from "../../hooks/useBranches";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetBirds } from "../../hooks/useBirds";
import { useGetEggs  } from "../../hooks/useEggs";
import { useGetFeeds } from "../../hooks/useFeeds";
import { useGetStocks } from "../../hooks/useStocks";
import KPIStatCard from "../../components/KPIStatCard";
import { FaDove } from "react-icons/fa";
import AddStock from "./create";
import UpdateStock from "./Update";
import useAuthStore from "../../store/authStore";

const TABS = [
  { label: "Birds", key: "birds", item: "bird" },
  { label: "Eggs", key: "eggs", item: "egg" },
  { label: "Feeds", key: "feeds", item: "feed" },
];



export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

export default function StockStock() {
  const {data: stocks = [], error: stockError, isLoading: stockLoading} = useGetStocks();
  const {data: branches = [], error: branchError, isLoading: branchLoading} = useGetBranches();
  const {data: types = [], error: typeError, isLoading: typeLoading} = useGetTypes();
  const {data: birds = [], error: birdError, isLoading: birdLoading} = useGetBirds();
  const {data: eggs = [], error: eggError, isLoading: eggLoading} = useGetEggs();
  const {data: feeds = [], error: feedError, isLoading: feedLoading} = useGetFeeds();
  const user = useAuthStore(state=> state.user);
  const isAdmin = user.role === 'admin';
  const canManage = user.role === 'admin' || user.role === 'manager';

  const [activeTab, setActiveTab] = useState("birds");

  const [selectedBranch, setSelectedBranch] = useState("all");
  const [error, setError] = useState(null);

  const activeTabObj = useMemo(
    () => TABS.find(t => t.key === activeTab),
    [activeTab]
  );

  const activeItem = activeTabObj?.item;
  const activeTabLabel = activeTabObj?.label || "";

  /* ================= FILTERED STOCK ================= */
  const filteredStock = useMemo(() => {
    return stocks.filter(row => {
      const branchMatch =
        selectedBranch === "all" || row.branchName === selectedBranch;

      return (
        branchMatch &&
        row.item === activeItem 
      );
    });
  }, [stocks, selectedBranch, activeItem]);


  // Export filtered stock to Excel
  const exportToExcel = () => {
    const dataToExport = stocks.map((row, index) => ({
      "#": index + 1,
      "Item": row.itemName || row.item,
      "Branch": row.branchName,
      "Type": row.typeName ?? "-",
      "Quantity": row.quantity,
      "Date": form
    }))
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Stock_Report.xlsx`);
  }
  
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

  if(stockLoading || branchLoading || typeLoading || birdLoading || eggLoading || feedLoading){
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading Data...</span>
      </div>
    );
  }

  if(stockError || branchError || typeError || birdError || eggError || feedError){
    return (
      <div className="error-message">
        {
          stockError?.message || 
          branchError?.message || 
          typeError?.message || 
          birdError?.message || 
          eggError?.message || 
          feedError?.message
        }
      </div>
    );
  }

  return (
    <div className={`dashboard-page `}>
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Stock Report</h1>
        <p>Decision Maker</p>
      </div>
      {/* ================= FILTERS ================= */}
      {isAdmin && (
        <div className="dashboard-filters">
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
              item={type}
            />
          ))}
          <KPIStatCard
            title="Total Available Birds"
            value={totalAvailable}
            icon={<FaDove />}
            item="total"
          />
        </div>
      )}
      {/* ================= CRUD ================= */}
      {canManage && (
        <div className="crud-container">
          <div className="add-form-container">
            <AddStock
              stockData={stocks}
              branchData={branches}
              typeData={types}
              feedData={feeds}
              title={activeTabLabel}
            />
          </div>
          <div className="update-form-container">
            <UpdateStock
              branchData={branches}
              typeData={types}
              stockData={stocks}
              birdData={birds}
              eggData={eggs}
              feedData={feeds}
              title={activeTabLabel}
            />
          </div>
        </div>
      )}
      {/* ================= STOCK TABLE ================= */}
      <div className="norrechel-table-wrapper">
        <div className="ispm-print-container">
          <button onClick={exportToExcel} className="ispm-btn">
            Export to Excel
          </button>
        </div>
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Branch</th>
              <th>Type</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.itemName || row.item}</td>
                <td>{row.branchName}</td>
                <td>{row.typeName ?? '-'}</td>
                <td className="available">
                  {row.quantity} 
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}