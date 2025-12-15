import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import DashboardCard from "../components/DashboardCard";
import EggCharts from "../components/EggCharts";
import VaccinationStatusChart from "../components/VaccinationStatusChart";
import { FaDove, FaEgg, FaSyringe, FaSeedling } from "react-icons/fa";
import { getBirds, getEggs, getVaccinations, getFeeds, getBranches } from "../api";
import "../styles/dashboard.css";

function Dashboard() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [stats, setStats] = useState({
    totalBirds: 0,
    eggsProduced: 0,
    vaccinationsPending: 0,
    feedsStock: 0,
  });
  const [eggData, setEggData] = useState([]);
  const [vaccinationData, setVaccinationData] = useState([]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      const branchList = await getBranches();
      setBranches(branchList);
      const branchId = branchList[0]?.id;
      setSelectedBranch(branchId);

      const birds = await getBirds();
      const eggs = await getEggs();
      const vaccinations = await getVaccinations();
      const feeds = await getFeeds();

      // Filter data by branch
      const branchBirds = birds.filter(b => b.branchId === branchId);
      const branchEggs = eggs.filter(e => e.branchId === branchId);
      const branchVaccinations = vaccinations.filter(v => v.branchId === branchId);
      const branchFeeds = feeds.filter(f => f.branchId === branchId);

      // Update stats
      setStats({
        totalBirds: branchBirds.length,
        eggsProduced: branchEggs.reduce((sum, e) => sum + e.quantity, 0),
        vaccinationsPending: branchVaccinations.filter(v => !v.completed).length,
        feedsStock: branchFeeds.reduce((sum, f) => sum + f.quantity, 0),
      });

      // Prepare chart data
      setEggData(branchEggs.map(e => ({ date: e.date, eggs: e.quantity })));
      setVaccinationData(branchVaccinations.map(v => ({
        birdType: v.birdType,
        completed: v.completed ? 1 : 0,
        pending: v.completed ? 0 : 1,
      })));
    };

    fetchData();
  }, []);

  // Handle branch change
  useEffect(() => {
    if (!selectedBranch) return;

    const fetchBranchData = async () => {
      const birds = await getBirds();
      const eggs = await getEggs();
      const vaccinations = await getVaccinations();
      const feeds = await getFeeds();

      const branchBirds = birds.filter(b => b.branchId === selectedBranch);
      const branchEggs = eggs.filter(e => e.branchId === selectedBranch);
      const branchVaccinations = vaccinations.filter(v => v.branchId === selectedBranch);
      const branchFeeds = feeds.filter(f => f.branchId === selectedBranch);

      setStats({
        totalBirds: branchBirds.length,
        eggsProduced: branchEggs.reduce((sum, e) => sum + e.quantity, 0),
        vaccinationsPending: branchVaccinations.filter(v => !v.completed).length,
        feedsStock: branchFeeds.reduce((sum, f) => sum + f.quantity, 0),
      });

      setEggData(branchEggs.map(e => ({ date: e.date, eggs: e.quantity })));
      setVaccinationData(branchVaccinations.map(v => ({
        birdType: v.birdType,
        completed: v.completed ? 1 : 0,
        pending: v.completed ? 0 : 1,
      })));
    };

    fetchBranchData();
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
          <DashboardCard
            title="Total Birds"
            value={stats.totalBirds}
            variant="birds-card"
            icon={<FaDove />}
          />
          <DashboardCard
            title="Eggs Produced"
            value={stats.eggsProduced}
            variant="eggs-card"
            icon={<FaEgg />}
          />
          <DashboardCard
            title="Vaccinations Pending"
            value={stats.vaccinationsPending}
            variant="vaccination-card"
            icon={<FaSyringe />}
          />
          <DashboardCard
            title="Feed Stock"
            value={stats.feedsStock}
            variant="feeds-card"
            icon={<FaSeedling />}
          />
        </div>

        <div className="charts">
          <EggCharts data={eggData} />
          <VaccinationStatusChart data={vaccinationData} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
