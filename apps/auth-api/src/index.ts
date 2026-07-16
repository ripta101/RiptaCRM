import { createApp } from "./app";

const port = Number(process.env.PORT) || 4312;

createApp().listen(port, () => {
  console.log(`auth-api listening on http://localhost:${port}`);
});
