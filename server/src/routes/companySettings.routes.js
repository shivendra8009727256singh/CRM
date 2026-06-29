import { Router } from "express";

import {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,

  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,

  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation,

  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} from "../controllers/companySettings.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ---------------- Branch ---------------- */

router.post(
  "/branches",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createBranch
);

router.get(
  "/branches",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getBranches
);

router.patch(
  "/branches/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateBranch
);

router.delete(
  "/branches/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteBranch
);

/* ---------------- Department ---------------- */

router.post(
  "/departments",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createDepartment
);

router.get(
  "/departments",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getDepartments
);

router.patch(
  "/departments/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateDepartment
);

router.delete(
  "/departments/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteDepartment
);

/* ---------------- Designation ---------------- */

router.post(
  "/designations",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createDesignation
);

router.get(
  "/designations",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getDesignations
);

router.patch(
  "/designations/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateDesignation
);

router.delete(
  "/designations/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteDesignation
);

/* ---------------- Holiday ---------------- */

router.post(
  "/holidays",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createHoliday
);

router.get(
  "/holidays",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getHolidays
);

router.patch(
  "/holidays/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateHoliday
);

router.delete(
  "/holidays/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteHoliday
);

export default router;