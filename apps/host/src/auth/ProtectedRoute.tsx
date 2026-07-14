import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@riptacrm/auth-client";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
