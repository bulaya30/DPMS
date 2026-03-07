import React, { useEffect, useState, useMemo, useContext } from "react";
import { ThemeContext } from "../../components/ThemeContext";
import { getSales, getBranches, getTypes } from "../../api";

import KPIStatCard from "../../components/KPIStatCard";
import SalesChart from "../../components/SalesChart";

import { Bird, Egg } from "lucide-react";

/* ================= HELPERS ================= */
const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d)
    return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
};

const TABS = [
  { key: "bird", label: "Birds", icon: <Bird /> },
  { key: "egg", label: "Eggs", icon: <Egg /> },
];

export default function SalesReport() {
  const { darkMode } = useContext(ThemeContext);
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const [sales, setSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);

  const [activeTab, setActiveTab] = useState("bird");
  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("month");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, b, t] = await Promise.all([
        getSales(),
        getBranches(),
        getTypes(),
      ]);
      setSales(s || []);
      setBranches(b || []);
      setTypes(t || []);
      setLoading(false);
    })();
  }, []);

  /* ================= FILTER ================= */
  const filteredSales = useMemo(() => {
    const now = Date.now();
    const from =
      dateFilter === "week"
        ? now - 7 * 864e5
        : dateFilter === "month"
        ? now - 30 * 864e5
        : 0;

    return sales
      .map(s => ({ ...s, date: normalizeDate(s.date) }))
      .filter(
        s =>
          s.item === activeTab &&
          (!s.date || s.date.getTime() >= from) &&
          (branchFilter === "all" || s.branchId === branchFilter) &&
          (typeFilter === "all" || s.typeId === typeFilter)
      )
      .sort((a, b) => b.date - a.date);
  }, [sales, activeTab, branchFilter, typeFilter, dateFilter]);

  /* ================= KPI ================= */
  const stats = useMemo(() => {
    const byType = {};
    let totalQty = 0;

    filteredSales.forEach(s => {
      const qty = Number(s.quantity || 0);
      const type = s.typeName || "Unknown";

      totalQty += qty;
      byType[type] = (byType[type] || 0) + qty;
    });

    return {
      totalSold: totalQty,
      salesByType: byType,
    };
  }, [filteredSales]);

  if (loading) return <div className="loading-wrapper">Loading sales…</div>;

  return (
    <div className="dashboard-page">
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Sales Report</h1>
        <p>Financial & Sales Performance</p>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="dashboard-filters">
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        {isAdmin && (
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* ================= TABS ================= */}
      <div className="stock-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= KPI ================= */}
      <div className="dashboard-kpis">
        <KPIStatCard
          title={`Total ${activeTab === "bird" ? "Bird" : "Egg"} Sales`}
          value={stats.totalSold}
          icon={activeTab === "bird" ? <Bird /> : <Egg />}
        />

        {Object.entries(stats.salesByType).map(([type, qty]) => (
          <KPIStatCard
            key={type}
            title={`${type} Sold`}
            value={qty}
            icon={activeTab === "bird" ? <Bird /> : <Egg />}
          />
        ))}
      </div>

      {/* ================= CHART ================= */}
      <div className="dashboard-grid">
        <SalesChart sales={filteredSales} types={types} />
      </div>

      {/* ================= TABLE ================= */}
      <div className="norrechel-table-wrapper">
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Branch</th>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s, index) => (
              <tr key={s.id}>
                <td>{index + 1}</td>
                <td>{s.branchName}</td>
                <td>{s.item}</td>
                <td>{s.typeName || "-"}</td>
                <td>{s.quantity}</td>
                <td>{Number(s.price).toLocaleString()}</td>
                <td>{Number(s.total).toLocaleString()}</td>
                <td>{s.date?.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}