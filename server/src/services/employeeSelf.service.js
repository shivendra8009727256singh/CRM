import fs from "fs/promises";
import path from "path";

import { ApiError } from "../utils/apiError.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

import {
  Attendance,
  ATTENDANCE_STATUS,
  CHECKIN_SOURCE,
} from "../models/Attendance.js";

import {
  LeaveRequest,
  LEAVE_REQUEST_STATUS,
  LEAVE_DAY_TYPE,
} from "../models/LeaveRequest.js";

import { AttendanceRegularization } from "../models/AttendanceRegularization.js";
import { LeaveBalance } from "../models/LeaveBalance.js";
import { Message } from "../models/Message.js";

import {
  Notification,
  NOTIFICATION_TYPE,
} from "../models/Notification.js";

import { User } from "../models/User.js";

import {
  findEmployeeByUserId,
  findLeaveTypeByCode,

  getTodayAttendance,
  getAttendanceHistory,

  getLeaveBalances,
  getLeaveRequests,
  findOwnLeaveRequestById,
  createLeaveRequest,
  updateOwnLeaveRequestById,

  getPayslips,
  getOwnPayslipById,

  getNotifications,
  getUnreadNotificationCount,
  markOwnNotificationRead,
  markAllOwnNotificationsRead,

  getMessages,
  findOwnMessageById,
  markOwnReceivedMessageRead,

  getMeetings,
  getEvents,
  getHolidays,
} from "../repositories/employeeSelf.repository.js";

import {
  emitNotificationToUser,
  emitMessageToUser,
} from "../socket/socket.js";

/* =========================================================
   COMMON HELPERS
========================================================= */

const getCompanyId = (currentUser) => {
  if (!currentUser?.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureEmployeeRole = (currentUser) => {
  if (currentUser?.role !== ROLES.EMPLOYEE) {
    throw new ApiError(
      403,
      "Employee Self-Service is available only to employee accounts."
    );
  }
};

const normalizeDate = (date = new Date()) => {
  const normalizedDate = new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }

  normalizedDate.setHours(0, 0, 0, 0);

  return normalizedDate;
};

const endOfDay = (date = new Date()) => {
  const normalizedDate = new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }

  normalizedDate.setHours(23, 59, 59, 999);

  return normalizedDate;
};

const getPagination = (query = {}) => {
  const requestedPage = Number(query.page);
  const requestedLimit = Number(query.limit);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

  return {
    page,
    limit,
  };
};

const getEmployeeBranchId = (employee) => {
  if (!employee?.branchId) {
    return null;
  }

  return employee.branchId._id || employee.branchId;
};

const sanitizeAttendanceSource = (source) => {
  const allowedSources = [
    CHECKIN_SOURCE.WEB,
    CHECKIN_SOURCE.MOBILE,
  ].filter(Boolean);

  if (allowedSources.includes(source)) {
    return source;
  }

  return CHECKIN_SOURCE.WEB || "web";
};

const calculateLeaveDays = (fromDate, toDate, dayType) => {
  const from = normalizeDate(fromDate);
  const to = normalizeDate(toDate);

  if (to < from) {
    throw new ApiError(
      400,
      "Leave end date cannot be before the start date."
    );
  }

  if (dayType !== LEAVE_DAY_TYPE.FULL_DAY) {
    if (from.getTime() !== to.getTime()) {
      throw new ApiError(
        400,
        "Half-day leave can be applied only for one date."
      );
    }

    return 0.5;
  }

  return (
    Math.floor(
      (to.getTime() - from.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
};

const getMyEmployee = async (currentUser) => {
  ensureEmployeeRole(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await findEmployeeByUserId({
    companyId,
    userId: currentUser._id,
  });

  if (!employee) {
    throw new ApiError(
      404,
      "Employee profile is not linked with this user account."
    );
  }

  if (employee.isActive === false) {
    throw new ApiError(
      403,
      "Your employee profile is inactive."
    );
  }

  return employee;
};

const updateEmployeeProfileFields = (employee, payload) => {
  if (payload.personalEmail !== undefined) {
    employee.personalEmail = payload.personalEmail || "";
  }

  if (payload.mobile !== undefined) {
    employee.mobile = payload.mobile || "";
  }

  if (payload.alternateMobile !== undefined) {
    employee.alternateMobile = payload.alternateMobile || "";
  }

  if (payload.profilePhoto !== undefined) {
    employee.employeePhoto = payload.profilePhoto || "";
  }

  if (payload.currentAddress !== undefined) {
    const currentAddress =
      employee.currentAddress?.toObject?.() ||
      employee.currentAddress ||
      {};

    employee.currentAddress = {
      ...currentAddress,
      addressLine1: payload.currentAddress || "",
    };
  }

  if (payload.permanentAddress !== undefined) {
    const permanentAddress =
      employee.permanentAddress?.toObject?.() ||
      employee.permanentAddress ||
      {};

    employee.permanentAddress = {
      ...permanentAddress,
      addressLine1: payload.permanentAddress || "",
    };
  }

  if (
    payload.emergencyContactName !== undefined ||
    payload.emergencyContactRelation !== undefined ||
    payload.emergencyContactNumber !== undefined
  ) {
    const emergencyContact =
      employee.emergencyContact?.toObject?.() ||
      employee.emergencyContact ||
      {};

    employee.emergencyContact = {
      ...emergencyContact,

      name:
        payload.emergencyContactName !== undefined
          ? payload.emergencyContactName || ""
          : emergencyContact.name || "",

      relation:
        payload.emergencyContactRelation !== undefined
          ? payload.emergencyContactRelation || ""
          : emergencyContact.relation || "",

      mobile:
        payload.emergencyContactNumber !== undefined
          ? payload.emergencyContactNumber || ""
          : emergencyContact.mobile || "",
    };
  }
};

const resolvePayslipFilePath = async (pdfUrl) => {
  const cleanPath = String(pdfUrl)
    .split("?")[0]
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "");

  const relativePath = cleanPath.startsWith("api/")
    ? cleanPath.replace(/^api\//, "")
    : cleanPath;

  const possiblePaths = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "uploads", relativePath.replace(/^uploads\//, "")),
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Check next possible location.
    }
  }

  throw new ApiError(404, "Payslip PDF file not found.");
};

/* =========================================================
   DASHBOARD
========================================================= */

export const getMyDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const today = normalizeDate();
  const branchId = getEmployeeBranchId(employee);

  const [
    todayAttendance,
    leaveBalances,
    pendingLeaveRequests,
    payslipResult,
    unreadNotifications,
    meetingResult,
    eventResult,
    holidayResult,
  ] = await Promise.all([
    getTodayAttendance({
      companyId,
      employeeId: employee._id,
      attendanceDate: today,
    }),

    getLeaveBalances({
      companyId,
      employeeId: employee._id,
      year: today.getFullYear(),
    }),

    LeaveRequest.countDocuments({
      companyId,
      employeeId: employee._id,
      status: LEAVE_REQUEST_STATUS.PENDING,
    }),

    getPayslips({
      companyId,
      employeeId: employee._id,
      page: 1,
      limit: 1,
    }),

    getUnreadNotificationCount({
      companyId,
      userId: currentUser._id,
    }),

    getMeetings({
      companyId,
      employeeId: employee._id,
      filter: {
        startDateTime: {
          $gte: new Date(),
        },
        status: {
          $in: ["scheduled", "rescheduled"],
        },
      },
      page: 1,
      limit: 5,
    }),

    getEvents({
      companyId,
      filter: {
        startDateTime: {
          $gte: new Date(),
        },
      },
      page: 1,
      limit: 5,
    }),

    getHolidays({
      companyId,
      branchId,
      filter: {
        date: {
          $gte: today,
        },
      },
      page: 1,
      limit: 5,
    }),
  ]);

  return {
    employee: {
      employeeCode: employee.employeeCode,
      displayName: employee.displayName,
      employeePhoto: employee.employeePhoto || "",

      branch: employee.branchId
        ? {
            branchName: employee.branchId.branchName,
            branchCode: employee.branchId.branchCode,
          }
        : null,

      department: employee.departmentId
        ? {
            departmentName:
              employee.departmentId.departmentName,
            departmentCode:
              employee.departmentId.departmentCode,
          }
        : null,

      designation: employee.designationId
        ? {
            designationName:
              employee.designationId.designationName,
            designationCode:
              employee.designationId.designationCode,
          }
        : null,
    },

    attendanceToday: todayAttendance,

    leaveBalances,

    pendingLeaveRequests,

    latestPayslip:
      payslipResult.payslips?.[0] || null,

    unreadNotifications,

    upcomingMeetings:
      meetingResult.meetings || [],

    upcomingEvents:
      eventResult.events || [],

    upcomingHolidays:
      holidayResult.holidays || [],
  };
};

/* =========================================================
   PROFILE
========================================================= */

export const getMyProfileService = async (currentUser) => {
  return getMyEmployee(currentUser);
};

export const updateMyProfileService = async (
  currentUser,
  payload
) => {
  const employee = await getMyEmployee(currentUser);

  updateEmployeeProfileFields(employee, payload);

  employee.updatedBy = currentUser._id;

  await employee.save();

  return employee;
};

/* =========================================================
   ATTENDANCE
========================================================= */

export const getMyAttendanceService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    filter.attendanceDate = {};

    if (query.from) {
      filter.attendanceDate.$gte =
        normalizeDate(query.from);
    }

    if (query.to) {
      filter.attendanceDate.$lte =
        endOfDay(query.to);
    }
  }

  return getAttendanceHistory({
    companyId,
    employeeId: employee._id,
    filter,
    page,
    limit,
  });
};

export const myCheckInService = async (
  currentUser,
  payload = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const attendanceDate = normalizeDate(
    payload.attendanceDate || new Date()
  );

  const existingAttendance = await getTodayAttendance({
    companyId,
    employeeId: employee._id,
    attendanceDate,
  });

  if (existingAttendance?.checkInTime) {
    throw new ApiError(
      409,
      "You have already checked in for this date."
    );
  }

  const checkInTime = payload.checkInTime
    ? new Date(payload.checkInTime)
    : new Date();

  if (Number.isNaN(checkInTime.getTime())) {
    throw new ApiError(400, "Invalid check-in time.");
  }

  const checkInSource = sanitizeAttendanceSource(
    payload.checkInSource
  );

  if (existingAttendance) {
    existingAttendance.checkInTime = checkInTime;
    existingAttendance.checkInSource = checkInSource;
    existingAttendance.checkInLocation =
      payload.checkInLocation || {};
    existingAttendance.checkInSelfie =
      payload.checkInSelfie || "";
    existingAttendance.status =
      ATTENDANCE_STATUS.PRESENT;
    existingAttendance.updatedBy = currentUser._id;

    await existingAttendance.save();

    return existingAttendance;
  }

  return Attendance.create({
    companyId,
    employeeId: employee._id,
    attendanceDate,

    shiftId:
      employee.shiftId?._id ||
      employee.shiftId ||
      null,

    attendancePolicyId:
      employee.attendancePolicyId?._id ||
      employee.attendancePolicyId ||
      null,

    checkInTime,
    checkInSource,
    checkInLocation: payload.checkInLocation || {},
    checkInSelfie: payload.checkInSelfie || "",

    status: ATTENDANCE_STATUS.PRESENT,
    createdBy: currentUser._id,
  });
};

export const myCheckOutService = async (
  currentUser,
  payload = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const attendanceDate = normalizeDate(
    payload.attendanceDate || new Date()
  );

  const attendance = await getTodayAttendance({
    companyId,
    employeeId: employee._id,
    attendanceDate,
  });

  if (!attendance?.checkInTime) {
    throw new ApiError(
      404,
      "Check-in record not found for this date."
    );
  }

  if (attendance.checkOutTime) {
    throw new ApiError(
      409,
      "You have already checked out for this date."
    );
  }

  const checkOutTime = payload.checkOutTime
    ? new Date(payload.checkOutTime)
    : new Date();

  if (Number.isNaN(checkOutTime.getTime())) {
    throw new ApiError(400, "Invalid check-out time.");
  }

  if (
    checkOutTime.getTime() <=
    new Date(attendance.checkInTime).getTime()
  ) {
    throw new ApiError(
      400,
      "Check-out time must be after check-in time."
    );
  }

  attendance.checkOutTime = checkOutTime;
  attendance.checkOutSource = sanitizeAttendanceSource(
    payload.checkOutSource
  );
  attendance.checkOutLocation =
    payload.checkOutLocation || {};
  attendance.checkOutSelfie =
    payload.checkOutSelfie || "";

  attendance.totalWorkMinutes = Math.max(
    0,
    Math.floor(
      (checkOutTime.getTime() -
        new Date(attendance.checkInTime).getTime()) /
        60000
    )
  );

  attendance.updatedBy = currentUser._id;

  await attendance.save();

  return attendance;
};

export const myRegularizationService = async (
  currentUser,
  payload
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const attendanceDate = normalizeDate(
    payload.attendanceDate
  );

  const attendance = await getTodayAttendance({
    companyId,
    employeeId: employee._id,
    attendanceDate,
  });

  if (!attendance) {
    throw new ApiError(
      404,
      "Attendance record not found for this date."
    );
  }

  const existingRequest =
    await AttendanceRegularization.findOne({
      companyId,
      employeeId: employee._id,
      attendanceId: attendance._id,
      status: "pending",
    });

  if (existingRequest) {
    throw new ApiError(
      409,
      "A pending regularization request already exists for this attendance record."
    );
  }

  return AttendanceRegularization.create({
    companyId,
    employeeId: employee._id,
    attendanceId: attendance._id,
    attendanceDate,

    requestedCheckIn:
      payload.requestedCheckIn || null,

    requestedCheckOut:
      payload.requestedCheckOut || null,

    reason: payload.reason,
    attachment: payload.attachment || "",
    employeeRemarks:
      payload.employeeRemarks || "",

    status: "pending",
    createdBy: currentUser._id,
  });
};

/* =========================================================
   LEAVE
========================================================= */

export const getMyLeaveBalancesService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const requestedYear = Number(query.year);

  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2000 &&
    requestedYear <= 2100
      ? requestedYear
      : new Date().getFullYear();

  return getLeaveBalances({
    companyId,
    employeeId: employee._id,
    year,
  });
};

export const getMyLeaveRequestsService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    filter.fromDate = {};

    if (query.from) {
      filter.fromDate.$gte = normalizeDate(query.from);
    }

    if (query.to) {
      filter.fromDate.$lte = endOfDay(query.to);
    }
  }

  return getLeaveRequests({
    companyId,
    employeeId: employee._id,
    filter,
    page,
    limit,
  });
};

export const applyMyLeaveService = async (
  currentUser,
  payload
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const leaveType = await findLeaveTypeByCode({
    companyId,
    leaveTypeCode: payload.leaveTypeCode,
  });

  if (!leaveType) {
    throw new ApiError(404, "Leave type not found.");
  }

  const fromDate = normalizeDate(payload.fromDate);
  const toDate = normalizeDate(payload.toDate);

  const totalDays = calculateLeaveDays(
    fromDate,
    toDate,
    payload.dayType
  );

  const overlappingLeave =
    await LeaveRequest.findOne({
      companyId,
      employeeId: employee._id,

      status: {
        $in: [
          LEAVE_REQUEST_STATUS.PENDING,
          LEAVE_REQUEST_STATUS.APPROVED,
        ],
      },

      fromDate: {
        $lte: toDate,
      },

      toDate: {
        $gte: fromDate,
      },
    });

  if (overlappingLeave) {
    throw new ApiError(
      409,
      "A pending or approved leave request already exists for the selected dates."
    );
  }

  const year = fromDate.getFullYear();

  const balance = await LeaveBalance.findOne({
    companyId,
    employeeId: employee._id,
    leaveTypeId: leaveType._id,
    year,
  });

  if (!balance) {
    throw new ApiError(
      400,
      "Leave balance is not configured for this leave type."
    );
  }

  const availableBalance = Number(
    balance.availableBalance || 0
  );

  if (
    leaveType.isPaid &&
    availableBalance < totalDays
  ) {
    throw new ApiError(
      400,
      "Insufficient leave balance."
    );
  }

  const leaveRequest = await createLeaveRequest({
    companyId,
    employeeId: employee._id,
    leaveTypeId: leaveType._id,

    leavePolicyId:
      employee.leavePolicyId?._id ||
      employee.leavePolicyId ||
      null,

    fromDate,
    toDate,
    dayType: payload.dayType,
    totalDays,
    reason: payload.reason,
    attachment: payload.attachment || "",

    status: LEAVE_REQUEST_STATUS.PENDING,
    createdBy: currentUser._id,
  });

  balance.pending =
    Number(balance.pending || 0) + totalDays;

  if (leaveType.isPaid) {
    balance.availableBalance = Math.max(
      0,
      availableBalance - totalDays
    );
  }

  balance.updatedBy = currentUser._id;

  await balance.save();

  return leaveRequest;
};

export const cancelMyLeaveRequestService = async (
  currentUser,
  leaveRequestId,
  payload = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const leaveRequest = await findOwnLeaveRequestById({
    id: leaveRequestId,
    companyId,
    employeeId: employee._id,
  });

  if (!leaveRequest) {
    throw new ApiError(404, "Leave request not found.");
  }

  if (
    leaveRequest.status !==
    LEAVE_REQUEST_STATUS.PENDING
  ) {
    throw new ApiError(
      400,
      "Only pending leave requests can be cancelled."
    );
  }

  const year = new Date(
    leaveRequest.fromDate
  ).getFullYear();

  const balance = await LeaveBalance.findOne({
    companyId,
    employeeId: employee._id,
    leaveTypeId: leaveRequest.leaveTypeId,
    year,
  }).populate("leaveTypeId", "isPaid");

  if (balance) {
    const totalDays = Number(
      leaveRequest.totalDays || 0
    );

    balance.pending = Math.max(
      0,
      Number(balance.pending || 0) - totalDays
    );

    if (balance.leaveTypeId?.isPaid) {
      balance.availableBalance =
        Number(balance.availableBalance || 0) +
        totalDays;
    }

    balance.updatedBy = currentUser._id;

    await balance.save();
  }

  const updatedLeaveRequest =
    await updateOwnLeaveRequestById({
      id: leaveRequest._id,
      companyId,
      employeeId: employee._id,

      payload: {
        status: LEAVE_REQUEST_STATUS.CANCELLED,
        cancelledBy: currentUser._id,
        cancelledAt: new Date(),

        cancellationReason:
          payload.cancellationReason || "",

        updatedBy: currentUser._id,
      },
    });

  if (!updatedLeaveRequest) {
    throw new ApiError(
      404,
      "Leave request not found."
    );
  }

  return updatedLeaveRequest;
};

/* =========================================================
   PAYSLIPS
========================================================= */

export const getMyPayslipsService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.month) {
    filter.month = Number(query.month);
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return getPayslips({
    companyId,
    employeeId: employee._id,
    filter,
    page,
    limit,
  });
};

export const getMyPayslipByIdService = async (
  currentUser,
  payslipId
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);

  const payslip = await getOwnPayslipById({
    id: payslipId,
    companyId,
    employeeId: employee._id,
  });

  if (!payslip) {
    throw new ApiError(404, "Payslip not found.");
  }

  return payslip;
};

export const downloadMyPayslipPdfService = async (
  currentUser,
  payslipId
) => {
  const payslip = await getMyPayslipByIdService(
    currentUser,
    payslipId
  );

  if (!payslip.pdfUrl) {
    throw new ApiError(
      404,
      "Payslip PDF has not been generated yet."
    );
  }

  return resolvePayslipFilePath(payslip.pdfUrl);
};

/* =========================================================
   NOTIFICATIONS
========================================================= */

export const getMyNotificationsService = async (
  currentUser,
  query = {}
) => {
  ensureEmployeeRole(currentUser);

  const companyId = getCompanyId(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.isRead !== undefined) {
    filter.isRead =
      String(query.isRead).toLowerCase() === "true";
  }

  if (query.type) {
    filter.type = query.type;
  }

  return getNotifications({
    companyId,
    userId: currentUser._id,
    filter,
    page,
    limit,
  });
};

export const getMyUnreadNotificationCountService = async (
  currentUser
) => {
  ensureEmployeeRole(currentUser);

  const unreadCount =
    await getUnreadNotificationCount({
      companyId: getCompanyId(currentUser),
      userId: currentUser._id,
    });

  return {
    unreadCount,
  };
};

export const markMyNotificationReadService = async (
  currentUser,
  notificationId
) => {
  ensureEmployeeRole(currentUser);

  const notification = await markOwnNotificationRead({
    id: notificationId,
    companyId: getCompanyId(currentUser),
    userId: currentUser._id,
  });

  if (!notification) {
    throw new ApiError(
      404,
      "Notification not found."
    );
  }

  return notification;
};

export const markAllMyNotificationsReadService = async (
  currentUser
) => {
  ensureEmployeeRole(currentUser);

  const result =
    await markAllOwnNotificationsRead({
      companyId: getCompanyId(currentUser),
      userId: currentUser._id,
    });

  return {
    matchedCount: result.matchedCount ?? 0,
    modifiedCount: result.modifiedCount ?? 0,
  };
};

/* =========================================================
   MESSAGES
========================================================= */

export const getMyMessagesService = async (
  currentUser,
  query = {}
) => {
  ensureEmployeeRole(currentUser);

  const companyId = getCompanyId(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  return getMessages({
    companyId,
    userId: currentUser._id,
    filter,
    page,
    limit,
  });
};

export const getMyMessageByIdService = async (
  currentUser,
  messageId
) => {
  ensureEmployeeRole(currentUser);

  const message = await findOwnMessageById({
    id: messageId,
    companyId: getCompanyId(currentUser),
    userId: currentUser._id,
  });

  if (!message) {
    throw new ApiError(404, "Message not found.");
  }

  return message;
};

export const markMyMessageReadService = async (
  currentUser,
  messageId
) => {
  ensureEmployeeRole(currentUser);

  const message =
    await markOwnReceivedMessageRead({
      id: messageId,
      companyId: getCompanyId(currentUser),
      userId: currentUser._id,
    });

  if (!message) {
    throw new ApiError(
      404,
      "Received message not found."
    );
  }

  return message;
};

export const sendMyMessageToHRService = async (
  currentUser,
  payload
) => {
  ensureEmployeeRole(currentUser);

  const companyId = getCompanyId(currentUser);

  let recipient = await User.findOne({
    companyId,
    role: ROLES.HR,
    status: USER_STATUS.ACTIVE,
  }).sort({ createdAt: 1 });

  if (!recipient) {
    recipient = await User.findOne({
      companyId,
      role: ROLES.COMPANY_ADMIN,
      status: USER_STATUS.ACTIVE,
    }).sort({ createdAt: 1 });
  }

  if (!recipient) {
    throw new ApiError(
      404,
      "No active HR or Company Admin account was found."
    );
  }

  const message = await Message.create({
    companyId,
    senderUserId: currentUser._id,
    recipientUserId: recipient._id,
    subject: payload.subject || "",
    body: payload.body,
    attachmentUrl: payload.attachmentUrl || "",
    createdBy: currentUser._id,
  });

  const notification = await Notification.create({
    companyId,
    recipientUserId: recipient._id,
    senderUserId: currentUser._id,

    type: NOTIFICATION_TYPE.MESSAGE,
    title:
      payload.subject || "New Employee Message",
    message: payload.body,

    entityType: "Message",
    entityId: message._id,

    actionUrl:
      `/hr/communication/messages/${message._id}`,

    createdBy: currentUser._id,
  });

  emitMessageToUser(
    recipient._id.toString(),
    message
  );

  emitNotificationToUser(
    recipient._id.toString(),
    notification
  );

  return {
    message,
    notification,
    sentTo: {
      name: recipient.name,
      email: recipient.email,
      role: recipient.role,
    },
  };
};

/* =========================================================
   MEETINGS
========================================================= */

export const getMyMeetingsService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.upcoming === "true") {
    filter.startDateTime = {
      $gte: new Date(),
    };
  }

  return getMeetings({
    companyId,
    employeeId: employee._id,
    filter,
    page,
    limit,
  });
};

/* =========================================================
   EVENTS
========================================================= */

export const getMyEventsService = async (
  currentUser,
  query = {}
) => {
  ensureEmployeeRole(currentUser);

  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.upcoming === "true") {
    filter.startDateTime = {
      $gte: new Date(),
    };
  }

  return getEvents({
    companyId: getCompanyId(currentUser),
    filter,
    page,
    limit,
  });
};

/* =========================================================
   HOLIDAYS
========================================================= */

export const getMyHolidaysService = async (
  currentUser,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);
  const employee = await getMyEmployee(currentUser);
  const { page, limit } = getPagination(query);

  const filter = {};

  if (query.year) {
    const year = Number(query.year);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      throw new ApiError(
        400,
        "Invalid holiday year."
      );
    }

    filter.date = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  if (query.upcoming === "true") {
    filter.date = {
      ...(filter.date || {}),
      $gte: normalizeDate(),
    };
  }

  return getHolidays({
    companyId,
    branchId: getEmployeeBranchId(employee),
    filter,
    page,
    limit,
  });
};