import { createApp } from "./app";

const port = Number(process.env.PORT) || 4313;

createApp().listen(port, () => {
  console.log(`message-broadcast-api listening on http://localhost:${port}`);
});
