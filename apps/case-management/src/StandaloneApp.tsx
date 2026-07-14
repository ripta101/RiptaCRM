import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@riptacrm/ui";
import CaseManagementModule from "./CaseManagementModule";

export function StandaloneApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24 }}>
        <CaseManagementModule />
      </div>
    </ThemeProvider>
  );
}
