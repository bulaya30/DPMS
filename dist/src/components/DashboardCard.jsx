import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const DashboardCard = ({ title, value, icon, trend }) => {
  return (
    <div className="dashboard-card">
      {/* Background Icon Shape */}
      <div className="card-bg-icon">{icon}</div>

      {/* Main content */}
      <div className="card-main">
        <h4>{title}</h4>
        <span className="value">{value}</span>

        {trend && (
          <div className={`trend-badge ${trend.color}`}>
            {trend.direction === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
