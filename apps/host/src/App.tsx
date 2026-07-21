import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { NavItemRoute } from "./auth/NavItemRoute";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ITSupportPage } from "./pages/ITSupportPage";
import { WebChatConfigPage } from "./pages/WebChatConfigPage";
import { EmailConfigPage } from "./pages/EmailConfigPage";
import { CaseManagementConfigPage } from "./pages/CaseManagementConfigPage";
import { MessageBroadcastConfigPage } from "./pages/MessageBroadcastConfigPage";
import { AccessManagementConfigPage } from "./pages/AccessManagementConfigPage";
import { CustomMenuItemPage } from "./pages/CustomMenuItemPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<NavItemRoute navItemId="it-support" />}>
            <Route path="/it-support" element={<ITSupportPage />} />
          </Route>
          <Route element={<NavItemRoute navItemId="webchat-config" />}>
            <Route path="/config/webchat" element={<WebChatConfigPage />} />
          </Route>
          <Route element={<NavItemRoute navItemId="email-config" />}>
            <Route path="/config/email" element={<EmailConfigPage />} />
          </Route>
          <Route element={<NavItemRoute navItemId="case-management-config" />}>
            <Route path="/config/case-management" element={<CaseManagementConfigPage />} />
          </Route>
          <Route element={<NavItemRoute navItemId="broadcast-config" />}>
            <Route path="/config/broadcasts" element={<MessageBroadcastConfigPage />} />
          </Route>
          <Route element={<NavItemRoute navItemId="access-management-config" />}>
            <Route path="/config/access-management" element={<AccessManagementConfigPage />} />
          </Route>
          <Route path="/custom/:menuItemId" element={<CustomMenuItemPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
