import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const VaccinationStatusChart = ({ data }) => {
  const defaultData = data.length
    ? data
    : [
        { name: "Completed", value: 80 },
        { name: "Pending", value: 15 },
        { name: "Overdue", value: 5 }
      ];
  const colors = ["#4ade80", "#facc15", "#f87171"];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Vaccination Status</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={defaultData}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            label
          >
            {defaultData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VaccinationStatusChart;
