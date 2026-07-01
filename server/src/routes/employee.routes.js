import { Router } from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,

  upsertEmployeeFamily,
  getEmployeeFamily,

  upsertEmployeeBank,
  getEmployeeBank,

  upsertEmployeeStatutory,
  getEmployeeStatutory,

  upsertEmployeeDocuments,
  getEmployeeDocuments,

  getEmployeeDashboard,
} from "../controllers/employee.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ---------------- Dashboard ---------------- */

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeDashboard
);

/* ---------------- Employee Core ---------------- */

router.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createEmployee
);

router.get(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployees
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEmployee
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEmployeeStatus
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteEmployee
);

/* ---------------- Family ---------------- */

router.get(
  "/:id/family",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeFamily
);

router.put(
  "/:id/family",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeFamily
);

/* ---------------- Bank ---------------- */

router.get(
  "/:id/bank",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeBank
);

router.put(
  "/:id/bank",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeBank
);

/* ---------------- Statutory ---------------- */

router.get(
  "/:id/statutory",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeStatutory
);

router.put(
  "/:id/statutory",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeStatutory
);

/* ---------------- Documents ---------------- */

router.get(
  "/:id/documents",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeDocuments
);

router.put(
  "/:id/documents",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeDocuments
);

export default router;