import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { theme } from "@riptacrm/ui";
import { AuthContextProvider, createApiAuthProvider } from "@riptacrm/auth-client";
import { App } from "./App";

const authProvider = createApiAuthProvider({
  baseUrl: import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:4312",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthContextProvider provider={authProvider}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthContextProvider>
    </ThemeProvider>
  </StrictMode>,
);
