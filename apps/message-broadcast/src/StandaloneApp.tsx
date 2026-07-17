import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@riptacrm/ui";
import MessageBroadcastModule from "./MessageBroadcastModule";

export function StandaloneApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24 }}>
        <MessageBroadcastModule />
      </div>
    </ThemeProvider>
  );
}
