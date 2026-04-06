import React, { useEffect, useMemo, useState } from "react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useGetBranches } from "../../hooks/useBranches";
import { useGetBirds } from "../../hooks/useBirds";
import { useGetEggs } from "../../hooks/useEggs";
import { useGetFeeds } from "../../hooks/useFeeds";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetLosses } from "../../hooks/useLoss";
import { useSearchParams } from "react-router-dom";

import AddLoss from "./Create";
import UpdateLoss from "./Update";

/* ================= TABS ================= */
const TABS = [
  { key: "dead-bird", label: "Dead Birds", item: "bird" },
  { key: "broken-egg", label: "Broken Eggs", item: "egg" },
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


export default function Losses() {
  const { data: branches = [], isLoading: isLoadingBranches, error: errorBranches } = useGetBranches();
  const { data: birds = [], isLoading: isLoadingBirds, error: errorBirds } = useGetBirds();
  const { data: eggs = [], isLoading: isLoadingEggs, error: errorEggs } = useGetEggs();
  const { data: feeds = [], isLoading: isLoadingFeeds, error: errorFeeds } = useGetFeeds();
  const { data: types = [], isLoading: isLoadingTypes, error: errorTypes } = useGetTypes();
  const { data: losses = [], isLoading: isLoadingLosses, error: errorLosses } = useGetLosses();
 
  const [activeTab, setActiveTab] = useState("dead-bird");
  const [error, setError] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  /* ================= CURRENT TAB ================= */
  const currentTab = useMemo(
    () => TABS.find((t) => t.key === activeTab),
    [activeTab]
  );
  const filteredLosses = useMemo(() => {
    return losses
      .filter(loss => loss.item === currentTab.item)
      .map(loss => ({
        ...loss,
        date: formatDate(normalizeDate(loss.date)),
      }));
  }, [losses, currentTab]);

  const exportToExcel = () => {
    const dataToExport = losses.map((row, index) => ({
      "#": index + 1,
      "Branch": row.branchName,
      "Type": row.typeName ?? "-",
      "Quantity": row.quantity,
      "Reason": row.reason,
      "Date": normalizeDate(row.date)?.toLocaleDateString(),
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Loss Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Loss_Report.xlsx`);
  }

   /* ================= UI STATES ================= */
  if (isLoadingBranches || 
      isLoadingBirds || 
      isLoadingEggs || 
      isLoadingFeeds || 
      isLoadingTypes || 
      isLoadingLosses
    ) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (errorBranches || 
      errorBirds || 
      errorEggs || 
      errorFeeds || 
      errorTypes || 
      errorLosses
    ) {
    return (
      <div className="error-message">
        <span>{errorBranches?.message || 
          errorBirds?.message || 
          errorEggs?.message || 
          errorFeeds?.message || 
          errorTypes?.message || 
          errorLosses?.message}</span>
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
          />
        </div>
      </div>
      {currentTab.item !== 'spoiled-egg' && (
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
