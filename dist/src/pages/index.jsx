import React, { useMemo, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { ThemeContext } from "../components/ThemeContext";

// Pages
import Dashboard from "./home/Dashboard";
import Birds from "./birds/List";
import Sales from "./sales/create";
import Feeds from "./feeds/Feeds";
import Vaccination from "./vaccinations/Vaccination";
import VaccinationSchedule from "./vaccinations/Schedule";
import Losses from "./loses/List";
import Eggs from "./eggs/Eggs";
import Branches from "./branches/List";
import Types from "./types/List";
import Inventory from "./invetories/inventory";
import Stock from "./stoks/List";
import SalesReport from "./sales/List";
import Reports from "./Reports";
import Employees from "./users/employees/List";
import Profile from "./users/profile";
import Setting from "./settinds/List";

const Index = () => {
  const [searchParams] = useSearchParams();
  const { darkMode } = useContext(ThemeContext);

  /* ================= USER ================= */
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  /* ================= ROLE PERMISSIONS ================= */
  const dashboardRoles = ["admin", "manager"];
  const canAccessDashboard = dashboardRoles.includes(user?.role);
  
  /* ================= TAB CONTROL ================= */
  const requestedTab = searchParams.get("tab");
  
  const defaultTab = canAccessDashboard ? "dashboard" : "sales";
  
  const activePage = useMemo(() => {
    if (!requestedTab) return defaultTab;
    
    // 🚫 Restrict dashboard
    if (requestedTab === "dashboard" && !canAccessDashboard) {
      return "sales";
    }

    return requestedTab;
  }, [requestedTab, defaultTab, canAccessDashboard]);
  
  // console.log('ACTIVE PAGE ',activePage);

  /* ================= PAGE RENDER ================= */
  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "birds":
        return <Birds />;

      case "feeds":
        return <Feeds />;

      case "vaccination":
        return <Vaccination />;

      case "vaccination-schedule":
        return <VaccinationSchedule />;

      case "losses":
        return <Losses />;
      case "eggs":
        return <Eggs />;

      case "sales":
        return <Sales />;

      case "sale-report":
        return <SalesReport />;
      case "branches":
        return <Branches />;

      case "item-types":
        return <Types />;

      case "inventories":
        return <Inventory />;

      case "stock":
        return <Stock />;
        
      case "reports":
        return <Reports />;

      case "employees":
        return <Employees />;

      case "profile":
        return <Profile />;
        
        case "settings":
          return <Setting />;

      default:
        return canAccessDashboard ? <Dashboard /> : <Sales />;
    }
  };

  /* ================= UI ================= */
  return (
    <div className={`page-container ${darkMode ? "dark" : "light"}`}>
      <Header />

      <div className="main" id="main">
        <Sidebar />

        <div className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Index;
