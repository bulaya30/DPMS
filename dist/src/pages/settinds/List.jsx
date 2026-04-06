import React, { useEffect, useState } from "react";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetPrices } from "../../hooks/usePrice";
import { FaTrash } from "react-icons/fa";
import AddRule from "./create";
import UpdateRule from "./Update";
import useAuthStore from "../../store/authStore";

const user = JSON.parse(localStorage.getItem("user"));
const isAdmin = user?.role === "admin";

export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}
export default function Settings() {
  const { data: types = [], isLoading: isLoadingTypes, error: typesError } = useGetTypes();
  const { data: prices = [], isLoading: isLoadingPrices, error: pricesError } = useGetPrices();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  
  const [error, setError] = useState("");

  const handleEdit = rule => {
    console.log("Edit:", rule);
  };

  const handleDelete = rule => {
    console.log("Delete:", rule);
  };

  if (isLoadingTypes || isLoadingPrices) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading Data…</span>
      </div>
    );
  }

  if(typesError || pricesError) {
    return (
      <div className="error-wrapper">
        <span>{typesError?.message || pricesError?.message}</span>
      </div>
    );
  }

  return (
    <div className={`dashboard-page `}>
      {/* ================= HERO ================= */}
      <div className="dashboard-hero">
        <h1>Settings</h1>
        <p>System Setup</p>
      </div>

      {isAdmin && (
        <div className="crud-container">
          <div className="add-form-container mb-6">
            <AddRule typeData={types} />
          </div>
          <div className="update-form-container mb-6"> 
            <UpdateRule typeData={types} priceRules={prices}  />
          </div>
        </div>
      )}

      <h3 className="settings-title">Pricing Rules</h3>

      {prices.length === 0 ? (
        <div className="empty-state">No pricing rules configured</div>
      ) : (
        <div className="price-grid">
          {prices.map(rule => (
            <div
              key={rule.id}
              className={`price-card ${!rule.active ? "inactive" : ""}`}
            >
              <div className="price-card-header">
                <div>
                  <h4>{rule.typeName}</h4>
                  <span className="item-pill">{rule.item}</span>
                </div>

                {isAdmin && (
                  <div className="price-actions">
                    <button onClick={() => handleDelete(rule)}>
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>

              <div className="price-ranges">
                {rule.ranges.map((r, i) => (
                  <div key={i} className="price-range">
                    <span>
                      {r.minAge} – {r.maxAge} days
                    </span>
                    <strong>
                      {r.currency?.toUpperCase()} {r.price.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}