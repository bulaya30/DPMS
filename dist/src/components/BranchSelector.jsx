import React from "react";

const BranchSelector = ({ branches, selectedBranch, onSelect }) => {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label htmlFor="branch">Select Branch: </label>
      <select
        id="branch"
        value={selectedBranch}
        onChange={(e) => onSelect(e.target.value)}
        style={{ padding: "5px", marginLeft: "10px" }}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BranchSelector;
