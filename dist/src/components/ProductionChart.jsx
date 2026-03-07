import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const ProductionChart = ({ inventories, types }) => {
  // typeId → type name
  const typeMap = useMemo(
    () => Object.fromEntries((types || []).map(t => [t.id, t.name])),
    [types]
  );

  // Prepare chart data
  const chartData = useMemo(() => {
    const map = {};

    inventories
      .filter(i => (i.item === "bird" || i.item === "egg") && Number(i.quantityAdded || 0) > 0)
      .forEach(i => {
        const dateStr =
          i.date instanceof Date
            ? i.date.toISOString().split("T")[0]
            : String(i.date);

        const typeName = typeMap[i.typeId] || "Unknown";

        if (!map[dateStr]) {
          map[dateStr] = {
            date: dateStr,
            total: 0,
            breakdown: {},
          };
        }

        map[dateStr].total += Number(i.quantityAdded || 0);
        map[dateStr].breakdown[typeName] =
          (map[dateStr].breakdown[typeName] || 0) +
          Number(i.quantityAdded || 0);
      });

    return Object.values(map).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [inventories, typeMap]);

  // Custom tooltip → show type breakdown
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div style={{ background: "#fff", padding: "10px", border: "1px solid #ccc" }}>
        <strong>{label}</strong>
        <div>Total Produced: {data.total}</div>
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
      <h3 className="card-title">Production Overview</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopOpacity={0.4} stopColor="#60a5fa" />
              <stop offset="100%" stopOpacity={0} stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#60a5fa"
            fill="url(#prodGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionChart;