import { createApp } from "./app";

const port = Number(process.env.PORT) || 4314;

createApp().listen(port, () => {
  console.log(`access-management-api listening on http://localhost:${port}`);
});
