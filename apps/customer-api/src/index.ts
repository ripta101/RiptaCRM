import { createApp } from "./app";

const port = Number(process.env.PORT) || 4310;

createApp().listen(port, () => {
  console.log(`customer-api listening on http://localhost:${port}`);
});
