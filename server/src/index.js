import app from "./app.js";

import { env } from "./config/env.js";

import { connectDB } from "./config/db.js";

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log("");

    console.log("========================");

    console.log("OPAS CRM Backend");

    console.log(`Environment : ${env.NODE_ENV}`);

    console.log(`Port : ${env.PORT}`);

    console.log("========================");

    console.log("");
  });

  server.on("error", (error) => {
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
