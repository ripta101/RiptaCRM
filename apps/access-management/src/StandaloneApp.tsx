import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@riptacrm/ui";
import AccessManagementModule from "./AccessManagementModule";

export function StandaloneApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24 }}>
        <AccessManagementModule />
      </div>
    </ThemeProvider>
  );
}
