import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import VaccinationStatusChart from "../components/VaccinationStatusChart";
import { getVaccinations, getBranches } from "../api";

function Vaccinations() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0 });

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

    const fetchVaccinations = async () => {
      const data = await getVaccinations();
      const filtered = data.filter(v => v.branchId === selectedBranch);
      setVaccinations(filtered);

      const completed = filtered.filter(v => v.completed).length;
      const pending = filtered.filter(v => !v.completed).length;
      setStats({ completed, pending });
    };
    fetchVaccinations();
  }, [selectedBranch]);

  const chartData = vaccinations.map(v => ({
    birdType: v.birdType,
    completed: v.completed ? 1 : 0,
    pending: v.completed ? 0 : 1,
  }));

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopNav
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
        />

        <div className="cards">
          <DashboardCard title="Completed" value={stats.completed} />
          <DashboardCard title="Pending" value={stats.pending} />
        </div>

        <div className="charts">
          <VaccinationStatusChart data={chartData} />
        </div>
      </div>
    </div>
  );
}

export default Vaccinations;
