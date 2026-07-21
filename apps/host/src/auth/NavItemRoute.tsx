import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@riptacrm/auth-client";

interface NavItemRouteProps {
  navItemId: string;
}

export function NavItemRoute({ navItemId }: NavItemRouteProps) {
  const { user } = useAuth();

  return user && user.navItemIds.includes(navItemId) ? <Outlet /> : <Navigate to="/" replace />;
}
