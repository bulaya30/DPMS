// frontend/src/components/EggCharts.jsx
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function EggCharts({ data }) {
  return (
    <div className="chart">
      <h3>Egg Production</h3>
      {data.length === 0 ? (
        <p style={{ textAlign: "center", color: "#777" }}>No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#e0e0e0" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="eggs" stroke="#00bfff" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default EggCharts;
