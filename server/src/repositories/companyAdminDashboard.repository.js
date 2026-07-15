import { Employee } from "../models/Employee.js";
import { Attendance } from "../models/Attendance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { AttendanceRegularization } from "../models/AttendanceRegularization.js";
import { PayrollRun } from "../models/PayrollRun.js";
import { HRMeeting } from "../models/HRMeeting.js";
import { HREvent } from "../models/HREvent.js";
import { Holiday } from "../models/Holiday.js";
import { Notification } from "../models/Notification.js";

/* =========================================================
   EMPLOYEE COUNTS
========================================================= */

export const countEmployees = async ({
  companyId,
  filter = {},
}) => {
  return Employee.countDocuments({
    companyId,
    ...filter,
  });
};

export const getUpcomingBirthdays = async ({
  companyId,
  startDate,
  endDate,
  limit = 10,
}) => {
  return Employee.aggregate([
    {
      $match: {
        companyId,
        isActive: true,
        dateOfBirth: {
          $ne: null,
        },
      },
    },
    {
      $addFields: {
        birthdayThisYear: {
          $dateFromParts: {
            year: {
              $year: startDate,
            },
            month: {
              $month: "$dateOfBirth",
            },
            day: {
              $dayOfMonth: "$dateOfBirth",
            },
          },
        },
      },
    },
    {
      $match: {
        birthdayThisYear: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        firstName: 1,
        lastName: 1,
        employeePhoto: 1,
        dateOfBirth: 1,
        birthdayThisYear: 1,
      },
    },
    {
      $sort: {
        birthdayThisYear: 1,
      },
    },
    {
      $limit: limit,
    },
  ]);
};

export const getUpcomingAnniversaries = async ({
  companyId,
  startDate,
  endDate,
  limit = 10,
}) => {
  return Employee.aggregate([
    {
      $match: {
        companyId,
        isActive: true,
        joiningDate: {
          $ne: null,
        },
      },
    },
    {
      $addFields: {
        anniversaryThisYear: {
          $dateFromParts: {
            year: {
              $year: startDate,
            },
            month: {
              $month: "$joiningDate",
            },
            day: {
              $dayOfMonth: "$joiningDate",
            },
          },
        },
      },
    },
    {
      $match: {
        anniversaryThisYear: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $addFields: {
        completedYears: {
          $subtract: [
            {
              $year: startDate,
            },
            {
              $year: "$joiningDate",
            },
          ],
        },
      },
    },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        firstName: 1,
        lastName: 1,
        employeePhoto: 1,
        joiningDate: 1,
        anniversaryThisYear: 1,
        completedYears: 1,
      },
    },
    {
      $sort: {
        anniversaryThisYear: 1,
      },
    },
    {
      $limit: limit,
    },
  ]);
};

/* =========================================================
   ATTENDANCE
========================================================= */

export const countAttendance = async ({
  companyId,
  attendanceDate,
  filter = {},
}) => {
  return Attendance.countDocuments({
    companyId,
    attendanceDate,
    ...filter,
  });
};

export const getTodayAttendanceSummary = async ({
  companyId,
  attendanceDate,
}) => {
  return Attendance.aggregate([
    {
      $match: {
        companyId,
        attendanceDate,
      },
    },
    {
      $group: {
        _id: "$status",
        count: {
          $sum: 1,
        },
      },
    },
  ]);
};

export const countPendingRegularizations = async ({
  companyId,
}) => {
  return AttendanceRegularization.countDocuments({
    companyId,
    status: "pending",
  });
};

/* =========================================================
   LEAVE
========================================================= */

export const countPendingLeaveRequests = async ({
  companyId,
}) => {
  return LeaveRequest.countDocuments({
    companyId,
    status: "pending",
  });
};

export const countEmployeesOnLeave = async ({
  companyId,
  date,
}) => {
  return LeaveRequest.distinct("employeeId", {
    companyId,
    status: "approved",
    fromDate: {
      $lte: date,
    },
    toDate: {
      $gte: date,
    },
  }).then((employeeIds) => employeeIds.length);
};

/* =========================================================
   PAYROLL
========================================================= */

export const getLatestPayrollRun = async ({
  companyId,
}) => {
  return PayrollRun.findOne({
    companyId,
  })
    .sort({
      year: -1,
      month: -1,
      createdAt: -1,
    })
    .lean();
};

/* =========================================================
   MEETINGS
========================================================= */

export const getUpcomingMeetings = async ({
  companyId,
  fromDate,
  limit = 5,
}) => {
  return HRMeeting.find({
    companyId,
    startDateTime: {
      $gte: fromDate,
    },
    status: {
      $in: ["scheduled", "rescheduled"],
    },
  })
    .populate(
      "organizerId",
      "displayName employeeCode"
    )
    .sort({
      startDateTime: 1,
    })
    .limit(limit)
    .lean();
};

/* =========================================================
   EVENTS
========================================================= */

export const getUpcomingEvents = async ({
  companyId,
  fromDate,
  limit = 5,
}) => {
  return HREvent.find({
    companyId,
    startDateTime: {
      $gte: fromDate,
    },
    status: "published",
  })
    .sort({
      startDateTime: 1,
    })
    .limit(limit)
    .lean();
};

/* =========================================================
   HOLIDAYS
========================================================= */

export const getUpcomingHolidays = async ({
  companyId,
  fromDate,
  limit = 5,
}) => {
  return Holiday.find({
    companyId,
    date: {
      $gte: fromDate,
    },
    isActive: true,
  })
    .populate(
      "branchId",
      "branchName branchCode"
    )
    .sort({
      date: 1,
    })
    .limit(limit)
    .lean();
};

/* =========================================================
   NOTIFICATIONS
========================================================= */

export const countUnreadNotifications = async ({
  companyId,
  userId,
}) => {
  return Notification.countDocuments({
    companyId,
    recipientUserId: userId,
    isRead: false,
  });
};

/* =========================================================
   DEPARTMENT / BRANCH ANALYTICS
========================================================= */

export const getDepartmentWiseEmployees = async ({
  companyId,
}) => {
  return Employee.aggregate([
    {
      $match: {
        companyId,
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$departmentId",
        employeeCount: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "department",
      },
    },
    {
      $unwind: {
        path: "$department",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        departmentCode:
          "$department.departmentCode",
        departmentName:
          "$department.departmentName",
        employeeCount: 1,
      },
    },
    {
      $sort: {
        employeeCount: -1,
      },
    },
  ]);
};

export const getBranchWiseEmployees = async ({
  companyId,
}) => {
  return Employee.aggregate([
    {
      $match: {
        companyId,
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$branchId",
        employeeCount: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: "branches",
        localField: "_id",
        foreignField: "_id",
        as: "branch",
      },
    },
    {
      $unwind: {
        path: "$branch",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        branchCode: "$branch.branchCode",
        branchName: "$branch.branchName",
        employeeCount: 1,
      },
    },
    {
      $sort: {
        employeeCount: -1,
      },
    },
  ]);
};

/* =========================================================
   RECENT EMPLOYEES / ACTIVITY
========================================================= */

export const getRecentlyAddedEmployees = async ({
  companyId,
  limit = 5,
}) => {
  return Employee.find({
    companyId,
  })
    .populate(
      "departmentId",
      "departmentName departmentCode"
    )
    .populate(
      "designationId",
      "designationName designationCode"
    )
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .select(
      "employeeCode displayName firstName lastName employeePhoto joiningDate employeeStatus departmentId designationId createdAt"
    )
    .lean();
};