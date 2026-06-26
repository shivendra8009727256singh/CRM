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
import {
  requireAuth,
  requireAuthOrForceChange,
  requireRole,
} from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.middleware.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/login", loginRateLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/unlock-account", unlockAccount);

// ─── Authenticated ────────────────────────────────────────────────────────────
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);
router.patch("/profile", requireAuth, updateProfile);
router.get("/sessions", requireAuth, getMySessions);
router.delete("/sessions/:sessionId", requireAuth, revokeMySession);

// change-password accepts both normal tokens AND the restricted
// forceChange token issued when a user must change their password on first login.
router.post("/change-password", requireAuthOrForceChange, changePassword);

// ─── Admin-only ───────────────────────────────────────────────────────────────
router.post("/create-user", requireAuth, requireRole(ROLES.ADMIN), createUser);

// Admin fallback unlock — used when SMTP is not configured
router.post(
  "/admin/unlock-user/:userId",
  requireAuth,
  requireRole(ROLES.ADMIN),
  adminUnlockUser
);

export default router;