import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FaSave } from "react-icons/fa";
import { checkName, checkNumber } from "../../validations/validate";

import { useGetBirds } from "../../hooks/useBirds";
import { useGetEggs } from "../../hooks/useEggs";
import { useGetBranches } from "../../hooks/useBranches";
import { useGetTypes } from "../../hooks/useTypes";
import { useGetDailySales, useProcessSale } from "../../hooks/useSales";
import { useGetFeeds, useProcessFeed } from "../../hooks/useFeeds";
import useAuthStore from "../../store/authStore";
/* =================== UTILITY =================== */
function normalizeToArray(input) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}
/* ================= HELPERS ================= */
const normalizeDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d)
    return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return isNaN(new Date(d).getTime()) ? null : new Date(d);
};

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "feed", label: "Feed Consumptions" },
];

/* =================== MAIN SALES COMPONENT =================== */
const Sales = () => {
  const { data: branches = [], isLoading: isLoadingBranches, error: errorBranches } = useGetBranches();
  const { data: types = [], isLoading: isLoadingTypes, error: errorTypes } = useGetTypes();
  const { data: birds = [], isLoading: isLoadingBirds, error: errorBirds } = useGetBirds();
  const { data: eggs = [], isLoading: isLoadingEggs, error: errorEggs } = useGetEggs();
  const { data: feeds = [], isLoading: isLoadingFeeds, error:  errorFeeds} = useGetFeeds();
  const { data: todaysales = [], isLoading: isLoadingInvententories, error: errorTodaySales } = useGetDailySales();
  const { mutate: saleMutate, isPending: salePending } = useProcessSale();
  const { mutate: feedMutate, isPending: feedPending } = useProcessFeed();

    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === "admin" || user?.role === "manager";
  

  /* ================= STATE ================= */
  const [activeTab, setActiveTab] = useState("sales");

  const [formData, setFormData] = useState({
    branchId: "",
    typeId: "",
    item: "",
    quantity: "",
    age: "",
    name: "",
    client: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);


  const todayString = useMemo(
    () => new Date().toLocaleDateString(),
    []
  );

  const sales = useMemo(() => {
    return normalizeToArray(todaysales).filter(inv =>
      (inv.item === "bird" || inv.item === "egg") &&
      normalizeDate(inv.date)?.toLocaleDateString() === todayString
    );
  }, [todaysales, todayString]);

  const consumedFeeds = useMemo(() => {
    return normalizeToArray(todaysales).filter(inv =>
      inv.item === "feed" &&
      normalizeDate(inv.date)?.toLocaleDateString() === todayString
    );
  }, [todaysales, todayString]);



  const salesRows = useMemo(() => {
    return sales.map((s, index) => {
      let typeName = "";
      let branchName = "";
      let age = "-";
      let price = 0

      if (s.item === "bird") {
        const bird = birds.find(b => String(b.id) === String(s.itemId));
        branchName = bird?.branchName || "-"
        typeName = bird?.typeName || "-";
        age = bird?.age ? `${bird.age} days` : "-";
        price = bird?.price || 0
      }

      if (s.item === "egg") {
        const egg = eggs.find(e => String(e.id) === String(s.itemId));

        typeName = egg?.typeName || "Unknown";
        price = egg?.price || 0
      }

      return {
        id: s.id,
        client: s.client,
        index: index + 1,
        item: s.item,
        branchName,
        typeName,
        age,
        quantity: s.quantity,
        price,
        total: s.quantity * price,
      };
    });
  }, [sales, birds, eggs]);
  const feedsRows = useMemo(() => {
    return consumedFeeds.map((c, index) => {
      const feed = feeds.find(
        i => String(i.id) === String(c.itemId)
      );
      // console.log(c)
      return {
        id: c.id,
        index: index + 1,
        name: feed?.name || "Unknown",
        quantity: c.quantityConsumed,
      };
    });
  }, [consumedFeeds, feeds]);

  // console.log(consumedFeeds)

  /* ================= AUTO-SET ITEM + RESET ================= */
  useEffect(() => {
    setFormData({
      branchId: branches.length === 1 ? branches[0].id : "",
      typeId: "",
      item: "",
      quantity: "",
      age: "",
      name: "",
      price: 0,
      client: "",
    });
    setErrors({});
    setSuccess("");
    setServerError("");
  }, [activeTab]);

  /* ================= PRESELECT BRANCH ================= */
  useEffect(() => {
    if (branches.length === 1 && !formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches, formData.branchId]);


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
    let newPrice = 0;

    if (formData.typeId && formData.item) {
      const source = formData.item === "bird" ? birds : eggs;

      const selected = source.find(
        i => String(i.typeId) === String(formData.typeId)
      );

      newPrice = selected?.price || 0;
    }

    // 🔑 prevent infinite loop
    if (formData.price !== newPrice) {
      setFormData(prev => ({
        ...prev,
        price: newPrice,
      }));
    }
  }, [formData.typeId, formData.item, birds, eggs]);


  const feedNames = useMemo(() => {
    if (activeTab !== "feed" || !formData.branchId || !feeds?.length) return [];
    
    const filtered = feeds.filter(f =>
      String(f.branchId) === String(formData.branchId)
    );
    
    return [...new Set(filtered.map(f => f.name))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [activeTab, feeds, formData.branchId]);


  /* ================= SHAKE RESET ================= */
  useEffect(() => {
    if (shake) {
      const timeout = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [shake]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {};

    if (!checkName(formData.branchId)) newErrors.branchId = "Select a Branch";

    if (activeTab === 'sales' && !checkName(formData.typeId))
      newErrors.typeId = "Select a type";

    if(activeTab !== 'sales' && !checkName(formData.name))
      newErrors.name = "Enter a valid name please";

    if (!checkNumber(formData.quantity))
      newErrors.quantity = `Enter valid quantity`;

    if (activeTab === 'sales' && formData.item === "bird" && !checkNumber(formData.age))
      newErrors.age = "Enter valid bird age (days)";
    if(activeTab === 'sales' && !checkName(formData.client)) newErrors.client = "Client name required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const data = activeTab === "sales" ? {
      branchId: formData.branchId,
      item: formData.item,
      typeId: formData.typeId,
      age: formData.item === "bird" ? Number(formData.age) : null,
      quantity: Number(formData.quantity),
      client: formData.client,
    } : {
      branchId: formData.branchId,
      name: formData.name,
      quantity: formData.quantity,
    }
    const payload = {
      collection: activeTab === "sales" ? "sales" : "feeds",
      action: activeTab === "sales" ? "add" : "consume",
      data,
    }
    if(activeTab === "sales") {
      saleMutate(payload, {
        onSuccess: () => {
          setSuccess("Item sold successfully")
          setFormData(field=> ({
            ...field,
            branchId: branches.length === 1 ? branches[0].id : "",
            typeId: "",
            age: "",
            quantity: "",
            client: "",
            price: 0,
          })
          )
        },
        onError: error => {
          setServerError(error);
        }, 
        onSettled: () =>{
          setTimeout(() => {
            setServerError("");
            setSuccess("");
          }, 5000);
        }
      })
    } else {
      feedMutate(payload, {
        onSuccess: () => {
          setSuccess("Record saved successfully")
          setFormData(field=> ({
              ...field,
              branchId: branches.length === 1 ? branches[0].id : "",
              name: "",
              quantity: "",
            })
          )
        },
        onError: error => {
          console.log(error);
          setServerError(error);
        }, 
        onSettled: () =>{
          setTimeout(() => {
            setServerError("");
            setSuccess("");
          }, 5000);
        }
      })
    }    
  }

  const total = (formData.quantity || 0) * (formData.price || 0);

  const isQuantityDisabled =
    !formData.item ||
    (formData.item === "bird" && !formData.age) ||
    (formData.item === "egg" && !formData.typeId);

  if (
    isLoadingBranches ||
    isLoadingTypes ||
    isLoadingBirds ||
    isLoadingEggs ||
    isLoadingFeeds ||
    isLoadingInvententories
  ) return (
    <div className="loading-wrapper">
      <div className="spinner" />
      <span>Loading data…</span>
    </div>
  );

   if (errorBranches || errorTypes || errorBirds || errorEggs || errorFeeds || errorTodaySales) {
    const errMsg =
      errorBranches?.message ||
      errorTypes?.message ||
      errorBirds?.message ||
      errorEggs?.message ||
      errorFeeds?.message ||
      errorTodaySales?.message;

    return <div className="error-message">{errMsg}</div>;
  }

  

  return (
    <div className="dashboard-page">
      <div className="stock-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.key}
          </button>
        ))}
      </div>

      <div className="norrechel-form-container">
        {serverError && <div className="error-message">{serverError?.message}</div>}
        {success && <p className="success-text">{success}</p>}
        <h2 className="page-title">New {activeTab}</h2>
        <motion.form onSubmit={handleSubmit} autoComplete="off">
          {activeTab === 'sales' ? (
            <>
              <div className="norrechel-grouped-inputs">
                <div>
                  <label className={`${errors.branchId ? "error-text" : ""}  ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    disabled={branches.length === 1}
                    className={`${errors.branchId ? "input-error" : ""} ${shake && errors.branchId ? "shake" : ""}`}
                  >
                    <option value=""></option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && <span className="error-text">{errors.branchId}</span>}
                </div>
                <div>
                    <label className={`${errors.typeId ? "error-text" : ""}  ${shake && errors.typeId ? "shake" : ""}`}>Type</label>
                    <select
                      name="typeId"
                      value={formData.typeId}
                      onChange={handleChange}
                      className={`${errors.typeId ? "input-error" : ""} ${shake && errors.typeId ? "shake" : ""}`}
                    >
                      <option value=""></option>
                      {types.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {errors.typeId && <span className="error-text">{errors.typeId}</span>}
                </div>
                <div>
                  <label className={`${errors.item ? "error-text" : ""}  ${shake && errors.item ? "shake" : ""}`}>Item</label>
                  <select
                    name="item"
                    value={formData.item}
                    onChange={handleChange}
                    className={`${errors.item ? "input-error" : ""} ${shake && errors.item ? "shake" : ""}`}
                  >
                    <option value=""></option>
                    <option value="bird">Bird</option>
                    <option value="egg">Egg</option>
                  </select>
                  {errors.item && <span className="error-text">{errors.item}</span>}
                </div>
                {formData.item === "bird" && (
                  <div>
                    <label className={`${errors.age ? "error-text" : ""}  ${shake && errors.age ? "shake" : ""}`}>Age (Days)</label>
                    <select
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      disabled={!existingAges.length}
                      className={`${errors.age ? "input-error" : ""} ${shake && errors.age ? "shake" : ""}`}
                    >
                      <option value=""></option>
                      {existingAges.map(a => (
                        <option key={a} value={a}>
                          {a} Days
                        </option>
                      ))}
                    </select>
                    {errors.age && <span className="error-text">{errors.age}</span>}
                  </div>
                )}
                <div>
                  <label className={`${errors.quantity ? "error-text" : ""}  ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    disabled={isQuantityDisabled}
                    className={`${errors.quantity ? "input-error" : ""} ${shake && errors.quantity ? "shake" : ""}`}
                  />
                  {errors.quantity && <span className="error-text">{errors.quantity}</span>}
                </div>
                <div>
                  <label>Price</label>
                  <input type="number" value={formData.price} readOnly />
                </div>
                <div>
                  <label className={`${errors.client ? "error-text" : ""}  ${shake && errors.client ? "shake" : ""}`}>Client</label>
                  <input
                    type="text"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className={`${errors.client ? "input-error" : ""} ${shake && errors.client ? "shake" : ""}`}
                  />
                  {errors.client && <span className="error-text">{errors.client}</span>}
                </div>
                <div>
                  <label>Total</label>
                  <input type="number" value={total} readOnly />
                </div>
              </div>          
            </>
          ): (
            <>
              <div className="norrechel-grouped-inputs">
                <div>
                  <label className={`${errors.branchId ? "error-text" : ""}  ${shake && errors.branchId ? "shake" : ""}`}>Branch</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    disabled={branches.length === 1}
                    className={`${errors.branchId ? "input-error" : ""} ${shake && errors.branchId ? "shake" : ""}`}
                  >
                    <option value=""></option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && <span className="error-text">{errors.branchId}</span>}
                </div>
                <div>
                  <label className={`${errors.name ? "error-text" : ""}  ${shake && errors.name ? "shake" : ""}`}>Name</label>
                  <select 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={feedNames.length === 0}
                    className={`${errors.name ? "input-error" : ""} ${shake && errors.name ? "shake" : ""}`}
                  >
                    <option value="">-- Select --</option>
                    {feedNames.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                <div>
                  <label className={`${errors.quantity ? "error-text" : ""}  ${shake && errors.quantity ? "shake" : ""}`}>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    disabled={feedNames.length === 0}
                    className={`${errors.quantity ? "input-error" : ""} ${shake && errors.quantity ? "shake" : ""}`}
                  />
                  {errors.quantity && <span className="error-text">{errors.quantity}</span>}
                </div>
              </div>
            </>
          )}       
          
          <button 
            type="submit" 
            disabled={feedPending || salePending}
            className={`norrechel-btn save-btn ${(feedPending || salePending) ? "loading" : ""}`}
          >
            {feedPending || salePending && <span className="spinner" />}
            <FaSave /> {(feedPending || salePending) ? "Saving..." : "Save"}
          </button>

        </motion.form>
      </div>
      <div className="norrechel-table-wrapper">
        <h3 className="table-title">Today's {activeTab === "sales" ? " Sales" : " Feed Consumed"}</h3>
        <table className="norrechel-table">
          <thead>
            <tr>
              <th>#</th>
              {activeTab === 'sales' && <th>Client</th>}
              {canManage && <th>Branch</th>}
              {activeTab === "sales" && <th>Item</th>}
              {activeTab === "sales" && <th>Type</th>}
              {activeTab === "sales" && <th>Age</th>}
              {activeTab === "feed" && <th>Name</th>}
              <th>Quantity</th>
              {activeTab === "sales" && <th>Price</th>}
              {activeTab === "sales" && <th>Total</th>}
            </tr>
          </thead>
          <tbody>
            {activeTab === 'sales' ? (
              salesRows.length === 0 ? (
                <tr>
                  <td colSpan="7">No sales today</td>
                </tr>
              ) : (
                salesRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.index}</td>
                    <td>{row.client}</td>
                    {canManage && <td>{row.branchName}</td>}
                    <td>{row.item}</td>
                    <td>{row.typeName}</td>
                    <td>{row.age}</td>
                    <td>{row.quantity}</td>
                    <td>{row.price}</td>
                    <td>{row.total}</td>
                  </tr>
                ))
              )
            ): (
              feedsRows.length === 0 ? (
                <tr>
                  <td colSpan="2">No feed consumed today</td>
                </tr>
              ) : (
                feedsRows.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td>{f.name}</td>
                    <td>{f.quantity}</td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;