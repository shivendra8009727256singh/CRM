import { Employee } from "../models/Employee.js";
import { Attendance } from "../models/Attendance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { LeaveBalance } from "../models/LeaveBalance.js";
import { LeaveType } from "../models/LeaveType.js";
import { Payslip } from "../models/Payslip.js";
import { Notification } from "../models/Notification.js";
import { Message } from "../models/Message.js";
import { HRMeeting } from "../models/HRMeeting.js";
import { HREvent } from "../models/HREvent.js";
import { Holiday } from "../models/Holiday.js";

/* ================= COMMON ================= */

const buildPagination = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});

/* ================= EMPLOYEE ================= */

export const findEmployeeByUserId = async ({
  companyId,
  userId,
}) => {
  return Employee.findOne({
    companyId,
    userId,
  })
    .populate("branchId", "branchName branchCode")
    .populate("departmentId", "departmentName departmentCode")
    .populate("designationId", "designationName designationCode")
    .populate("reportingManagerId", "displayName employeeCode")
    .populate("shiftId", "shiftName shiftCode startTime endTime")
    .populate(
      "attendancePolicyId",
      "policyName policyCode lateMarkAfterMinutes allowRegularization"
    )
    .populate("leavePolicyId", "policyName policyCode")
    .populate(
      "salaryStructureId",
      "structureName structureCode"
    );
};

/* ================= LEAVE TYPE ================= */

export const findLeaveTypeByCode = async ({
  companyId,
  leaveTypeCode,
}) => {
  return LeaveType.findOne({
    companyId,
    leaveCode: leaveTypeCode.toUpperCase(),
    isActive: true,
  });
};

/* ================= ATTENDANCE ================= */

export const getTodayAttendance = async ({
  companyId,
  employeeId,
  attendanceDate,
}) => {
  return Attendance.findOne({
    companyId,
    employeeId,
    attendanceDate,
  });
};

export const getAttendanceHistory = async ({
  companyId,
  employeeId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    employeeId,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    Attendance.find(query)
      .populate("shiftId", "shiftName shiftCode startTime endTime")
      .sort({ attendanceDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Attendance.countDocuments(query),
  ]);

  return {
    records: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

/* ================= LEAVE BALANCE ================= */

export const getLeaveBalances = async ({
  companyId,
  employeeId,
  year,
}) => {
  const filter = {
    companyId,
    employeeId,
  };

  if (year) {
    filter.year = year;
  }

  return LeaveBalance.find(filter)
    .populate(
      "leaveTypeId",
      "leaveName leaveCode category colorCode isPaid"
    )
    .sort({ year: -1 })
    .lean();
};

/* ================= LEAVE REQUEST ================= */

export const getLeaveRequests = async ({
  companyId,
  employeeId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    employeeId,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    LeaveRequest.find(query)
      .populate(
        "leaveTypeId",
        "leaveName leaveCode category colorCode isPaid"
      )
      .populate("leavePolicyId", "policyName policyCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    LeaveRequest.countDocuments(query),
  ]);

  return {
    requests: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

export const findOwnLeaveRequestById = async ({
  id,
  companyId,
  employeeId,
}) => {
  return LeaveRequest.findOne({
    _id: id,
    companyId,
    employeeId,
  });
};

export const createLeaveRequest = async (payload) => {
  return LeaveRequest.create(payload);
};

export const updateOwnLeaveRequestById = async ({
  id,
  companyId,
  employeeId,
  payload,
}) => {
  return LeaveRequest.findOneAndUpdate(
    {
      _id: id,
      companyId,
      employeeId,
    },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );
};

/* ================= PAYSLIPS ================= */

export const getPayslips = async ({
  companyId,
  employeeId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    employeeId,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    Payslip.find(query)
      .populate(
        "payrollRunId",
        "payrollCode month year status"
      )
      .sort({
        year: -1,
        month: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Payslip.countDocuments(query),
  ]);

  return {
    payslips: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

export const getOwnPayslipById = async ({
  id,
  companyId,
  employeeId,
}) => {
  return Payslip.findOne({
    _id: id,
    companyId,
    employeeId,
  }).populate(
    "payrollRunId",
    "payrollCode month year status"
  );
};

/* ================= NOTIFICATIONS ================= */

export const getNotifications = async ({
  companyId,
  userId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    recipientUserId: userId,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    Notification.find(query)
      .populate("senderUserId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(query),
  ]);

  return {
    notifications: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

export const getUnreadNotificationCount = async ({
  companyId,
  userId,
}) => {
  return Notification.countDocuments({
    companyId,
    recipientUserId: userId,
    isRead: false,
  });
};

export const markOwnNotificationRead = async ({
  id,
  companyId,
  userId,
}) => {
  return Notification.findOneAndUpdate(
    {
      _id: id,
      companyId,
      recipientUserId: userId,
    },
    {
      isRead: true,
      readAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const markAllOwnNotificationsRead = async ({
  companyId,
  userId,
}) => {
  return Notification.updateMany(
    {
      companyId,
      recipientUserId: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

/* ================= MESSAGES ================= */

export const getMessages = async ({
  companyId,
  userId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    ...filter,
    $or: [
      { senderUserId: userId },
      { recipientUserId: userId },
    ],
  };

  const [rows, total] = await Promise.all([
    Message.find(query)
      .populate("senderUserId", "name email role")
      .populate("recipientUserId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Message.countDocuments(query),
  ]);

  return {
    messages: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

export const findOwnMessageById = async ({
  id,
  companyId,
  userId,
}) => {
  return Message.findOne({
    _id: id,
    companyId,
    $or: [
      { senderUserId: userId },
      { recipientUserId: userId },
    ],
  })
    .populate("senderUserId", "name email role")
    .populate("recipientUserId", "name email role");
};

export const markOwnReceivedMessageRead = async ({
  id,
  companyId,
  userId,
}) => {
  return Message.findOneAndUpdate(
    {
      _id: id,
      companyId,
      recipientUserId: userId,
    },
    {
      status: "read",
      readAt: new Date(),
      updatedBy: userId,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

/* ================= MEETINGS ================= */

export const getMeetings = async ({
  companyId,
  employeeId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    "attendees.employeeId": employeeId,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    HRMeeting.find(query)
      .populate(
        "organizerId",
        "displayName employeeCode"
      )
      .populate(
        "actionItems.assignedTo",
        "displayName employeeCode"
      )
      .sort({ startDateTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    HRMeeting.countDocuments(query),
  ]);

  return {
    meetings: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

/* ================= EVENTS ================= */

export const getEvents = async ({
  companyId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const query = {
    companyId,
    status: "published",
    ...filter,
  };

  const [rows, total] = await Promise.all([
    HREvent.find(query)
      .sort({ startDateTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    HREvent.countDocuments(query),
  ]);

  return {
    events: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};

/* ================= HOLIDAYS ================= */

export const getHolidays = async ({
  companyId,
  branchId,
  filter = {},
  page,
  limit,
}) => {
  const skip = (page - 1) * limit;

  const branchFilter = branchId
    ? {
        $or: [
          { branchId: null },
          { branchId },
        ],
      }
    : {
        branchId: null,
      };

  const query = {
    companyId,
    isActive: true,
    ...branchFilter,
    ...filter,
  };

  const [rows, total] = await Promise.all([
    Holiday.find(query)
      .populate("branchId", "branchName branchCode")
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Holiday.countDocuments(query),
  ]);

  return {
    holidays: rows,
    pagination: buildPagination({
      total,
      page,
      limit,
    }),
  };
};