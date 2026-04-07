import React, { use, useEffect, useMemo, useState } from "react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import KPIStatCard from "../../components/KPIStatCard";
import { FaSyringe } from "react-icons/fa";
import AlertModal from "../../components/Models/AlertModal";
import { useProcessVaccination } from "../../hooks/useVaccination";
import {useGetBirds} from "../../hooks/useBirds";
import useAuthStore from "../../store/authStore";
import { useGetTypes } from "../../hooks/useTypes";


/* ================= DATE HELPERS ================= */

const toDate = d => {
  if (!d) return null;
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000);
  return new Date(d);
};

const normalizeDate = d => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (typeof d === "object" && "_seconds" in d) return new Date(d._seconds * 1000);
  if (typeof d === "string") return new Date(d);
  return new Date(d);
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
  const { data: types = [], isLoading: typesLoading, error: typesError } = useGetTypes;
  const {data: birds = [], isLoading: birdsLoading, error: birdsError} = useGetBirds();
  const { mutate, isLoading: isSaving } = useProcessVaccination();
  const user = useAuthStore(state => state.user);
  const canManage = user.role === 'manager' || user.role === 'admin';


  const [birdTypeFilter, setBirdTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");


  const [showMessage, setShowMessage] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "" });

  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });


  /* ================= TYPE MAP ================= */
  const birdTypeMap = useMemo(() => {
    const map = {};
    types.forEach(t => (map[t.id] = t.name));
    return map;
  }, [types]);

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
  const exportToExcel = () => {
    const dataToExport = birds.map((row, index) => {
      console.log(row.date);
      return {
        "#": index + 1,
        "Branch": row.branchName,
        "Type": row.typeName,
        "Age": row.age,
        "Vaccine": row.nextVaccination?.vaccine || "-",
        "Due date": row.nextVaccination?.dueDate
          ? normalizeDate(row.nextVaccination?.dueDate)?.toLocaleDateString()
          : "-",
        "Days left": row.nextVaccination?.daysLeft || "-",
        "Status": row.nextVaccination?.status || "-",
        "Date": normalizeDate(row.date).toLocaleDateString(),
      }
    });
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vaccination Report");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Vaccination_Report.xlsx`);
  }
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
    if (!row.nextVaccination) return;
    mutate({
      collection: "schedules",
      action: "completeVaccination",
      data: {
        birdBatch: birds.find(b => b.id === row.id),
        nextVaccination: row.nextVaccination
      }},
      {
        onSuccess: () => {
          setMessageData({
            title: "Success",
            message: "Vaccination completed successfully"
          });
        },
        onError: err => {
          setMessageData({
            title: "Failure",
            message: err?.message || "Failed to complete vaccination"
          });
        },
      })
      setShowMessage(true);
    };
  
  if (birdsLoading || typesLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    );
  }
  
  if( birdsError || typesError) 
    return <div className="error-message">{birdsError.message || typesError.message}</div>;
  
  /* ================= RENDER ================= */
  return (
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1>Vaccinations</h1>
          <p>Vaccination Management</p>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="dashboard-filters">
          <select value={birdTypeFilter} onChange={e => setBirdTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {types.map(t => (
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
          <KPIStatCard item="total" title="Completed" value={stats.completed} icon={<FaSyringe />} />
          <KPIStatCard item="Local" title="Due Today" value={stats.due} icon={<FaSyringe />} />
          <KPIStatCard item="Broilers" title="Overdue" value={stats.overdue} icon={<FaSyringe />} />
        </div>

        {/* ===== TABLE ===== */}
        <div className="norrechel-table-wrapper">
          <div className="ispm-print-container">
            <button onClick={exportToExcel} className="ispm-btn">
              Export to Excel
            </button>
          </div>
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
                          className={`table-btn norrechel-success-btn${r.stats === 'OVERDUE' ? 'overdue' : ''}`}
                          disabled={r.status === "UPCOMING"}
                          onClick={() => completeVaccination(r)} 
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
  );
}

export default Vaccinations;