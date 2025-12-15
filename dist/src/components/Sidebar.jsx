import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaDove,
  FaSeedling,
  FaSyringe,
  FaEgg,
  FaChartBar,
  FaBars
} from "react-icons/fa";
import "../styles/dashboard.css";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize(); // run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { name: "Dashboard", icon: <FaHome />, path: "/" },
    { name: "Birds", icon: <FaDove />, path: "/birds" },
    { name: "Feeds", icon: <FaSeedling />, path: "/feeds" },
    { name: "Vaccination", icon: <FaSyringe />, path: "/vaccination" },
    { name: "Eggs", icon: <FaEgg />, path: "/eggs" },
    { name: "Reports", icon: <FaChartBar />, path: "/reports" },
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <span className="logo">{collapsed ? "" : "DPMS"}</span>
        <FaBars
          className="toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>

      <ul>
        {menuItems.map((item) => (
          <li key={item.name}>
            <NavLink
              to={item.path}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && <span className="text">{item.name}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
