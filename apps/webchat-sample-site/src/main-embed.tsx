import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactEmbedDemo } from "./reactEmbedDemo";

createRoot(document.getElementById("widget-root")!).render(
  <StrictMode>
    <ReactEmbedDemo />
  </StrictMode>,
);
