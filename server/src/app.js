import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";

import {
  notFound,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

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