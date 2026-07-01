import { Employee } from "../models/Employee.js";
import { EmployeeFamily } from "../models/EmployeeFamily.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { EmployeeStatutory } from "../models/EmployeeStatutory.js";
import { EmployeeDocument } from "../models/EmployeeDocument.js";

import { Branch } from "../models/Branch.js";
import { Department } from "../models/Department.js";
import { Designation } from "../models/Designation.js";

/* ---------------- Employee Core ---------------- */

export const createEmployeeRecord = async (payload) => {
  return Employee.create(payload);
};

export const findEmployeeById = async (id) => {
  return Employee.findById(id);
};

export const findEmployeeByCode = async (companyId, employeeCode) => {
  return Employee.findOne({
    companyId,
    employeeCode,
  });
};

export const findEmployeeByOfficialEmail = async (companyId, officialEmail) => {
  if (!officialEmail) return null;

  return Employee.findOne({
    companyId,
    officialEmail: officialEmail.toLowerCase(),
  });
};

export const findEmployeeByMobile = async (companyId, mobile) => {
  if (!mobile) return null;

  return Employee.findOne({
    companyId,
    mobile,
  });
};

export const findLastEmployeeByCompany = async (companyId) => {
  return Employee.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select("employeeCode");
};

export const updateEmployeeById = async (id, payload) => {
  return Employee.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const softDeleteEmployeeById = async (id, updatedBy) => {
  return Employee.findByIdAndUpdate(
    id,
    {
      isActive: false,
      employeeStatus: "inactive",
      updatedBy,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const listEmployees = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate("branchId", "branchName branchCode")
      .populate("departmentId", "departmentName departmentCode")
      .populate("designationId", "designationName designationCode")
      .populate("reportingManagerId", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Employee.countDocuments(filter),
  ]);

  return {
    employees,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ---------------- Company Setting Validation ---------------- */

export const findBranchById = async (id) => {
  return Branch.findById(id);
};

export const findDepartmentById = async (id) => {
  return Department.findById(id);
};

export const findDesignationById = async (id) => {
  return Designation.findById(id);
};

/* ---------------- Family ---------------- */

export const upsertEmployeeFamily = async (employeeId, payload) => {
  return EmployeeFamily.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeFamily = async (employeeId) => {
  return EmployeeFamily.findOne({ employeeId });
};

/* ---------------- Bank ---------------- */

export const upsertEmployeeBank = async (employeeId, payload) => {
  return EmployeeBank.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeBank = async (employeeId) => {
  return EmployeeBank.findOne({ employeeId });
};

/* ---------------- Statutory ---------------- */

export const upsertEmployeeStatutory = async (employeeId, payload) => {
  return EmployeeStatutory.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeStatutory = async (employeeId) => {
  return EmployeeStatutory.findOne({ employeeId });
};

/* ---------------- Documents ---------------- */

export const upsertEmployeeDocuments = async (employeeId, payload) => {
  return EmployeeDocument.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeDocuments = async (employeeId) => {
  return EmployeeDocument.findOne({ employeeId });
};

/* ---------------- Dashboard Helpers ---------------- */

export const countEmployees = async (filter) => {
  return Employee.countDocuments(filter);
};

export const countEmployeesByDepartment = async (companyId) => {
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
        total: { $sum: 1 },
      },
    },
  ]);
};

export const getUpcomingBirthdays = async (companyId, limit = 10) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  return Employee.aggregate([
    {
      $match: {
        companyId,
        isActive: true,
        dateOfBirth: { $ne: null },
      },
    },
    {
      $addFields: {
        birthMonth: { $month: "$dateOfBirth" },
        birthDay: { $dayOfMonth: "$dateOfBirth" },
      },
    },
    {
      $match: {
        $or: [
          { birthMonth: { $gt: currentMonth } },
          {
            birthMonth: currentMonth,
            birthDay: { $gte: currentDay },
          },
        ],
      },
    },
    {
      $sort: {
        birthMonth: 1,
        birthDay: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        dateOfBirth: 1,
        birthMonth: 1,
        birthDay: 1,
      },
    },
  ]);
};