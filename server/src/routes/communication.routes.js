import { Router } from "express";

import {
  sendMessage,
  getMessages,
  getMessageById,
  markMessageRead,

  sendNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/communication.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= MESSAGES ================= */

router.post("/messages", sendMessage);

router.get("/messages", getMessages);

router.get("/messages/:id", getMessageById);

router.patch("/messages/:id/read", markMessageRead);

/* ================= NOTIFICATIONS ================= */

router.post("/notifications", sendNotification);

router.get("/notifications", getNotifications);

router.get("/notifications/unread-count", getUnreadNotificationCount);

router.patch("/notifications/:id/read", markNotificationRead);

router.patch("/notifications/read-all", markAllNotificationsRead);

export default router;