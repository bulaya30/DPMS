import React from "react";

function TopNav({ branches, selectedBranch, onBranchChange }) {
  return (
    <div className="top-nav">
      <div className="branch-selector">
        <select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {/* Optional: User profile or other top nav items */}
    </div>
  );
}

export default TopNav;
