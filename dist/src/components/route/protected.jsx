import { Navigate } from "react-router-dom";
import { use, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import { useGetSystemLock } from "../../hooks/useSystem";

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const {
    data: systemLock = [],
    isLoading: systemLoading,
    error: systemError,
  } = useGetSystemLock();

  // console.log(systemLock);

  /* ================= INTERNET RECONNECT ================= */
  useEffect(() => {
    const handleOnline = () => window.location.reload();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  /* ================= LOADING ================= */
  if (systemLoading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading data…</span>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (systemError ) {
    return (
      <div className="server-container">
        <h2>Connection Problem</h2>
        <p>{systemError?.message || userError?.message}</p>
      </div>
    );
  }
  /* ================= SYSTEM LOCK ================= */
  if (!systemLock?.locked) {
    return <Navigate to="/setup" replace />;
  }

  /* ================= AUTH ================= */
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  /* ================= USER ================= */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // store user once
  localStorage.setItem("user", JSON.stringify(user));

  /* ================= SUCCESS ================= */
  return children;
}