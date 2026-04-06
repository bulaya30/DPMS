import React, { useState, useMemo } from "react";
import { useGetBirds } from "../../hooks/useBirds";
import { useGetBranches } from "../../hooks/useBranches";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetInventories } from "../../hooks/useInventories";

import KPIStatCard from "../../components/KPIStatCard";
import AlertsPanel from "../../components/Models/AlertPanel";
import ProductionChart from "../../components/ProductionChart";
import SalesChart from "../../components/SalesChart";

import { Bird, Egg, Wheat, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import useAuthStore from "../../store/authStore";

/* ================= HELPERS ================= */
const normalizeDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d)
    return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return isNaN(new Date(d).getTime()) ? null : new Date(d);
};

const normalizeToArray = (input) =>
  Array.isArray(input) ? input : input ? [input] : [];

const TABS = [
  { key: "bird", label: "Birds", icon: <Bird /> },
  { key: "egg", label: "Eggs", icon: <Egg /> },
  { key: "feed", label: "Feeds", icon: <Wheat /> },
];

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  /* ================= DATA ================= */
  const {
    data: birds = [],
    isLoading: loadingBirds,
    error: birdError,
  } = useGetBirds();

  const {
    data: branches = [],
    isLoading: branchLoading,
    error: branchError,
  } = useGetBranches();

  const {
    data: types = [],
    isLoading: typeLoading,
    error: typeError,
  } = useGetTypes();

  const {
    data: inventories = [],
    isLoading: inventoryLoading,
    error: inventoryError,
  } = useGetInventories();

  /* ================= STATE ================= */
  const [activeTab, setActiveTab] = useState("bird");
  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("month");

  /* ================= FILTERED INVENTORIES ================= */
  const filteredInventories = useMemo(() => {
    const now = Date.now();
    const from =
      timeFilter === "week"
        ? now - 7 * 864e5
        : timeFilter === "month"
        ? now - 30 * 864e5
        : 0;

    return inventories
      .map((i) => ({ ...i, date: normalizeDate(i.date) }))
      .filter(
        (i) =>
          i.item === activeTab &&
          (!i.date || i.date.getTime() >= from) &&
          (branchFilter === "all" || i.branchId === branchFilter) &&
          (typeFilter === "all" || i.typeId === typeFilter)
      );
  }, [inventories, activeTab, branchFilter, typeFilter, timeFilter]);

  /* ================= FILTERED BIRDS ================= */
  const filteredBirds = useMemo(() => {
    return birds.filter(
      (b) =>
        (branchFilter === "all" || b.branchId === branchFilter) &&
        (typeFilter === "all" || b.typeId === typeFilter)
    );
  }, [birds, branchFilter, typeFilter]);

  /* ================= KPI BY TYPE ================= */
  const typeStats = useMemo(() => {
    const map = {};
    const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]));

    filteredInventories.forEach((i) => {
      const typeName = typeMap[i.typeId] || "Unknown";
      const added = Number(i.quantityAdded || 0);
      const removed = Number(i.quantityRemoved || i.quantitySold || 0);
      const net = added - removed;

      map[typeName] = (map[typeName] || 0) + net;
    });

    types.forEach((t) => {
      if (!(t.name in map)) map[t.name] = 0;
    });

    return map;
  }, [filteredInventories, types]);

  const totalMain = useMemo(
    () => Object.values(typeStats).reduce((a, b) => a + b, 0),
    [typeStats]
  );

  /* ================= VACCINATION ALERTS ================= */
  const vaccinationAlerts = useMemo(() => {
  if (activeTab !== "bird") return [];

  const today = new Date();

  // 1. Group birds by type
  const grouped = {};

  birds.forEach((bird) => {
    const type = bird.typeName;

    if (!grouped[type]) {
      grouped[type] = {
        birds: [],
        maxAge: 0,
      };
    }

    grouped[type].birds.push(bird);

    if (bird.age > grouped[type].maxAge) {
      grouped[type].maxAge = bird.age;
    }
  });

  const alerts = [];

  // 2. Check vaccination schedules
  Object.entries(grouped).forEach(([type, group]) => {
    const { birds, maxAge } = group;

    // Get schedule from first bird (assuming same for type)
    const schedule = normalizeToArray(birds[0]?.vaccinationTimeline);

    schedule.forEach((v) => {
      const scheduleAge = v.ageInDays;

      // 3. If birds are older than schedule age → should have been vaccinated
      if (maxAge >= scheduleAge) {
        // Check if ANY bird has received this vaccine
        const given = birds.some((bird) =>
          normalizeToArray(bird.vaccinationTimeline).some(
            (bV) => bV.vaccine === v.vaccine && bV.givenDate
          )
        );

        if (!given) {
          alerts.push({
            birdType: type,
            age: maxAge,
            vaccine: v.vaccine,
            supposedAge: scheduleAge,
            dueDate: normalizeDate(v.dueDate),
            status: "OVEDUE",
          });
        }
      }
    });
  });

  return alerts.filter(
    (a) =>
      branchFilter === "all" ||
      birds.some(
        (b) => b.typeName === a.birdType && b.branchId === branchFilter
      )
  );
}, [birds, branchFilter, activeTab]);


  const totalVaccinationAlerts = vaccinationAlerts.length;

  /* ================= UI STATES ================= */
  if (
    loadingBirds ||
    branchLoading ||
    typeLoading ||
    inventoryLoading
  ) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading data...</span>
      </div>
    );
  }

  if (birdError || branchError || typeError || inventoryError) {
    const errMsg =
      birdError?.message ||
      branchError?.message ||
      typeError?.message ||
      inventoryError?.message;

    return <div className="error-message">{errMsg}</div>;
  }

  /* ================= RENDER ================= */
  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1>System Overview</h1>
        <p>ISMP</p>
      </div>

      {/* FILTERS */}
      <div className="dashboard-filters">
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        {isAdmin && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABS */}
      <div className="stock-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI CARDS */}
      <div className="dashboard-kpis">
        {activeTab !== "feed" &&
          Object.entries(typeStats).map(([typeName, qty]) => (
            <motion.div key={typeName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <KPIStatCard
                title={typeName}
                value={qty}
                icon={
                  activeTab === "bird" ? (
                    <Bird />
                  ) : activeTab === "egg" ? (
                    <Egg />
                  ) : (
                    <Wheat />
                  )
                }
              />
            </motion.div>
          ))}

        <KPIStatCard
          title={`Total ${
            activeTab === "bird"
              ? "Birds"
              : activeTab === "egg"
              ? "Eggs"
              : "Feed"
          }`}
          value={totalMain}
        />

        {activeTab === "bird" && totalVaccinationAlerts > 0 && (
          <KPIStatCard
            title="Vaccination Alerts"
            value={totalVaccinationAlerts}
            icon={<AlertTriangle />}
            danger
          />
        )}
      </div>

      {/* CHARTS */}
      <div className="dashboard-grid">
        <SalesChart inventories={filteredInventories} types={types} />
        <ProductionChart inventories={filteredInventories} types={types} />
        <AlertsPanel data={{ inventory: filteredInventories, vaccination: vaccinationAlerts }} />
      </div>
    </div>
  );
}