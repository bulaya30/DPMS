import React, { useState } from "react";
import Inventories from "../../pages/invetories/inventory";

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB"); // or "en-US"
};

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
      <div key={a.birdId + a.vaccine + i} className="alert-row">
        <p>{a.birdType} of {a.age} days missed "{a.vaccine }" vaccination on {formatDate(a.dueDate)}</p>
        <p>{a.vaccine} age is {a.supposedAge} days</p>
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
