import { Router } from "express";

import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getEventDashboard,
} from "../controllers/event.controller.js";

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
  getEventDashboard
);

/* ================= EVENTS ================= */

router.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createEvent
);

router.get(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEvents
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEventById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEvent
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEventStatus
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteEvent
);

export default router;