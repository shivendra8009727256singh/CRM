import { Router } from "express";
import {
  login,
  logout,
  refreshToken,
  getMe,
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

router.post("/login", loginRateLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/unlock-account", unlockAccount);

router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);
router.patch("/profile", requireAuth, updateProfile);
router.get("/sessions", requireAuth, getMySessions);
router.delete("/sessions/:sessionId", requireAuth, revokeMySession);

router.post("/change-password", requireAuthOrForceChange, changePassword);

router.post(
  "/admin/unlock-user/:userId",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN),
  adminUnlockUser
);

export default router;