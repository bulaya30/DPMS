import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import { getBirds, getBranches } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function Birds() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [birds, setBirds] = useState([]);
  const [stats, setStats] = useState({ broiler: 0, layer: 0, local: 0 });

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

    const fetchBirds = async () => {
      const data = await getBirds();
      const filtered = data.filter(b => b.branchId === selectedBranch);
      setBirds(filtered);

      const broiler = filtered.filter(b => b.category === "Broiler").length;
      const layer = filtered.filter(b => b.category === "Layer").length;
      const local = filtered.filter(b => b.category === "Local").length;
      setStats({ broiler, layer, local });
    };
    fetchBirds();
  }, [selectedBranch]);

  const chartData = [
    { category: "Broiler", count: stats.broiler },
    { category: "Layer", count: stats.layer },
    { category: "Local", count: stats.local },
  ];

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
          <DashboardCard title="Broilers" value={stats.broiler} />
          <DashboardCard title="Layers" value={stats.layer} />
          <DashboardCard title="Locals" value={stats.local} />
          <DashboardCard title="Total Birds" value={birds.length} />
        </div>

        <div className="charts">
          <div className="chart">
            <h3>Birds by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="#e0e0e0" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#00bfff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Birds;
