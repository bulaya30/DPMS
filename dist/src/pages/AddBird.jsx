import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import axios from "axios";

function AddBird() {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    quantity: "",
    category: "Broiler",
    age: "",
    branchId: "",
  });
  const [success, setSuccess] = useState("");

  // Dummy branches (replace with API call if needed)
  useEffect(() => {
    const dummyBranches = [
      { id: "1", name: "Kampala Branch" },
      { id: "2", name: "Entebbe Branch" },
      { id: "3", name: "Jinja Branch" },
    ];
    setBranches(dummyBranches);
    setFormData(prev => ({ ...prev, branchId: dummyBranches[0].id }));
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/birds", formData);
      setSuccess("Bird added successfully!");
      setFormData(prev => ({ ...prev, name: "", age: "" }));
      console.log(res.data);
    } catch (err) {
      console.error(err);
      setSuccess("Failed to add bird.");
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopNav branches={branches} selectedBranch={formData.branchId} onBranchChange={branchId => setFormData(prev => ({ ...prev, branchId }))} />
        <h2>Add New Bird</h2>
        {success && <p>{success}</p>}
        <form onSubmit={handleSubmit} style={{ maxWidth: "500px", marginTop: "20px" }}>
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="Broiler">Broiler</option>
            <option value="Layer">Layer</option>
            <option value="Local">Local</option>
          </select>
          <input type="quantity" name="quantity" placeholder="Quantity" value={formData.name} onChange={handleChange} required />
          <input type="number" name="age" placeholder="Age (weeks)" value={formData.age} onChange={handleChange} required />
          <select name="branchId" value={formData.branchId} onChange={handleChange}>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <button type="submit">Add Bird</button>
        </form>
      </div>
    </div>
  );
}

export default AddBird;
