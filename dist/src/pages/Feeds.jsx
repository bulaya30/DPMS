import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import { getFeeds, getBranches } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function Feeds() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [totalStock, setTotalStock] = useState(0);

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

    const fetchFeeds = async () => {
      const data = await getFeeds();
      const filtered = data.filter(f => f.branchId === selectedBranch);
      setFeeds(filtered);
      setTotalStock(filtered.reduce((sum, f) => sum + f.quantity, 0));
    };
    fetchFeeds();
  }, [selectedBranch]);

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
          <DashboardCard title="Total Feed Stock" value={totalStock} />
        </div>

        <div className="charts">
          <div className="chart">
            <h3>Feed Stock by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feeds} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="#e0e0e0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#00bfff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Feeds;
