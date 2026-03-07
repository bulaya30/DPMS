import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const SalesChart = ({ sales = [], inventories = [], types = [] }) => {
  /* ================= DETECT SOURCE ================= */
  const dataSource = sales.length ? sales : inventories;

  /* ================= TYPE MAP ================= */
  const typeMap = useMemo(
    () => Object.fromEntries((types || []).map(t => [t.id, t.name])),
    [types]
  );

  /* ================= CHART DATA ================= */
  const chartData = useMemo(() => {
    const map = {};

    dataSource
      .filter(i => (i.item === "bird" || i.item === "egg"))
      .forEach(i => {
        const dateStr =
          i.date instanceof Date
            ? i.date.toISOString().split("T")[0]
            : String(i.date);

        const qty =
          Number(i.quantity ?? i.quantitySold ?? 0);

        if (!qty) return;

        const typeName = typeMap[i.typeId] || "-";

        if (!map[dateStr]) {
          map[dateStr] = {
            date: dateStr,
            total: 0,
            breakdown: {},
          };
        }

        map[dateStr].total += qty;
        map[dateStr].breakdown[typeName] =
          (map[dateStr].breakdown[typeName] || 0) + qty;
      });

    return Object.values(map).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [dataSource, typeMap]);

  /* ================= TOOLTIP ================= */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div
        style={{
          background: "#fff",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          outline: "none",
        }}
      >
        <strong>{label}</strong>
        <div>Total: {data.total}</div>
        {Object.entries(data.breakdown).map(([type, qty]) => (
          <div key={type}>
            {type}: {qty}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-card chart-card">
      <h3 className="card-title">Sales Performance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopOpacity={0.4} stopColor="#4ade80" />
              <stop offset="100%" stopOpacity={0} stopColor="#4ade80" />
            </linearGradient>
          </defs>

          <XAxis dataKey="date" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />

          <Area
            type="monotone"
            dataKey="total"
            stroke="#4ade80"
            fill="url(#salesGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;