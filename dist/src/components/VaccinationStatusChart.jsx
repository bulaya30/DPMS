// frontend/src/components/VaccinationStatusChart.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

function VaccinationStatusChart({ data }) {
  return (
    <div className="chart">
      <h3>Vaccination Status</h3>
      {data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#777" }}>No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#e0e0e0" />
            <XAxis dataKey="birdType" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#00bfff" />
            <Bar dataKey="pending" stackId="a" fill="#ff7f50" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default VaccinationStatusChart;
