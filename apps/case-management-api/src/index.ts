import { createApp } from "./app";
import { startScheduler } from "./scheduler";

const port = Number(process.env.PORT) || 4311;

createApp().listen(port, () => {
  console.log(`case-management-api listening on http://localhost:${port}`);
  startScheduler();
});
