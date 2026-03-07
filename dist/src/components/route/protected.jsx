import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    // User not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  // User is logged in, render children routes
  return children;
}

export default ProtectedRoute;
