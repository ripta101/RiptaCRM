import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "@riptacrm/auth-client";

interface RoleRouteProps {
  allow: UserRole[];
}

export function RoleRoute({ allow }: RoleRouteProps) {
  const { user } = useAuth();

  return user && allow.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
