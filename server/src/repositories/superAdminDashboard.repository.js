import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { Attendance } from "../models/Attendance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { PayrollRun } from "../models/PayrollRun.js";

import {
  COMPANY_STATUS,
  SUBSCRIPTION_STATUS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import { ATTENDANCE_STATUS } from "../models/Attendance.js";
import { LEAVE_REQUEST_STATUS } from "../models/LeaveRequest.js";

/* =========================================================
   COMPANY
========================================================= */

export const countCompanies = async (filter = {}) => {
  return Company.countDocuments(filter);
};

export const getLatestCompanies = async (limit = 10) => {
  return Company.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const getLargestCompanies = async (limit = 10) => {
  return Employee.aggregate([
    {
      $group: {
        _id: "$companyId",
        employeeCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "_id",
        as: "company",
      },
    },
    {
      $unwind: "$company",
    },
    {
      $project: {
        companyName: "$company.companyName",
        companyCode: "$company.companyCode",
        employeeCount: 1,
      },
    },
    {
      $sort: {
        employeeCount: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);
};

export const getMonthlyCompanyRegistrations = async (year) => {
  return Company.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        companies: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

/* =========================================================
   USERS
========================================================= */

export const countUsers = async (filter = {}) => {
  return User.countDocuments(filter);
};

export const getLatestUsers = async (limit = 10) => {
  return User.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name email role companyId createdAt")
    .populate("companyId", "companyName companyCode")
    .lean();
};

/* =========================================================
   EMPLOYEES
========================================================= */

export const countEmployees = async (filter = {}) => {
  return Employee.countDocuments(filter);
};

/* =========================================================
   ATTENDANCE
========================================================= */

export const countAttendance = async (filter = {}) => {
  return Attendance.countDocuments(filter);
};

/* =========================================================
   LEAVE
========================================================= */

export const countLeaveRequests = async (filter = {}) => {
  return LeaveRequest.countDocuments(filter);
};

/* =========================================================
   PAYROLL
========================================================= */

export const getLatestPayrollRuns = async (limit = 10) => {
  return PayrollRun.find()
    .sort({
      year: -1,
      month: -1,
      createdAt: -1,
    })
    .limit(limit)
    .populate("companyId", "companyName companyCode")
    .lean();
};