import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Route wrapper that prevents unauthenticated users from viewing secure sections.
 * Redirects unauthorized attempts to /Auth.
 */
export default function ProtectedRoute() {
  const token = localStorage.getItem("token");

  if (!token) {
    // If no JWT is found, redirect to authentication
    return <Navigate to="/Auth" replace />;
  }

  // Render children sub-routes if authenticated
  return <Outlet />;
}