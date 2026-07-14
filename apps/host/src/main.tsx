import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { theme } from "@riptacrm/ui";
import { AuthContextProvider, createHardcodedAuthProvider } from "@riptacrm/auth-client";
import { App } from "./App";

const authProvider = createHardcodedAuthProvider();

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
