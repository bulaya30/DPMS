import React, { useState } from "react";

export default function AlertsPanel({ data }) {
  const { inventory = [], vaccination = [] } = data || {};

  const [activeTab, setActiveTab] = useState("inventory");

  const inventoryAlerts = inventory.filter(d => d.alert);
  const vaccinationAlerts = vaccination;

  const renderAlerts = (alerts) => {
    if (!alerts || alerts.length === 0) {
      return <p className="muted">No critical alerts 🎉</p>;
    }
    return alerts.slice(0, 5).map((a, i) => (
      <div key={i} className="alert-row">
        <span>{a.birdType} birds missed {a.vaccine } vaccination on {a.date}</span>
      </div>
    ));
  };

  return (
    <div className="panel alerts-panel">
      <h3>Alerts & Actions</h3>

      {/* Tabs */}
      <div className="alert-tabs">
        <button
          className={activeTab === "inventory" ? "active" : ""}
          onClick={() => setActiveTab("inventory")}
        >
          Inventory Alerts ({inventoryAlerts.length})
        </button>
        <button
          className={activeTab === "vaccination" ? "active" : ""}
          onClick={() => setActiveTab("vaccination")}
        >
          Vaccination Alerts ({vaccinationAlerts.length})
        </button>
      </div>

      {/* Alert List */}
      <div className="alert-list">
        {activeTab === "inventory" && renderAlerts(inventoryAlerts)}
        {activeTab === "vaccination" && renderAlerts(vaccinationAlerts)}
      </div>
    </div>
  );
}
