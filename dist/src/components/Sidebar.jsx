import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Home,
  User,
  Users,
  Leaf,
  Syringe,
  Circle,
  BarChart2,
  Building,
  Archive,
  ShoppingCart,
  Calendar,
  ChevronDown,
  Package,
  AlertTriangle,
  Sliders,
  Menu,
  X,
} from "lucide-react";

import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../components/ThemeContext";

const user = JSON.parse(localStorage.getItem("user"));
const defaultRole = user?.role;

function Sidebar({
  userRole = defaultRole,
  lowStockCount = 0,
  itemTypes = [],
  birdBatches = [],
  vaccinationTemplates = [],
  vaccinationHistory = [],
}) {
  const { darkMode } = useContext(ThemeContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  /* ================= RESPONSIVE ================= */
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setCollapsed(isMobile);
      if (!isMobile) setMobileOpen(false);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ================= ROLE ACCESS ================= */
  const canAccess = (roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(userRole);
  };

  /* ================= ACTIVE TAB ================= */
  const activePage = useMemo(
    () => searchParams.get("tab") || "dashboard",
    [searchParams]
  );

  /* ================= LOW ITEM TYPES ================= */
  const lowItemTypeCount = useMemo(
    () => itemTypes.filter((i) => i.quantity <= i.reorderLevel).length,
    [itemTypes]
  );

  /* ================= VACCINATION BADGE ================= */
  const vaccinationBadge = useMemo(() => {
    if (!birdBatches.length || !vaccinationTemplates.length) return null;

    let overdue = 0;
    let upcoming = 0;

    birdBatches.forEach((batch) => {
      const template = vaccinationTemplates.find(
        (t) => t.birdType === batch.birdType
      );

      if (!template) return;

      const next = getNextVaccination?.(
        batch,
        template,
        vaccinationHistory
      );

      if (!next) return;

      const today = new Date();
      const nextDate = new Date(next.date);

      if (nextDate < today) overdue++;
      else if ((nextDate - today) / 86400000 <= 3) upcoming++;
    });

    if (overdue > 0) return { count: overdue, color: "red" };
    if (upcoming > 0) return { count: upcoming, color: "orange" };
    return null;
  }, [birdBatches, vaccinationTemplates, vaccinationHistory]);

  /* ================= MENU GROUPS ================= */
  const menuGroups = useMemo(
    () => [
      {
        title: "Main",
        key: "main",
        items: [
          { key: "dashboard", label: "Dashboard", icon: <Home />, roles: ["admin", "manager"] },
          { key: "sales", label: "Sales", icon: <ShoppingCart /> },
        ],
      },

      {
        title: "Production",
        key: "production",
        items: [
          { key: "branches", label: "Branches", icon: <Building />, roles: ["admin"] },
          {
            key: "item-types",
            label: "Item Types",
            icon: <Archive />,
            badge: lowItemTypeCount,
            badgeColor: "gray",
            roles: ["admin"],
          },
          { key: "birds", label: "Birds", icon: <Leaf /> },
          { key: "eggs", label: "Eggs", icon: <Circle /> },
          { key: "feeds", label: "Feeds", icon: <Leaf /> },
          { key: "vaccination", label: "Vaccination", icon: <Syringe /> },
          {
            key: "vaccination-schedule",
            label: "Vaccination Schedule",
            icon: <Calendar />,
            roles: ["admin"],
            badge: vaccinationBadge?.count,
            badgeColor: vaccinationBadge?.color,
          },
          { key: "losses", label: "Losses", icon: <AlertTriangle />, roles: ["admin", "manager"] },
        ],
      },

      {
        title: "Reports",
        key: "reports",
        roles: ["admin", "manager"],
        items: [
          { key: "stock", label: "Stock", icon: <Package />, badge: lowStockCount, badgeColor: "gray" },
          { key: "sale-report", label: "Sale Report", icon: <BarChart2 /> },
          { key: "inventories", label: "Inventory", icon: <Archive />, badge: lowStockCount, badgeColor: "gray" },
        ],
      },

      {
        title: "Accounts",
        key: "user",
        items: [
          { key: "employees", label: "Employees", icon: <Users />, roles: ["admin", "manager"] },
          { key: "profile", label: "Profile", icon: <User /> },
        ],
      },

      {
        title: "Settings",
        key: "settings",
        roles: ["admin"],
        items: [{ key: "settings", label: "Settings", icon: <Sliders /> }],
      },
    ],
    [lowStockCount, lowItemTypeCount, vaccinationBadge]
  );

  /* ================= AUTO OPEN ================= */
  useEffect(() => {
    const group = menuGroups.find((g) =>
      g.items.some((i) => i.key === activePage)
    );
    if (group) setOpenGroup(group.key);
  }, [activePage, menuGroups]);

  const expanded = !collapsed || hovered || mobileOpen;

  /* ================= RENDER ================= */
  return (
    <>
      {/* ================= MOBILE TOGGLE ================= */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setMobileOpen(prev => !prev)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <motion.aside
        className={`sidebar ${darkMode ? "dark" : "light"}`}
        initial={false}
        animate={{
          x: collapsed && !mobileOpen ? -220 : 0,
          width: 200
        }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        onMouseEnter={() => !collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {menuGroups
          .filter(group => !group.roles || canAccess(group.roles))
          .map(group => {
            const isOpen = openGroup === group.key && expanded;

            return (
              <div key={group.key} className="menu-group">
                <button
                  className="menu-group-title"
                  onClick={() => setOpenGroup(isOpen ? null : group.key)}
                >
                  {expanded && <span>{group.title}</span>}
                  {expanded && (
                    <ChevronDown className={`chevron ${isOpen ? "open" : ""}`} />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="menu-group-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {group.items
                        .filter(item => !item.roles || canAccess(item.roles))
                        .map(item => (
                          <div
                            key={item.key}
                            className={`menu-item ${activePage === item.key ? "active" : ""}`}
                            onClick={() => {
                              setSearchParams({ tab: item.key });
                              setMobileOpen(false);
                            }}
                          >
                            <span className="icon">{item.icon}</span>

                            {expanded && (
                              <>
                                <span className="text">{item.label}</span>
                                {item.badge && (
                                  <span
                                    className="badge"
                                    style={{ backgroundColor: item.badgeColor || "#333" }}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </motion.aside>
    </>
  );
}

export default Sidebar;