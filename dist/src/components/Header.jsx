import React from "react";
import "../styles/dashboard.css";

const Header = ({ branch }) => (
  <div className="dashboard-header">
    <h1>Welcome to DPMS</h1>
    <div className="header-right">
      <span>Branch: <strong>{branch.name}</strong></span>
      <span className="user-info">Admin</span>
    </div>
  </div>
);

export default Header;
