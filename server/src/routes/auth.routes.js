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
  getMySessions,
  revokeMySession,
} from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
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
router.post("/change-password", requireAuth, changePassword);

router.get("/sessions", requireAuth, getMySessions);
router.delete("/sessions/:sessionId", requireAuth, revokeMySession);

router.post("/create-user", requireAuth, requireRole(ROLES.ADMIN), createUser);

export default router;