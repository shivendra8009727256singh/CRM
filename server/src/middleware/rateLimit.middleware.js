import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,

  // Combine normalized IP + email
  keyGenerator: (req) => {
    const email = (req.body?.email || "")
      .toLowerCase()
      .trim();

    const ip = ipKeyGenerator(req);

    return `${ip}::${email}`;
  },

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});