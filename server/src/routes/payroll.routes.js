import { Router } from "express";

import {
  getPayrollDashboard,

  createSalaryComponent,
  getSalaryComponents,
  updateSalaryComponent,
  deleteSalaryComponent,

  createSalaryStructure,
  getSalaryStructures,
  updateSalaryStructure,
  deleteSalaryStructure,

  assignEmployeeSalary,
  getEmployeeSalaries,
  updateEmployeeSalary,

  createPayrollRun,
  getPayrollRuns,
  processPayrollRun,
  updatePayrollStatus,

  getPayslips,
  getPayslipById,
  updatePayslipStatus,
  generatePayslipPdf,
} from "../controllers/payroll.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayrollDashboard
);

/* ================= SALARY COMPONENT ================= */

router.post(
  "/components",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createSalaryComponent
);

router.get(
  "/components",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getSalaryComponents
);

router.patch(
  "/components/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateSalaryComponent
);

router.delete(
  "/components/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteSalaryComponent
);

/* ================= SALARY STRUCTURE ================= */

router.post(
  "/structures",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createSalaryStructure
);

router.get(
  "/structures",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getSalaryStructures
);

router.patch(
  "/structures/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateSalaryStructure
);

router.delete(
  "/structures/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteSalaryStructure
);

/* ================= EMPLOYEE SALARY ================= */

router.post(
  "/employee-salaries",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  assignEmployeeSalary
);

router.get(
  "/employee-salaries",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeSalaries
);

router.patch(
  "/employee-salaries/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEmployeeSalary
);

/* ================= PAYROLL RUN ================= */

router.post(
  "/runs",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createPayrollRun
);

router.get(
  "/runs",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayrollRuns
);

router.post(
  "/runs/:id/process",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  processPayrollRun
);

router.patch(
  "/runs/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updatePayrollStatus
);

/* ================= PAYSLIP ================= */

router.get(
  "/payslips",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayslips
);

router.get(
  "/payslips/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayslipById
);

router.patch(
  "/payslips/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updatePayslipStatus
);

router.post(
    "/payslips/:id/generate-pdf",
    requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
    generatePayslipPdf
  );


export default router;