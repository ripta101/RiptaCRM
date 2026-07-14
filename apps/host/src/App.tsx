import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleRoute } from "./auth/RoleRoute";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WorklistPage } from "./pages/WorklistPage";
import { ITSupportPage } from "./pages/ITSupportPage";
import { WebChatConfigPage } from "./pages/WebChatConfigPage";
import { EmailConfigPage } from "./pages/EmailConfigPage";
import { CaseManagementConfigPage } from "./pages/CaseManagementConfigPage";
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
          <Route element={<RoleRoute allow={["frontline"]} />}>
            <Route path="/worklist" element={<WorklistPage />} />
            <Route path="/it-support" element={<ITSupportPage />} />
          </Route>
          <Route element={<RoleRoute allow={["admin"]} />}>
            <Route path="/config/webchat" element={<WebChatConfigPage />} />
            <Route path="/config/email" element={<EmailConfigPage />} />
            <Route path="/config/case-management" element={<CaseManagementConfigPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
