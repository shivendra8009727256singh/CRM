import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// FIX BUG 1: Key on email + IP combined so shared IPs (offices, NAT)
// don't block all users when one account has failed attempts.
export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body?.email || "").toLowerCase().trim();
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    return `${ip}::${email}`;
  },
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});