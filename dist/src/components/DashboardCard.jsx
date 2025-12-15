import React from "react";

const DashboardCard = ({ title, value, variant, icon }) => {
  return (
    <div className={`card ${variant || ""}`}>
      {icon && <div className="card-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};

export default DashboardCard;
