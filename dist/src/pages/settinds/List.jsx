import React, { useEffect, useState } from "react";
import { getPrices, getTypes } from "../../api";
import { FaEdit, FaTrash } from "react-icons/fa";
import AddRule from "./create";
import UpdateRule from "./Update";

const user = JSON.parse(localStorage.getItem("user"));
const isAdmin = user?.role === "admin";
/**
 * Ensures the input is always an array.
 * - If input is already an array, returns it as-is
 * - If input is a single object, wraps it in an array
 * - If input is null/undefined, returns an empty array
 */
export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}
export default function Settings() {
  const [prices, setPrices] = useState([]);
  const [types, setTypes] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, t] = await Promise.all([getPrices(), getTypes()]);
      setPrices(normalizeToArray(data));
      setTypes(normalizeToArray(t)); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = rule => {
    console.log("Edit:", rule);
  };

  const handleDelete = rule => {
    console.log("Delete:", rule);
  };

  const reload = async () => {
    try {
      const data = await getPrices();
      setPrices(data || []);
    } catch (err) {
      setError(err.message);
    } 
  }
  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading Data…</span>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;

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
            <AddRule typeData={types} onSuccess={reload} />
          </div>
          <div className="update-form-container mb-6"> 
            <UpdateRule typeData={types} priceRules={prices} onSuccess={reload} />
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