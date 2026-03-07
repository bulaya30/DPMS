import React, { useState, useEffect, useMemo } from "react";
import DashboardCard from "../components/DashboardCard";
import Modal from "../components/Models/Model";
import { getBranches, getBirds, getEggs, getFeeds, getVaccinations } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ================= HELPERS ================= */
const calculateDueDate = (vaccinationDate, dueAfterDays) => {
  const date = new Date(vaccinationDate);
  date.setDate(date.getDate() + Number(dueAfterDays));
  return date;
};

const getVaccinationStatus = vaccination => {
  if (vaccination.completed) return "Completed";

  const today = new Date();
  const dueDate = calculateDueDate(vaccination.vaccinationDate, vaccination.dueAfterDays);
  const diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "Overdue";
  if (diffDays <= 3) return "Due Soon";
  return "Pending";
};

function Reports() {
  const [branches, setBranches] = useState([]);
  const [allBirds, setAllBirds] = useState([]);
  const [allEggs, setAllEggs] = useState([]);
  const [allFeeds, setAllFeeds] = useState([]);
  const [allVaccinations, setAllVaccinations] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");

  /* ================= URL PARAMS ================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBranchFilter(params.get("branch") || "all");
  }, []);

  const updateURL = branch => {
    const params = new URLSearchParams();
    if (branch !== "all") params.set("branch", branch);
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  };

  /* ================= FETCH BRANCHES ================= */
  useEffect(() => {
    const fetchBranches = async () => {
      const data = await getBranches();
      setBranches(data);
    };
    fetchBranches();
  }, []);

  /* ================= FETCH ALL DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      const [birds, eggs, feeds, vaccinations] = await Promise.all([
        getBirds(),
        getEggs(),
        getFeeds(),
        getVaccinations(),
      ]);
      setAllBirds(birds);
      setAllEggs(eggs);
      setAllFeeds(feeds);
      setAllVaccinations(vaccinations);
    };
    fetchData();
  }, []);

  const getBranchName = name => branches.find(b => b.name === name)?.name || "Unknown";

  /* ================= FILTERED DATA ================= */
  const filteredBirds = useMemo(
    () => branchFilter === "all" ? allBirds : allBirds.filter(b => b.branch === branchFilter),
    [allBirds, branchFilter]
  );
  const filteredEggs = useMemo(
    () => branchFilter === "all" ? allEggs : allEggs.filter(e => e.branch === branchFilter),
    [allEggs, branchFilter]
  );
  const filteredFeeds = useMemo(
    () => branchFilter === "all" ? allFeeds : allFeeds.filter(f => f.branch === branchFilter),
    [allFeeds, branchFilter]
  );
  const filteredVaccinations = useMemo(
    () => branchFilter === "all" ? allVaccinations : allVaccinations.filter(v => v.branch === branchFilter),
    [allVaccinations, branchFilter]
  );

  /* ================= STATS ================= */
  const stats = useMemo(() => ({
    totalBirds: filteredBirds.reduce((sum, b) => sum + (b.quantity || 0), 0),
    eggsProduced: filteredEggs.reduce((sum, e) => sum + e.quantity, 0),
    feedsStock: filteredFeeds.reduce((sum, f) => sum + f.quantity, 0),
    vaccinationsPending: filteredVaccinations.filter(v => !v.completed).length,
  }), [filteredBirds, filteredEggs, filteredFeeds, filteredVaccinations]);

  /* ================= FILTER HANDLER ================= */
  const handleBranchChange = e => {
    const branch = e.target.value;
    setBranchFilter(branch);
    updateURL(branch);
  };

  /* ================= EXPORT TO EXCEL ================= */
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summaryData = [
      ["Metric", "Value"],
      ["Total Birds", stats.totalBirds],
      ["Eggs Produced", stats.eggsProduced],
      ["Feed Stock", stats.feedsStock],
      ["Vaccinations Pending", stats.vaccinationsPending],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    const sheets = [
      { data: filteredBirds, name: "Birds" },
      { data: filteredEggs, name: "Eggs" },
      { data: filteredFeeds, name: "Feeds" },
      { data: filteredVaccinations, name: "Vaccinations" },
    ];

    sheets.forEach(sheet => {
      if (sheet.data.length > 0) {
        const formatted = sheet.data.map(item => {
          switch (sheet.name) {
            case "Birds": return { Type: item.name, Quantity: item.quantity, Branch: getBranchName(item.branch) };
            case "Eggs": return { Date: item.date, Quantity: item.quantity, Branch: getBranchName(item.branch) };
            case "Feeds": return { Name: item.name, Quantity: item.quantity, Branch: getBranchName(item.branch) };
            case "Vaccinations": 
              return { 
                BirdType: item.birdType, 
                Vaccine: item.vaccine, 
                DueDate: calculateDueDate(item.vaccinationDate, item.dueAfterDays).toLocaleDateString(),
                Status: getVaccinationStatus(item),
                Completed: item.completed ? "Yes" : "No", 
                Branch: getBranchName(item.branch) 
              };
            default: return item;
          }
        });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(formatted), sheet.name);
      }
    });

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), `DPMS_Report_${branchFilter}.xlsx`);
  };

  /* ================= TABLE RENDER ================= */
  const renderTable = (data, columns, title, type) => (
    <div className="norrechel-table-wrapper">
      <h3>{title}</h3>
      <table className="norrechel-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center" }}>No records</td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={row.id}>
                {columns.map(col => {
                  switch(col){
                    case "Branch": return <td key={col}>{getBranchName(row.branch)}</td>;
                    case "Type": return <td key={col}>{row.type || row.type}</td>;
                    case "DueDate": return <td key={col}>{calculateDueDate(row.vaccinationDate, row.dueAfterDays).toLocaleDateString()}</td>;
                    case "Status": return <td key={col}>{getVaccinationStatus(row)}</td>;
                    default: return <td key={col}>{row[col.toLowerCase()] ?? row[col]}</td>;
                  }
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page-content">
      {/* ===== FILTER & EXPORT ===== */}
      <div className="filters">
        <div className="branch-filter">
          <select className="branch-selector" value={branchFilter} onChange={handleBranchChange}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <button className="norrechel-btn" onClick={exportToExcel}>Export to Excel</button>
      </div>

      {/* ===== DASHBOARD CARDS ===== */}
      <div className="norrechel-cards">
        <DashboardCard title="Total Birds" value={stats.totalBirds} />
        <DashboardCard title="Eggs Produced" value={stats.eggsProduced} />
        <DashboardCard title="Feed Stock" value={stats.feedsStock} />
        <DashboardCard title="Vaccinations Pending" value={stats.vaccinationsPending} />
      </div>

      {/* ===== TABLES ===== */}
      {renderTable(filteredBirds, ["Type", "Quantity", "Branch"], "Birds", "birds")}
      {renderTable(filteredEggs, ["Date", "Quantity", "Branch"], "Eggs", "eggs")}
      {renderTable(filteredFeeds, ["Name", "Quantity", "Branch"], "Feeds", "feeds")}
      {renderTable(filteredVaccinations, ["BirdType", "Vaccine", "DueDate", "Status", "Completed", "Branch"], "Vaccinations", "vaccinations")}
    </div>
  );
}

export default Reports;
