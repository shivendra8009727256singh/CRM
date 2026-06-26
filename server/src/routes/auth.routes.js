import { Router } from "express";
import {
  login,
  logout,
  refreshToken,
  getMe,
  createUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  unlockAccount,
  adminUnlockUser,
  getMySessions,
  revokeMySession,
} from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.middleware.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// Public routes
router.post("/login", loginRateLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/unlock-account", unlockAccount);

// Authenticated routes
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);
router.patch("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);
router.get("/sessions", requireAuth, getMySessions);
router.delete("/sessions/:sessionId", requireAuth, revokeMySession);

// Admin-only routes
router.post("/create-user", requireAuth, requireRole(ROLES.ADMIN), createUser);

// FIX BUG 4: Admin fallback unlock — used when SMTP is not configured
// and the email-based unlock flow is unavailable.
router.post(
  "/admin/unlock-user/:userId",
  requireAuth,
  requireRole(ROLES.ADMIN),
  adminUnlockUser
);

export default router;