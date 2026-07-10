import { Router } from "express";

import {
  getMyDashboard,
  getMyProfile,
  updateMyProfile,
  getMyAttendance,
  myCheckIn,
  myCheckOut,
  myRegularization,
  getMyLeaveBalances,
  getMyLeaveRequests,
  applyMyLeave,
  cancelMyLeaveRequest,
  getMyPayslips,
  getMyPayslipById,
  downloadMyPayslipPdf,
  getMyNotifications,
  getMyUnreadNotificationCount,
  markMyNotificationRead,
  markAllMyNotificationsRead,
  getMyMessages,
  getMyMessageById,
  sendMyMessageToHR,
  markMyMessageRead,
  getMyMeetings,
  getMyEvents,
  getMyHolidays,
} from "../controllers/employeeSelf.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";
import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();

const requireEmployeeRole = (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required."));
  }

  if (req.user.role !== ROLES.EMPLOYEE) {
    return next(
      new ApiError(
        403,
        "Employee Self-Service is available only to employee accounts."
      )
    );
  }

  return next();
};
router.use(requireAuth);
router.use(requireTenant);
router.use(requireEmployeeRole);
router.get("/me/dashboard", getMyDashboard);
router.get("/me/profile", getMyProfile);
router.patch("/me/profile", updateMyProfile);
router.get("/me/attendance", getMyAttendance);

router.post("/me/attendance/check-in",myCheckIn);
router.post("/me/attendance/check-out",myCheckOut);
router.post("/me/attendance/regularizations",myRegularization);
router.get("/me/leave/balances",getMyLeaveBalances);
router.get("/me/leave/requests",getMyLeaveRequests);
router.post("/me/leave/requests",applyMyLeave);

router.patch("/me/leave/requests/:id/cancel",cancelMyLeaveRequest);
router.get("/me/payslips",getMyPayslips);
router.get("/me/payslips/:id/pdf",downloadMyPayslipPdf);
router.get("/me/payslips/:id",getMyPayslipById);
router.get("/me/notifications",getMyNotifications);
router.get("/me/notifications/unread-count",getMyUnreadNotificationCount);
router.patch("/me/notifications/read-all",markAllMyNotificationsRead);
router.patch("/me/notifications/:id/read",markMyNotificationRead);
router.get("/me/messages",getMyMessages);
router.post("/me/messages/hr",sendMyMessageToHR);
router.get("/me/messages/:id",getMyMessageById);
router.patch("/me/messages/:id/read",markMyMessageRead);
router.get("/me/meetings",getMyMeetings);
router.get("/me/events",getMyEvents);
router.get("/me/holidays",getMyHolidays);

export default router;