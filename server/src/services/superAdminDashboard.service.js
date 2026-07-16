import { ApiError } from "../utils/apiError.js";
import {
  COMPANY_STATUS,
  SUBSCRIPTION_STATUS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import {
  countCompanies,
  getLatestCompanies,
  getLargestCompanies,
  getMonthlyCompanyRegistrations,

  countUsers,
  getLatestUsers,

  countEmployees,

  countAttendance,

  countLeaveRequests,

  getLatestPayrollRuns,
} from "../repositories/superAdminDashboard.repository.js";

/* =========================================================
   HELPERS
========================================================= */

const ensureSuperAdminAccess = (currentUser) => {
  if (!currentUser) {
    throw new ApiError(401, "Authentication required.");
  }

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(
      403,
      "Super Admin Dashboard is available only to Super Admin accounts."
    );
  }
};

const startOfDay = (date = new Date()) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }

  value.setHours(0, 0, 0, 0);

  return value;
};

const endOfDay = (date = new Date()) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }

  value.setHours(23, 59, 59, 999);

  return value;
};

const startOfMonth = (date = new Date()) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
};

const endOfMonth = (date = new Date()) => {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
};

const startOfYear = (date = new Date()) => {
  return new Date(
    date.getFullYear(),
    0,
    1,
    0,
    0,
    0,
    0
  );
};

const endOfYear = (date = new Date()) => {
  return new Date(
    date.getFullYear(),
    11,
    31,
    23,
    59,
    59,
    999
  );
};

const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const mapMonthlyRegistrations = (rows = []) => {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    companies: 0,
  }));

  for (const row of rows) {
    const monthIndex = Number(row?._id) - 1;

    if (monthIndex >= 0 && monthIndex < 12) {
      months[monthIndex].companies = Number(
        row?.companies || 0
      );
    }
  }

  return months;
};

/* =========================================================
   SUPER ADMIN DASHBOARD
========================================================= */

export const getSuperAdminDashboardService = async (
  currentUser,
  query = {}
) => {
  ensureSuperAdminAccess(currentUser);

  const selectedDate = query.date
    ? new Date(query.date)
    : new Date();

  if (Number.isNaN(selectedDate.getTime())) {
    throw new ApiError(400, "Invalid dashboard date.");
  }

  const todayStart = startOfDay(selectedDate);
  const todayEnd = endOfDay(selectedDate);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const yearStart = startOfYear(selectedDate);
  const yearEnd = endOfYear(selectedDate);

  const selectedYear = selectedDate.getFullYear();

  const trialEndingWindowDays = Math.min(
    Math.max(Number(query.trialEndingWindowDays || 7), 1),
    90
  );

  const trialEndingDate = addDays(
    todayEnd,
    trialEndingWindowDays
  );

  const [
    totalCompanies,
    pendingVerificationCompanies,
    activeCompanies,
    inactiveCompanies,
    suspendedCompanies,
    trialCompanies,

    trialSubscriptionCompanies,
    activeSubscriptionCompanies,
    expiredSubscriptionCompanies,
    cancelledSubscriptionCompanies,

    freePlanCompanies,
    starterPlanCompanies,
    businessPlanCompanies,
    enterprisePlanCompanies,

    trialEndingSoonCompanies,

    companiesCreatedThisMonth,
    companiesCreatedThisYear,
    monthlyRegistrationRows,

    latestCompanies,
    largestCompanies,

    totalUsers,
    superAdminUsers,
    companyAdminUsers,
    hrUsers,
    supportUsers,
    employeeUsers,
    activeUsers,
    inactiveUsers,
    blockedUsers,
    verifiedUsers,
    unverifiedUsers,
    latestUsers,

    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    probationEmployees,

    presentToday,
    absentToday,
    lateToday,
    onLeaveToday,

    pendingLeaveRequests,
    approvedLeaveRequests,
    rejectedLeaveRequests,

    latestPayrollRuns,
  ] = await Promise.all([
    /* ---------------- COMPANIES ---------------- */

    countCompanies(),

    countCompanies({
      status:
        COMPANY_STATUS.PENDING_VERIFICATION ||
        "pending_verification",
    }),

    countCompanies({
      status: COMPANY_STATUS.ACTIVE,
    }),

    countCompanies({
      status: COMPANY_STATUS.INACTIVE,
    }),

    countCompanies({
      status: COMPANY_STATUS.SUSPENDED,
    }),

    countCompanies({
      status: COMPANY_STATUS.TRIAL,
    }),

    /* ---------------- SUBSCRIPTIONS ---------------- */

    countCompanies({
      subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
    }),

    countCompanies({
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
    }),

    countCompanies({
      subscriptionStatus: SUBSCRIPTION_STATUS.EXPIRED,
    }),

    countCompanies({
      subscriptionStatus: SUBSCRIPTION_STATUS.CANCELLED,
    }),

    countCompanies({
      subscriptionPlan: "free",
    }),

    countCompanies({
      subscriptionPlan: "starter",
    }),

    countCompanies({
      subscriptionPlan: "business",
    }),

    countCompanies({
      subscriptionPlan: "enterprise",
    }),

    countCompanies({
      subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
      trialEndsAt: {
        $gte: todayStart,
        $lte: trialEndingDate,
      },
    }),

    /* ---------------- GROWTH ---------------- */

    countCompanies({
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    }),

    countCompanies({
      createdAt: {
        $gte: yearStart,
        $lte: yearEnd,
      },
    }),

    getMonthlyCompanyRegistrations(selectedYear),

    getLatestCompanies(10),

    getLargestCompanies(10),

    /* ---------------- USERS ---------------- */

    countUsers(),

    countUsers({
      role: ROLES.SUPER_ADMIN,
    }),

    countUsers({
      role: ROLES.COMPANY_ADMIN,
    }),

    countUsers({
      role: ROLES.HR,
    }),

    countUsers({
      role: ROLES.SUPPORT,
    }),

    countUsers({
      role: ROLES.EMPLOYEE,
    }),

    countUsers({
      status: USER_STATUS.ACTIVE,
    }),

    countUsers({
      status: USER_STATUS.INACTIVE,
    }),

    countUsers({
      status: USER_STATUS.BLOCKED,
    }),

    countUsers({
      isEmailVerified: true,
    }),

    countUsers({
      isEmailVerified: false,
    }),

    getLatestUsers(10),

    /* ---------------- EMPLOYEES ---------------- */

    countEmployees(),

    countEmployees({
      employeeStatus: "active",
    }),

    countEmployees({
      employeeStatus: "inactive",
    }),

    countEmployees({
      employeeStatus: "probation",
    }),

    /* ---------------- ATTENDANCE ---------------- */

    countAttendance({
      attendanceDate: todayStart,
      status: "present",
    }),

    countAttendance({
      attendanceDate: todayStart,
      status: "absent",
    }),

    countAttendance({
      attendanceDate: todayStart,
      status: "late",
    }),

    countAttendance({
      attendanceDate: todayStart,
      status: "on_leave",
    }),

    /* ---------------- LEAVE ---------------- */

    countLeaveRequests({
      status: "pending",
    }),

    countLeaveRequests({
      status: "approved",
    }),

    countLeaveRequests({
      status: "rejected",
    }),

    /* ---------------- PAYROLL ---------------- */

    getLatestPayrollRuns(10),
  ]);

  return {
    overview: {
      companies: {
        total: totalCompanies,
        pendingVerification:
          pendingVerificationCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        suspended: suspendedCompanies,
        trial: trialCompanies,
      },

      users: {
        total: totalUsers,
        superAdmins: superAdminUsers,
        companyAdmins: companyAdminUsers,
        hr: hrUsers,
        support: supportUsers,
        employees: employeeUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        blocked: blockedUsers,
        verified: verifiedUsers,
        unverified: unverifiedUsers,
      },

      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        probation: probationEmployees,
      },

      attendanceToday: {
        present: presentToday,
        absent: absentToday,
        late: lateToday,
        onLeave: onLeaveToday,
      },

      leaveRequests: {
        pending: pendingLeaveRequests,
        approved: approvedLeaveRequests,
        rejected: rejectedLeaveRequests,
      },
    },

    subscriptions: {
      status: {
        trial: trialSubscriptionCompanies,
        active: activeSubscriptionCompanies,
        expired: expiredSubscriptionCompanies,
        cancelled: cancelledSubscriptionCompanies,
      },

      plans: {
        free: freePlanCompanies,
        starter: starterPlanCompanies,
        business: businessPlanCompanies,
        enterprise: enterprisePlanCompanies,
      },

      trialEndingSoon: trialEndingSoonCompanies,
      trialEndingWindowDays,
    },

    growth: {
      selectedYear,
      companiesCreatedThisMonth,
      companiesCreatedThisYear,
      monthlyRegistrations: mapMonthlyRegistrations(
        monthlyRegistrationRows
      ),
    },

    companies: {
      latest: latestCompanies,
      largest: largestCompanies,
    },

    users: {
      latest: latestUsers,
    },

    payroll: {
      latestRuns: latestPayrollRuns,
    },

    platformHealth: {
      apiStatus: "operational",
      databaseStatus: "connected",
      socketStatus: "enabled",
      serverTime: new Date(),
      environment:
        process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    },

    generatedAt: new Date(),
  };
};