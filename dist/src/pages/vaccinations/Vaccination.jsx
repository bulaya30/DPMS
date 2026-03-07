import React, { useEffect, useMemo, useState } from "react";
import KPIStatCard from "../../components/KPIStatCard";
import { getBirds, getTypes, processData } from "../../api";
import { FaSyringe } from "react-icons/fa";
import AlertModal from "../../components/Models/AlertModal";
import { Permission } from "../../utils/permission";

const user = JSON.parse(localStorage.getItem("user"));
const userRole = user?.role;
const canManage = Permission(userRole);

/* ================= DATE HELPERS ================= */

const toDate = d => {
  if (!d) return null;
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000);
  return new Date(d);
};

const normalizeDate = d => {
  const date = toDate(d);
  if (!date || isNaN(date)) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const isDueToday = dueDate => {
  const today = normalizeDate(new Date());
  const due = normalizeDate(dueDate);
  if (!today || !due) return false;
  return today.getTime() === due.getTime();
};

const getDueLabel = dueDate => {
  const today = normalizeDate(new Date());
  const due = normalizeDate(dueDate);

  if (!due) return "-";
  if (due.getTime() === today.getTime()) return "Due Today";
  if (due < today) return "Missed";
  return due.toLocaleDateString();
};

const normalizeToArray = input => {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
};

/* ================= COMPONENT ================= */

function Vaccinations() {
  const [birds, setBirds] = useState([]);
  const [birdTypes, setBirdTypes] = useState([]);

  const [birdTypeFilter, setBirdTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });

  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [isSaving, setIsSaving] = useState(false);

  /* ================= FETCH ================= */

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [typeData, birdData] = await Promise.all([
          getTypes(),
          getBirds()
        ]);

        setBirdTypes(normalizeToArray(typeData));
        setBirds(normalizeToArray(birdData));
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadData = async () => {
    const birdData = await getBirds();
    setBirds(normalizeToArray(birdData));
  };

  /* ================= TYPE MAP ================= */

  const birdTypeMap = useMemo(() => {
    const map = {};
    birdTypes.forEach(t => (map[t.id] = t.name));
    return map;
  }, [birdTypes]);

  /* ================= ROWS ================= */

  const rows = useMemo(() => {
    const mapped = birds
      .filter(b => birdTypeFilter === "all" || b.type === birdTypeFilter)
      .map((b, i) => {
        const dueToday = isDueToday(b.nextVaccination?.dueDate);
        const status = b.nextVaccination?.status || "COMPLETED";

        return {
          id: b.id,
          index: i + 1,
          birdType: birdTypeMap[b.typeName] || b.typeName,
          age: b.age,
          nextVaccination: b.nextVaccination,
          status,
          timeline: b.vaccinationTimeline || [],
          dueToday
        };
      })
      .filter(r => statusFilter === "all" || r.status === statusFilter);

    return mapped.sort((a, b) => {
      if (a.dueToday && !b.dueToday) return -1;
      if (!a.dueToday && b.dueToday) return 1;
      return 0;
    });
  }, [birds, birdTypeFilter, statusFilter, birdTypeMap]);

  /* ================= TOOLTIP POSITION ================= */

  const getTooltipPosition = () => {
    const padding = 16;
    const tooltipWidth = 280;
    const tooltipHeight = 220;

    let x = mousePos.x + 16;
    let y = mousePos.y + 16;

    if (x + tooltipWidth > window.innerWidth) {
      x = mousePos.x - tooltipWidth - 16;
    }

    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - padding;
    }

    return { top: y, left: x };
  };

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    let completed = 0;
    let due = 0;
    let overdue = 0;

    birds.forEach(b => {
      completed += (b.vaccinationTimeline || []).filter(
        t => t.status === "COMPLETED"
      ).length;

      const next = b.nextVaccination;
      if (!next) return;

      if (isDueToday(next.dueDate)) due += 1;
      else if (next.status === "OVERDUE") overdue += 1;
    });

    return { completed, due, overdue };
  }, [birds]);

  /* ================= COMPLETE ================= */

  const handleComplete = async row => {
    if (!row.nextVaccination || isSaving) return;

    try {
      setIsSaving(true);
      // await processData({
      //   collection: "schedules",
      //   action: "completeVaccination",
      //   data: {
      //     birdBatch: birds.find(b => b.id === row.id),
      //     nextVaccination: row.nextVaccination
      //   }
      // });

      setMessageData({
        title: "Success",
        message: "Vaccination completed successfully"
      });

      await reloadData();
    } catch (err) {
      setMessageData({
        title: "Failure",
        message: err?.message || "Failed to complete vaccination"
      });
    } finally {
      setIsSaving(false);
    }

    setShowMessage(true);
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;

  return (
    <>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1>Vaccinations</h1>
          <p>Vaccination Management</p>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="dashboard-filters">
          <select value={birdTypeFilter} onChange={e => setBirdTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {birdTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="DUE">Due</option>
            <option value="OVERDUE">Overdue</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* ===== STATS ===== */}
        <div className="dashboard-kpis">
          <KPIStatCard title="Completed" value={stats.completed} icon={<FaSyringe />} />
          <KPIStatCard title="Due Today" value={stats.due} icon={<FaSyringe />} />
          <KPIStatCard title="Overdue" value={stats.overdue} icon={<FaSyringe />} />
        </div>

        {/* ===== TABLE ===== */}
        <div className="norrechel-table-wrapper">
          <h3>Vaccination Schedule</h3>

          <table className="norrechel-table">
            <thead>
              <tr>
                <th>#</th>
                <th> Type</th>
                <th>Age (Days)</th>
                <th>Vaccine</th>
                <th>Due Date</th>
                <th>Days Left</th>
                <th>Status</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id}
                  className={r.dueToday ? "due-today-row pulse" : ""}
                  onMouseEnter={e => {
                    setHoveredRow(r);
                    setTooltipVisible(true);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltipVisible(false)}
                >
                  <td>{r.index}</td>
                  <td>{r.birdType}</td>
                  <td>{r.age}</td>
                  <td>{r.nextVaccination?.vaccine || "-"}</td>
                  <td>{getDueLabel(r.nextVaccination?.dueDate)}</td>
                  <td>{r.nextVaccination?.daysLeft ?? "-"}</td>
                  <td>
                    <span className={`status-badge ${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>

                  {canManage && (
                    <td>
                      {r.status !== "COMPLETED" && (
                        <button
                          className="table-btn norrechel-success-btn"
                          // disabled={r.status === "UPCOMING"}
                          onClick={() => handleComplete(r)}
                        >
                          {isSaving && <span className="spinner" />}
                          {isSaving ? "Completing..." : "Complete"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ===== FLOATING TOOLTIP ===== */}
          {hoveredRow && hoveredRow.timeline.length > 0 && tooltipVisible && (
            <div
              className="timeline-tooltip floating"
              style={getTooltipPosition()}
            >
              <h4>{hoveredRow.birdType} Vaccine History</h4>

              {hoveredRow.timeline.map((t, i) => (
                <div key={i} className={`timeline-item ${t.status.toLowerCase()}`}>
                  <strong>{t.vaccine}</strong> – {t.ageInDays} days
                </div>
              ))}
            </div>
          )}
        </div>

        <AlertModal
          isOpen={showMessage}
          title={messageData.title}
          message={messageData.message}
          onClose={() => setShowMessage(false)}
        />
      </div>
    </>
  );
}

export default Vaccinations;