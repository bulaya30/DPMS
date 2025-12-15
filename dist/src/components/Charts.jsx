import React from "react";

const Charts = ({ title }) => (
  <div style={{
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: "20px",
    minHeight: "200px"
  }}>
    <h4>{title}</h4>
    <p style={{ color: "#999" }}>Chart will appear here</p>
  </div>
);

export default Charts;
