import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import companySettingsRoutes from "./routes/companySettings.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import eventRoutes from "./routes/event.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import hrDashboardRoutes from "./routes/hrDashboard.routes.js";
import hrReportRoutes from "./routes/hrReport.routes.js";
import communicationRoutes from "./routes/communication.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Trust first proxy hop so req.ip reflects the real client IP
app.set("trust proxy", 1);

// Security
app.use(helmet());

// CORS
const allowedOrigins = [env.CLIENT_ORIGIN];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, curl, Thunder Client, mobile apps
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (env.NODE_ENV === "development" && origin.includes("localhost")) {
        return callback(null, true);
      }

      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Compression
app.use(compression());

// Cookies
app.use(cookieParser());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ============================================================
   Request Logger
============================================================ */

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  console.log(`🕒 ${new Date().toLocaleString()}`);
  console.log(`🌐 IP          : ${req.ip}`);
  console.log(`🖥️ User-Agent  : ${req.get("user-agent") || "Unknown"}`);

  if (Object.keys(req.query).length) {
    console.log("🔎 Query       :", req.query);
  }

  if (Object.keys(req.params).length) {
    console.log("📌 Params      :", req.params);
  }

  if (
    req.body &&
    Object.keys(req.body).length &&
    req.method !== "GET"
  ) {
    console.log("📦 Body        :", req.body);
  }

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6;

    console.log(`📤 Status      : ${res.statusCode}`);
    console.log(`⏱️ Response    : ${duration.toFixed(2)} ms`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });

  next();
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "OPAS CRM Backend Running",
    version: "1.0.0",
  });
});


app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/companies", companyRoutes);
app.use("/company-settings", companySettingsRoutes);
app.use("/hr/employees", employeeRoutes);
app.use("/hr/recruitment", recruitmentRoutes);
app.use("/hr/attendance", attendanceRoutes);
app.use("/hr/leave", leaveRoutes);
app.use("/hr/payroll", payrollRoutes);
app.use("/hr/events", eventRoutes);
app.use("/hr/holidays", holidayRoutes);
app.use("/hr/meetings", meetingRoutes);
app.use("/hr/dashboard", hrDashboardRoutes);
app.use("/hr/reports", hrReportRoutes);
app.use("/hr/communication", communicationRoutes);

/* ============================================================
   Error Handlers
============================================================ */

app.use(notFound);
app.use(errorHandler);

export default app;