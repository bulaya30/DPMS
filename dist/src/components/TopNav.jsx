import React, { useState, useEffect } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { getItems } from "../api";

function TopNav() {
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");


  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchItems = async () => {
      const data = await getItems();

      setBranches(data.branches || []);
      setCategories(data.categories || []);

      setSelectedBranch(data.branches?.[0]?.id || "");
      setSelectedCategory(data.categories?.[0]?.id || "");
    };

    fetchItems();
  }, []);

  return (
    <div className="filters">
      {/* ===== LEFT SIDE ===== */}
      <div className="branch-filter">
        <select
          className="branch-selector"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="category-filter">
        <select
          className="category-selector"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default TopNav;
