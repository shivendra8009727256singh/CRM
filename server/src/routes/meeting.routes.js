import { Router } from "express";

import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting,
  getMeetingDashboard,
} from "../controllers/meeting.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getMeetingDashboard
);

router.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createMeeting
);

router.get(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getMeetings
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getMeetingById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateMeeting
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateMeetingStatus
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteMeeting
);

export default router;