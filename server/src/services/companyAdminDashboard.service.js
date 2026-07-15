import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { ATTENDANCE_STATUS } from "../models/Attendance.js";
import { EMPLOYEE_STATUS } from "../models/Employee.js";

import {
  countEmployees,
  getUpcomingBirthdays,
  getUpcomingAnniversaries,

  countAttendance,
  getTodayAttendanceSummary,
  countPendingRegularizations,

  countPendingLeaveRequests,
  countEmployeesOnLeave,

  getLatestPayrollRun,

  getUpcomingMeetings,
  getUpcomingEvents,
  getUpcomingHolidays,

  countUnreadNotifications,

  getDepartmentWiseEmployees,
  getBranchWiseEmployees,

  getRecentlyAddedEmployees,
} from "../repositories/companyAdminDashboard.repository.js";

/* =========================================================
   HELPERS
========================================================= */

const ensureCompanyAdminAccess = (currentUser) => {
  if (!currentUser) {
    throw new ApiError(401, "Authentication required.");
  }

  if (currentUser.role !== ROLES.COMPANY_ADMIN) {
    throw new ApiError(
      403,
      "Company Admin Dashboard is available only to Company Admin accounts."
    );
  }
};

const getCompanyId = (currentUser) => {
  if (!currentUser?.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const startOfDay = (date = new Date()) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }

  value.setHours(0, 0, 0, 0);

  return value;
};

const addDays = (date, days) => {
  const value = new Date(date);

  value.setDate(value.getDate() + days);

  return value;
};

const mapAttendanceSummary = (rows = []) => {
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    weekOff: 0,
    holiday: 0,
  };

  for (const row of rows) {
    const status = row?._id;
    const count = Number(row?.count || 0);

    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        summary.present = count;
        break;

      case ATTENDANCE_STATUS.ABSENT:
        summary.absent = count;
        break;

      case ATTENDANCE_STATUS.LATE:
        summary.late = count;
        break;

      case ATTENDANCE_STATUS.HALF_DAY:
        summary.halfDay = count;
        break;

      case ATTENDANCE_STATUS.ON_LEAVE:
        summary.onLeave = count;
        break;

      case ATTENDANCE_STATUS.WEEK_OFF:
        summary.weekOff = count;
        break;

      case ATTENDANCE_STATUS.HOLIDAY:
        summary.holiday = count;
        break;

      default:
        break;
    }
  }

  return summary;
};

/* =========================================================
   COMPANY ADMIN DASHBOARD
========================================================= */

export const getCompanyAdminDashboardService = async (
  currentUser,
  query = {}
) => {
  ensureCompanyAdminAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const today = startOfDay(query.date || new Date());

  const birthdayWindowDays = Math.min(
    Math.max(Number(query.birthdayWindowDays || 30), 1),
    365
  );

  const anniversaryWindowDays = Math.min(
    Math.max(Number(query.anniversaryWindowDays || 30), 1),
    365
  );

  const birthdayEndDate = addDays(
    today,
    birthdayWindowDays
  );

  const anniversaryEndDate = addDays(
    today,
    anniversaryWindowDays
  );

  const [
    totalEmployees,
    activeEmployees,
    probationEmployees,

    presentToday,
    absentToday,
    lateToday,
    attendanceSummaryRows,

    employeesOnLeave,
    pendingLeaveRequests,
    pendingRegularizations,

    latestPayrollRun,

    upcomingBirthdays,
    upcomingAnniversaries,

    upcomingMeetings,
    upcomingEvents,
    upcomingHolidays,

    unreadNotifications,

    departmentWiseEmployees,
    branchWiseEmployees,

    recentlyAddedEmployees,
  ] = await Promise.all([
    countEmployees({
      companyId,
    }),

    countEmployees({
      companyId,
      filter: {
        employeeStatus: EMPLOYEE_STATUS.ACTIVE,
      },
    }),

    countEmployees({
      companyId,
      filter: {
        employeeStatus: EMPLOYEE_STATUS.PROBATION,
      },
    }),

    countAttendance({
      companyId,
      attendanceDate: today,
      filter: {
        status: ATTENDANCE_STATUS.PRESENT,
      },
    }),

    countAttendance({
      companyId,
      attendanceDate: today,
      filter: {
        status: ATTENDANCE_STATUS.ABSENT,
      },
    }),

    countAttendance({
      companyId,
      attendanceDate: today,
      filter: {
        status: ATTENDANCE_STATUS.LATE,
      },
    }),

    getTodayAttendanceSummary({
      companyId,
      attendanceDate: today,
    }),

    countEmployeesOnLeave({
      companyId,
      date: today,
    }),

    countPendingLeaveRequests({
      companyId,
    }),

    countPendingRegularizations({
      companyId,
    }),

    getLatestPayrollRun({
      companyId,
    }),

    getUpcomingBirthdays({
      companyId,
      startDate: today,
      endDate: birthdayEndDate,
      limit: 10,
    }),

    getUpcomingAnniversaries({
      companyId,
      startDate: today,
      endDate: anniversaryEndDate,
      limit: 10,
    }),

    getUpcomingMeetings({
      companyId,
      fromDate: new Date(),
      limit: 5,
    }),

    getUpcomingEvents({
      companyId,
      fromDate: new Date(),
      limit: 5,
    }),

    getUpcomingHolidays({
      companyId,
      fromDate: today,
      limit: 5,
    }),

    countUnreadNotifications({
      companyId,
      userId: currentUser._id,
    }),

    getDepartmentWiseEmployees({
      companyId,
    }),

    getBranchWiseEmployees({
      companyId,
    }),

    getRecentlyAddedEmployees({
      companyId,
      limit: 5,
    }),
  ]);

  const attendanceSummary = mapAttendanceSummary(
    attendanceSummaryRows
  );

  return {
    overview: {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        probation: probationEmployees,
        inactive: Math.max(
          totalEmployees - activeEmployees - probationEmployees,
          0
        ),
      },

      attendanceToday: {
        present: presentToday,
        absent: absentToday,
        late: lateToday,
        halfDay: attendanceSummary.halfDay,
        onLeave: employeesOnLeave,
        weekOff: attendanceSummary.weekOff,
        holiday: attendanceSummary.holiday,
      },

      approvals: {
        pendingLeaveRequests,
        pendingAttendanceRegularizations:
          pendingRegularizations,
      },

      notifications: {
        unreadCount: unreadNotifications,
      },
    },

    payroll: latestPayrollRun
      ? {
          payrollCode:
            latestPayrollRun.payrollCode || "",
          month: latestPayrollRun.month,
          year: latestPayrollRun.year,
          status: latestPayrollRun.status,
          totalEmployees:
            latestPayrollRun.totalEmployees || 0,
          totalGrossSalary:
            latestPayrollRun.totalGrossSalary || 0,
          totalDeductions:
            latestPayrollRun.totalDeductions || 0,
          totalNetSalary:
            latestPayrollRun.totalNetSalary || 0,
          processedAt:
            latestPayrollRun.processedAt || null,
        }
      : null,

    upcoming: {
      birthdays: upcomingBirthdays,
      anniversaries: upcomingAnniversaries,
      meetings: upcomingMeetings,
      events: upcomingEvents,
      holidays: upcomingHolidays,
    },

    analytics: {
      departmentWiseEmployees,
      branchWiseEmployees,
      attendanceStatusWise: attendanceSummary,
    },

    recentActivity: {
      recentlyAddedEmployees,
    },

    generatedAt: new Date(),
  };
};