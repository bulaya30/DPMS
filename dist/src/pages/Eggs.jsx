import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import EggCharts from "../components/EggCharts";
import { getEggs, getBranches } from "../api";

function Eggs() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [eggs, setEggs] = useState([]);
  const [totalEggs, setTotalEggs] = useState(0);

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
    const fetchEggs = async () => {
      const data = await getEggs();
      const filtered = data.filter(e => e.branchId === selectedBranch);
      setEggs(filtered);
      setTotalEggs(filtered.reduce((sum, e) => sum + e.quantity, 0));
    };
    fetchEggs();
  }, [selectedBranch]);

  const chartData = eggs.map(e => ({ date: e.date, eggs: e.quantity }));

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
          <DashboardCard title="Total Eggs Produced" value={totalEggs} />
        </div>

        <div className="charts">
          <EggCharts data={chartData} />
        </div>
      </div>
    </div>
  );
}

export default Eggs;
