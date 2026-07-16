import { Router } from "express";

import {
  getSuperAdminDashboard,
} from "../controllers/superAdminDashboard.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();

const requireSuperAdminRole = (req, _res, next) => {
  if (!req.user) {
    return next(
      new ApiError(401, "Authentication required.")
    );
  }

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(
      new ApiError(
        403,
        "Super Admin Dashboard is available only to Super Admin accounts."
      )
    );
  }

  return next();
};

router.use(requireAuth);
router.use(requireSuperAdminRole);

router.get("/", getSuperAdminDashboard);

export default router;