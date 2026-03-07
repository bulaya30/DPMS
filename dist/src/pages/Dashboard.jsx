import React, { useEffect, useState, useMemo, useContext } from "react";
import { ThemeContext } from "../components/ThemeContext";
import { getInventories, getBranches, getTypes, getBirds } from "../api";

import KPIStatCard from "../components/KPIStatCard";
import AlertsPanel from "../components/Models/AlertPanel";
import ProductionChart from "../components/ProductionChart";
import SalesChart from "../components/SalesChart";

import { Bird, Egg, Wheat, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

/* ================= HELPERS ================= */
const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return isNaN(new Date(d).getTime()) ? null : new Date(d);
};

const normalizeToArray = input => (Array.isArray(input) ? input : input ? [input] : []);

const TABS = [
  { key: "bird", label: "Birds", icon: <Bird /> },
  { key: "egg", label: "Eggs", icon: <Egg /> },
  { key: "feed", label: "Feeds", icon: <Wheat /> },
];

export default function Dashboard() {
  const { darkMode } = useContext(ThemeContext);
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  /* ================= STATE ================= */
  const [activeTab, setActiveTab] = useState("bird");
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [birds, setBirds] = useState([]);

  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("month");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    (async () => {
      try {
        const [b, i, t, birdsData] = await Promise.all([
          getBranches(),
          getInventories(),
          getTypes(),
          getBirds(),
        ]);

        setBranches(normalizeToArray(b));
        setInventories(normalizeToArray(i));
        setTypes(normalizeToArray(t));
        setBirds(normalizeToArray(birdsData));
      } catch (err) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= FILTERED INVENTORIES ================= */
  const filteredInventories = useMemo(() => {
    const now = Date.now();
    const from =
      timeFilter === "week" ? now - 7 * 864e5 :
      timeFilter === "month" ? now - 30 * 864e5 : 0;

    return inventories
      .map(i => ({ ...i, date: normalizeDate(i.date) }))
      .filter(
        i =>
          i.item === activeTab &&
          (!i.date || i.date.getTime() >= from) &&
          (branchFilter === "all" || i.branchId === branchFilter) &&
          (typeFilter === "all" || i.typeId === typeFilter)
      );
  }, [inventories, activeTab, branchFilter, typeFilter, timeFilter]);

  // console.log(filteredInventories);
  /* ================= FILTERED BIRDS ================= */
  const filteredBirdStock = useMemo(() => {
    return birds.filter(
      b =>
        (branchFilter === "all" || b.branchId === branchFilter) &&
        (typeFilter === "all" || b.typeId === typeFilter)
    );
  }, [birds, branchFilter, typeFilter]);

  /* ================= KPI BY TYPE ================= */
  const typeStats = useMemo(() => {
    const map = {};

    // Map typeId -> typeName for quick lookup
    const typeMap = Object.fromEntries((types || []).map(t => [t.id, t.name]));

    filteredInventories.forEach(i => {
      const typeName = typeMap[i.typeId] || "Unknown";

      // Determine the net quantity (added - removed)
      const added = Number(i.quantityAdded || 0);
      const removed = Number(i.quantityRemoved || i.quantitySold || 0);
      const net = added - removed;

      map[typeName] = (map[typeName] || 0) + net;
    });

    // Ensure all types exist in the map (even if zero)
    (types || []).forEach(t => {
      if (!(t.name in map)) map[t.name] = 0;
    });

    return map;
  }, [filteredInventories, types]);

  const totalMain = useMemo(() => Object.values(typeStats).reduce((a, b) => a + b, 0), [typeStats]);

  /* ================= VACCINATION ALERTS ================= */
  const vaccinationAlerts = useMemo(() => {
    if (activeTab !== "bird") return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return birds.flatMap(bird => {
      if (!Array.isArray(bird.vaccinations)) return [];
      return bird.vaccinations
        .map(v => {
          const due = normalizeDate(v.dueDate);
          const given = normalizeDate(v.givenDate);
          let status = "UPCOMING";
          if (!given && due) {
            if (due < today) status = "OVERDUE";
            else if (due.getTime() === today.getTime()) status = "DUE";
          }
          if (given) status = "GIVEN";

          return { birdId: bird.id, birdType: bird.typeName, branchId: bird.branchId, vaccine: v.vaccine, dueDate: due, status };
        })
        .filter(v => (v.status === "DUE" || v.status === "OVERDUE") && (branchFilter === "all" || v.branchId === branchFilter));
    });
  }, [birds, branchFilter, activeTab]);

  const totalVaccinationAlerts = vaccinationAlerts.length;

  /* ================= UI ================= */
  if (loading) return <div className="loading-wrapper"><div className="spinner" /><span>Loading dashboard…</span></div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className={`dashboard-page ${darkMode ? "dark" : ""}`}>
      {/* HERO */}
      <div className="dashboard-hero">
        <h1>System Overview</h1>
        <p>Digital Poultry Management System</p>
      </div>

      {/* FILTERS */}
      <div className="dashboard-filters">
        <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        {isAdmin && (
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* TABS */}
      <div className="stock-tabs">
        {TABS.map(tab => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI CARDS */}
      <div className="dashboard-kpis">
        {/* Total KPI */}

        {/* KPI per type */}
        {Object.entries(typeStats).map(([typeName, qty]) => (
          <motion.div key={typeName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <KPIStatCard
              title={typeName}
              value={qty}
              icon={activeTab === "bird" ? <Bird /> : activeTab === "egg" ? <Egg /> : <Wheat />}
            />
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <KPIStatCard
            title={`Total ${activeTab === "bird" ? "Birds" : activeTab === "egg" ? "Eggs" : "Feed"}`}
            value={totalMain}
            icon={activeTab === "bird" ? <Bird /> : activeTab === "egg" ? <Egg /> : <Wheat />}
          />
        </motion.div>

        {/* Vaccination alerts */}
        {activeTab === "bird" && totalVaccinationAlerts > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <KPIStatCard title="Vaccination Alerts" value={totalVaccinationAlerts} icon={<AlertTriangle />} danger />
          </motion.div>
        )}
      </div>

      {/* CHARTS & ALERTS */}
      <div className="dashboard-grid">
        <SalesChart inventories={filteredInventories} types={types} />
        <ProductionChart inventories={filteredInventories} types={types} />
        <AlertsPanel data={{ inventory: filteredInventories, vaccination: vaccinationAlerts }} />
      </div>
    </div>
  );
}