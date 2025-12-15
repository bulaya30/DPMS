import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import { getBranches, getBirds, getEggs, getFeeds, getVaccinations } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function Reports() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [stats, setStats] = useState({
    totalBirds: 0,
    eggsProduced: 0,
    feedsStock: 0,
    vaccinationsPending: 0,
  });

  const [branchData, setBranchData] = useState({
    birds: [],
    eggs: [],
    feeds: [],
    vaccinations: [],
  });

  useEffect(() => {
    const fetchBranches = async () => {
      const data = await getBranches();
      setBranches(data);
      setSelectedBranch(data[0]?.id);
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;

    const fetchData = async () => {
      const birds = await getBirds();
      const eggs = await getEggs();
      const feeds = await getFeeds();
      const vaccinations = await getVaccinations();

      const branchBirds = birds.filter(b => b.branchId === selectedBranch);
      const branchEggs = eggs.filter(e => e.branchId === selectedBranch);
      const branchFeeds = feeds.filter(f => f.branchId === selectedBranch);
      const branchVaccinations = vaccinations.filter(v => v.branchId === selectedBranch);

      setStats({
        totalBirds: branchBirds.length,
        eggsProduced: branchEggs.reduce((sum, e) => sum + e.quantity, 0),
        feedsStock: branchFeeds.reduce((sum, f) => sum + f.quantity, 0),
        vaccinationsPending: branchVaccinations.filter(v => !v.completed).length,
      });

      setBranchData({
        birds: branchBirds,
        eggs: branchEggs,
        feeds: branchFeeds,
        vaccinations: branchVaccinations,
      });
    };

    fetchData();
  }, [selectedBranch]);

  // Export detailed Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1️⃣ Summary Sheet
    const summaryData = [
      ["Metric", "Value"],
      ["Total Birds", stats.totalBirds],
      ["Eggs Produced", stats.eggsProduced],
      ["Feed Stock", stats.feedsStock],
      ["Vaccinations Pending", stats.vaccinationsPending],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // 2️⃣ Birds Sheet
    if (branchData.birds.length > 0) {
      const birdsSheet = XLSX.utils.json_to_sheet(branchData.birds.map(b => ({
        ID: b.id,
        Name: b.name,
        Category: b.category,
        Age: b.age,
        BranchID: b.branchId,
      })));
      XLSX.utils.book_append_sheet(workbook, birdsSheet, "Birds");
    }

    // 3️⃣ Eggs Sheet
    if (branchData.eggs.length > 0) {
      const eggsSheet = XLSX.utils.json_to_sheet(branchData.eggs.map(e => ({
        ID: e.id,
        Date: e.date,
        Quantity: e.quantity,
        BranchID: e.branchId,
      })));
      XLSX.utils.book_append_sheet(workbook, eggsSheet, "Eggs");
    }

    // 4️⃣ Feeds Sheet
    if (branchData.feeds.length > 0) {
      const feedsSheet = XLSX.utils.json_to_sheet(branchData.feeds.map(f => ({
        ID: f.id,
        Name: f.name,
        Quantity: f.quantity,
        BranchID: f.branchId,
      })));
      XLSX.utils.book_append_sheet(workbook, feedsSheet, "Feeds");
    }

    // 5️⃣ Vaccinations Sheet
    if (branchData.vaccinations.length > 0) {
      const vaccinationSheet = XLSX.utils.json_to_sheet(branchData.vaccinations.map(v => ({
        ID: v.id,
        BirdType: v.birdType,
        Date: v.date,
        Completed: v.completed ? "Yes" : "No",
        BranchID: v.branchId,
      })));
      XLSX.utils.book_append_sheet(workbook, vaccinationSheet, "Vaccinations");
    }

    // Save Excel
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `DPMS_Report_Branch_${selectedBranch}.xlsx`);
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopNav
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
        />

        <h2>Branch Reports</h2>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={exportToExcel}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              backgroundColor: "#00bfff",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Export to Excel
          </button>
        </div>

        <div className="cards">
          <DashboardCard title="Total Birds" value={stats.totalBirds} />
          <DashboardCard title="Eggs Produced" value={stats.eggsProduced} />
          <DashboardCard title="Feed Stock" value={stats.feedsStock} />
          <DashboardCard title="Vaccinations Pending" value={stats.vaccinationsPending} />
        </div>
      </div>
    </div>
  );
}

export default Reports;
