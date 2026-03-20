import React, { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

export default function KPIStatCard({ title, value, icon, danger, item=null }) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value || 0, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: latest => setDisplayValue(Math.round(latest)),
    });

    return controls.stop;
  }, [value, motionValue]);

  return (
    <motion.div
      className={`kpi-card ${item?? ''} ${danger ? "danger" : ""}`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 250, damping: 18 }}
    >
      <div className="kpi-icon">{icon}</div>

      <div className="kpi-info">
        <span className="kpi-title">{title}</span>

        <motion.h2
          className="kpi-value"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {displayValue.toLocaleString()}
        </motion.h2>
      </div>
    </motion.div>
  );
}