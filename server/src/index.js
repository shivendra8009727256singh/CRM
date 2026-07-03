import http from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/socket.js";

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log("");
    console.log("========================");
    console.log("OPAS CRM Backend");
    console.log(`Environment : ${env.NODE_ENV}`);
    console.log(`Port : ${env.PORT}`);
    console.log("Socket.IO : Enabled");
    console.log("========================");
    console.log("");
  });

  httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.PORT} is already in use.`);
    } else {
      console.error("Server startup failed");
      console.error(error);
    }

    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed");
  console.error(error);
  process.exit(1);
});