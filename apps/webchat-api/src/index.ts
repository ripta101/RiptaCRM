import { createServer } from "node:http";
import { createApp } from "./app";
import { attachSocketServer } from "./ws/socketServer";

const port = Number(process.env.PORT) || 4315;

const app = createApp();
const httpServer = createServer(app);
app.locals.io = attachSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`webchat-api listening on http://localhost:${port}`);
});
