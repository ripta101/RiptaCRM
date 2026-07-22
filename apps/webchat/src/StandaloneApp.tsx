import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@riptacrm/ui";
import WebChatModule from "./WebChatModule";

export function StandaloneApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24 }}>
        <WebChatModule />
      </div>
    </ThemeProvider>
  );
}
