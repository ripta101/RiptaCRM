import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@riptacrm/ui";
import CustomerLookupModule from "./CustomerLookupModule";

export function StandaloneApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24 }}>
        <CustomerLookupModule
          onCustomerIdentified={(customer) =>
            console.log("Customer identified:", customer)
          }
        />
      </div>
    </ThemeProvider>
  );
}
