import Joi from "joi";

import { LEAVE_CATEGORY } from "../models/LeaveType.js";
import { ACCRUAL_FREQUENCY } from "../models/LeavePolicy.js";
import {
  LEAVE_REQUEST_STATUS,
  LEAVE_DAY_TYPE,
} from "../models/LeaveRequest.js";

const objectId = Joi.string().hex().length(24);

/* ================= LEAVE TYPE ================= */

export const createLeaveTypeSchema = Joi.object({
  leaveName: Joi.string().trim().max(100).required(),

  leaveCode: Joi.string().trim().uppercase().max(30).required(),

  category: Joi.string()
    .valid(...Object.values(LEAVE_CATEGORY))
    .required(),

  description: Joi.string().trim().allow("", null),

  paid: Joi.boolean().default(true),

  allowHalfDay: Joi.boolean().default(true),

  requireDocument: Joi.boolean().default(false),

  requireApproval: Joi.boolean().default(true),

  colorCode: Joi.string().trim().allow("", null),

  isActive: Joi.boolean().default(true),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.fork(
  ["leaveName", "leaveCode", "category"],
  (schema) => schema.optional()
);

/* ================= LEAVE POLICY ================= */

const leavePolicyRuleSchema = Joi.object({
  leaveTypeId: objectId.required(),

  yearlyQuota: Joi.number().min(0).default(0),

  monthlyAccrual: Joi.number().min(0).default(0),

  accrualFrequency: Joi.string()
    .valid(...Object.values(ACCRUAL_FREQUENCY))
    .default(ACCRUAL_FREQUENCY.NONE),

  carryForwardAllowed: Joi.boolean().default(false),

  maxCarryForward: Joi.number().min(0).default(0),

  encashmentAllowed: Joi.boolean().default(false),

  maxConsecutiveDays: Joi.number().integer().min(0).default(0),

  minNoticeDays: Joi.number().integer().min(0).default(0),
});

const approvalLevelSchema = Joi.object({
  level: Joi.number().integer().min(1).required(),

  approverType: Joi.string()
    .valid("reporting_manager", "hr", "company_admin", "specific_employee")
    .default("reporting_manager"),

  approverEmployeeId: objectId.allow(null),

  required: Joi.boolean().default(true),
});

export const createLeavePolicySchema = Joi.object({
  policyName: Joi.string().trim().max(120).required(),

  policyCode: Joi.string().trim().uppercase().max(30).required(),

  description: Joi.string().trim().allow("", null),

  effectiveFrom: Joi.date().allow(null),

  effectiveTo: Joi.date().allow(null),

  rules: Joi.array().items(leavePolicyRuleSchema).default([]),

  approvalLevels: Joi.array().items(approvalLevelSchema).default([]),

  allowNegativeBalance: Joi.boolean().default(false),

  allowBackdatedLeave: Joi.boolean().default(false),

  backdatedLimitDays: Joi.number().integer().min(0).default(0),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const updateLeavePolicySchema = createLeavePolicySchema.fork(
  ["policyName", "policyCode"],
  (schema) => schema.optional()
);

/* ================= LEAVE BALANCE ================= */

export const createLeaveBalanceSchema = Joi.object({
  employeeId: objectId.required(),

  leaveTypeId: objectId.required(),

  leavePolicyId: objectId.allow(null),

  year: Joi.number().integer().required(),

  openingBalance: Joi.number().min(0).default(0),

  credited: Joi.number().min(0).default(0),

  availed: Joi.number().min(0).default(0),

  pending: Joi.number().min(0).default(0),

  carryForward: Joi.number().min(0).default(0),

  availableBalance: Joi.number().min(0).default(0),

  remarks: Joi.string().trim().allow("", null),
});

export const updateLeaveBalanceSchema = createLeaveBalanceSchema.fork(
  ["employeeId", "leaveTypeId", "year"],
  (schema) => schema.optional()
);

/* ================= LEAVE REQUEST ================= */

export const applyLeaveSchema = Joi.object({
  employeeId: objectId.required(),

  leaveTypeId: objectId.required(),

  leavePolicyId: objectId.allow(null),

  fromDate: Joi.date().required(),

  toDate: Joi.date().required(),

  dayType: Joi.string()
    .valid(...Object.values(LEAVE_DAY_TYPE))
    .default(LEAVE_DAY_TYPE.FULL_DAY),

  reason: Joi.string().trim().min(2).max(1000).required(),

  attachment: Joi.string().trim().allow("", null),
});

export const updateLeaveRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      LEAVE_REQUEST_STATUS.APPROVED,
      LEAVE_REQUEST_STATUS.REJECTED,
      LEAVE_REQUEST_STATUS.CANCELLED
    )
    .required(),

  approverRemarks: Joi.string().trim().allow("", null),

  cancellationReason: Joi.string().trim().allow("", null),
});