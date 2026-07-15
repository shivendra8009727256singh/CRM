import { Router } from "express";

import {
  getCompanyAdminDashboard,
} from "../controllers/companyAdminDashboard.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";
import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();

const requireCompanyAdminRole = (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required."));
  }

  if (req.user.role !== ROLES.COMPANY_ADMIN) {
    return next(
      new ApiError(
        403,
        "Company Admin Dashboard is available only to Company Admin accounts."
      )
    );
  }

  return next();
};

router.use(requireAuth);
router.use(requireTenant);
router.use(requireCompanyAdminRole);

router.get("/", getCompanyAdminDashboard);

export default router;