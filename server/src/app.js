import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

// the first proxy hop so req.ip reflects the real
// client IP when running behind Nginx / a load balancer / Railway / Render.
// Without this, req.ip is always the proxy's internal IP and rate-limiting
// + audit logs record the wrong address.
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(compression());

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "OPAS CRM Backend Running",
  });
});

app.use("/api/auth", authRoutes);

app.use(notFound);

app.use(errorHandler);

export default app;