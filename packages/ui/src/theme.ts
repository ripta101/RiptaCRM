import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1F4E79",
    },
    secondary: {
      main: "#2E9E6B",
    },
    background: {
      default: "#F4F6F8",
    },
  },
  shape: {
    borderRadius: 8,
  },
});
