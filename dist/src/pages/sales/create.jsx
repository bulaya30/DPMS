import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getBirds,
  getEggs,
  getBranches,
  getTypes,
  getDailySales,
  processData,
} from "../../api";
import { FaPlus, FaSave } from "react-icons/fa";
import { checkName, checkNumber } from "../../validations/validate";

export function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

const Sales = () => {
  const [formData, setFormData] = useState({
    item: "",
    branchId: "",
    typeId: "",
    age: "",
    quantity: "",
    unit: "",
    price: 0,
  });

  const [branches, setBranches] = useState([]);
  const [types, setTypes] = useState([]);
  const [birds, setBirds] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [sales, setSales] = useState([]);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesData, birdsData, eggsData, branchesData, typesData] =
        await Promise.all([
          getDailySales(),
          getBirds(),
          getEggs(),
          getBranches(),
          getTypes(),
        ]);

      setSales(normalizeToArray(salesData));
      setBranches(normalizeToArray(branchesData));
      setTypes(normalizeToArray(typesData));
      setBirds(normalizeToArray(birdsData));
      setEggs(normalizeToArray(eggsData));
    } catch (err) {
      setServerError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= PRESELECT BRANCH ================= */
  useEffect(() => {
    if (branches.length === 1) {
      setFormData(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches]);

  /* ================= AVAILABLE AGES ================= */
  const existingAges = useMemo(() => {
    if (!formData.branchId || !formData.typeId || formData.item !== "bird")
      return [];

    return [...new Set(
      birds
        .filter(
          b =>
            String(b.branchId) === String(formData.branchId) &&
            String(b.typeId) === String(formData.typeId) &&
            b.active
        )
        .map(b => Number(b.age))
    )].sort((a, b) => a - b);
  }, [birds, formData.branchId, formData.typeId, formData.item]);
  
  /* ================= AUTO PRICE (TYPE BASED) ================= */
  useEffect(() => {
    if (!formData.typeId || !formData.item) {
      setFormData(prev => ({ ...prev, price: 0 }));
      return;
    }

    const source = formData.item === "bird" ? birds : eggs;

    const selected = source.find(
      i => String(i.typeId) === String(formData.typeId)
    );
    setFormData(prev => ({
      ...prev,
      price: selected?.price || 0,
    }));
  }, [formData.typeId, formData.item, birds, eggs]);

  /* ================= VALIDATION ================= */
  const validateField = (name, value) => {
    switch (name) {
      case "branchId":
      case "item":
      case "typeId":
        return checkName(value) ? "" : "Required";
      case "age":
        if (formData.item === "bird")
          return checkNumber(value) ? "" : "Age required";
        return "";
      case "quantity":
        return checkNumber(value) && value > 0 ? "" : "Invalid quantity";
      default:
        return "";
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;

    if (name === "item") {
      setFormData({
        item: value,
        branchId: formData.branchId,
        typeId: "",
        age: "",
        quantity: "",
        unit: value === "egg" ? "tray" : "piece",
        price: 0,
      });
      return;
    }

    if (name === "branchId") {
      setFormData(prev => ({
        ...prev,
        branchId: value,
        typeId: "",
        age: "",
        quantity: "",
      }));
      return;
    }

    if (name === "typeId") {
      setFormData(prev => ({
        ...prev,
        typeId: value,
        age: "",
        quantity: "",
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));

    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  /* ================= HANDLE SUBMIT ================= */
  const handleSubmit = async e => {
    e.preventDefault();
    if (isSaving) return;

    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        collection: "sales",
        action: "add",
        data: {
          branchId: formData.branchId,
          item: formData.item,
          typeId: formData.typeId,
          age: formData.item === "bird" ? Number(formData.age) : null,
          quantity: Number(formData.quantity),
        },
      };

      const res = await processData(payload);
      // console.log(res)

      setFormData(prev => ({
        ...prev,
        typeId: "",
        age: "",
        quantity: "",
        price: 0,
      }));
      await refreshSales();
    } catch (err) {
      console.log("Failed to save sale:", err.message);
      setServerError("Failed to save sale");
    } finally {
      setIsSaving(false);
    }
  };

  const refreshSales = async () => {
    try {
      const salesData = await getDailySales();
      setSales(normalizeToArray(salesData));
    } catch (err) {
      console.log("Failed to load daily sales:", err.message);
    }
  };


  const total = (formData.quantity || 0) * (formData.price || 0);

  const isQuantityDisabled =
    !formData.item ||
    (formData.item === "bird" && !formData.age) ||
    (formData.item === "egg" && !formData.typeId);

  /* ================= UI STATES ================= */
  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading birds…</span>
      </div>
    );
  }

  if (serverError) return <div className="error-message">{serverError.message}</div>;

  return (
    <div className={`dashboard-page `}>
      <div className="norrechel-form-container">
        <h2 className="page-title">New Sale</h2>

        <motion.form onSubmit={handleSubmit}>
          <div className="norrechel-grouped-inputs">
            <div>
              <label>Branch</label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                disabled={branches.length === 1}
              >
                <option value=""></option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Item</label>
              <select
                name="item"
                value={formData.item}
                onChange={handleChange}
              >
                <option value=""></option>
                <option value="bird">Bird</option>
                <option value="egg">Egg</option>
              </select>
            </div>
          </div>

          <div className="norrechel-grouped-inputs">
            <div>
              <label>Type</label>
              <select
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
              >
                <option value=""></option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.item === "bird" && (
              <div>
                <label>Age (days)</label>
                <select
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!existingAges.length}
                >
                  <option value=""></option>
                  {existingAges.map(a => (
                    <option key={a} value={a}>
                      {a} Days
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="norrechel-grouped-inputs">
            <div>
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                disabled={isQuantityDisabled}
              />
            </div>

            <div>
              <label>Price</label>
              <input type="number" value={formData.price} readOnly />
            </div>

            <div>
              <label>Total</label>
              <input type="number" value={total} readOnly />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className={`norrechel-btn save-btn ${isSaving ? "loading" : ""}`}
          >
            {isSaving && <span className="spinner" />}
            <FaSave /> {isSaving ? "Saving..." : "Save"}
          </button>
        </motion.form>
      </div>

      {/* ================= SALES TABLE ================= */}
      <div className="norrechel-table-wrapper">
        <h3 className="table-title">Today's Sales</h3>
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Type</th>
              <th>Age</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.length > 0 ? (
              sales.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{s.item}</td>
                  <td>{s.typeName}</td>
                  <td>{s.item === "bird" ? `${s.age} days` : "-"}</td>
                  <td>{s.quantity}</td>
                  <td>{s.price}</td>
                  <td>{s.quantity * s.price}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No sales today</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
