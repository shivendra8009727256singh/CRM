import Joi from "joi";

import { SHIFT_TYPE } from "../models/Shift.js";
import {
  LATE_MARK_ACTION,
  OVERTIME_CALCULATION,
} from "../models/AttendancePolicy.js";
import { ATTENDANCE_STATUS, CHECKIN_SOURCE } from "../models/Attendance.js";
import { REGULARIZATION_STATUS } from "../models/AttendanceRegularization.js";

const objectId = Joi.string().hex().length(24);
const code = Joi.string().trim().uppercase().min(1).max(50);

const locationSchema = Joi.object({
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  address: Joi.string().trim().allow("", null),
});

/* ---------------- Shift ---------------- */

export const createShiftSchema = Joi.object({
  shiftName: Joi.string().trim().min(2).max(120).required(),

  shiftCode: Joi.string().trim().uppercase().min(2).max(30).required(),

  shiftType: Joi.string()
    .valid(...Object.values(SHIFT_TYPE))
    .default(SHIFT_TYPE.FIXED),

  startTime: Joi.string().trim().required(),

  endTime: Joi.string().trim().required(),

  breakMinutes: Joi.number().integer().min(0).default(60),

  graceMinutes: Joi.number().integer().min(0).default(10),

  halfDayAfterMinutes: Joi.number().integer().min(0).default(240),

  fullDayMinutes: Joi.number().integer().min(0).default(480),

  weeklyOffDays: Joi.array()
    .items(
      Joi.string().valid(
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
      )
    )
    .default(["sunday"]),

  isDefault: Joi.boolean().default(false),
});

export const updateShiftSchema = createShiftSchema.fork(
  ["shiftName", "shiftCode", "startTime", "endTime"],
  (schema) => schema.optional()
);

/* ---------------- Attendance Policy ---------------- */

export const createAttendancePolicySchema = Joi.object({
  policyName: Joi.string().trim().max(120).required(),

  policyCode: Joi.string().trim().uppercase().max(30).required(),

  graceMinutes: Joi.number().integer().min(0).default(10),

  maxLateAllowedPerMonth: Joi.number().integer().min(0).default(3),

  lateMarkAction: Joi.string()
    .valid(...Object.values(LATE_MARK_ACTION))
    .default(LATE_MARK_ACTION.WARNING),

  halfDayAfterMinutes: Joi.number().integer().min(0).default(240),

  absentAfterMinutes: Joi.number().integer().min(0).default(0),

  allowRegularization: Joi.boolean().default(true),

  regularizationLimitPerMonth: Joi.number().integer().min(0).default(3),

  allowOvertime: Joi.boolean().default(true),

  overtimeCalculation: Joi.string()
    .valid(...Object.values(OVERTIME_CALCULATION))
    .default(OVERTIME_CALCULATION.AFTER_APPROVAL),

  minimumOvertimeMinutes: Joi.number().integer().min(0).default(30),

  biometricRequired: Joi.boolean().default(false),

  selfieRequired: Joi.boolean().default(false),

  gpsRequired: Joi.boolean().default(false),

  webCheckInAllowed: Joi.boolean().default(true),

  mobileCheckInAllowed: Joi.boolean().default(true),

  autoMarkAbsent: Joi.boolean().default(true),

  autoMarkHalfDay: Joi.boolean().default(true),

  isDefault: Joi.boolean().default(false),
});

export const updateAttendancePolicySchema = createAttendancePolicySchema.fork(
  ["policyName", "policyCode"],
  (schema) => schema.optional()
);

/* ---------------- Attendance ---------------- */

export const checkInSchema = Joi.object({
  employeeId: objectId.allow("", null),
  employeeCode: code.allow("", null),

  attendanceDate: Joi.date().default(() => new Date()),

  shiftId: objectId.allow("", null),
  shiftCode: code.allow("", null),

  attendancePolicyId: objectId.allow("", null),
  attendancePolicyCode: code.allow("", null),
  policyCode: code.allow("", null),

  checkInTime: Joi.date().default(() => new Date()),

  checkInSource: Joi.string()
    .valid(...Object.values(CHECKIN_SOURCE))
    .default(CHECKIN_SOURCE.WEB),

  checkInLocation: locationSchema.default({}),

  checkInSelfie: Joi.string().trim().allow("", null),

  remarks: Joi.string().trim().allow("", null),
}).or("employeeId", "employeeCode");

export const checkOutSchema = Joi.object({
  employeeId: objectId.allow("", null),
  employeeCode: code.allow("", null),

  attendanceDate: Joi.date().default(() => new Date()),

  checkOutTime: Joi.date().default(() => new Date()),

  checkOutSource: Joi.string()
    .valid(...Object.values(CHECKIN_SOURCE))
    .default(CHECKIN_SOURCE.WEB),

  checkOutLocation: locationSchema.default({}),

  checkOutSelfie: Joi.string().trim().allow("", null),

  remarks: Joi.string().trim().allow("", null),
}).or("employeeId", "employeeCode");

export const manualAttendanceSchema = Joi.object({
  employeeId: objectId.allow("", null),
  employeeCode: code.allow("", null),

  attendanceDate: Joi.date().required(),

  shiftId: objectId.allow("", null),
  shiftCode: code.allow("", null),

  attendancePolicyId: objectId.allow("", null),
  attendancePolicyCode: code.allow("", null),
  policyCode: code.allow("", null),

  checkInTime: Joi.date().allow(null),

  checkOutTime: Joi.date().allow(null),

  totalWorkMinutes: Joi.number().integer().min(0).default(0),

  breakMinutes: Joi.number().integer().min(0).default(0),

  overtimeMinutes: Joi.number().integer().min(0).default(0),

  lateByMinutes: Joi.number().integer().min(0).default(0),

  earlyCheckoutMinutes: Joi.number().integer().min(0).default(0),

  status: Joi.string().valid(...Object.values(ATTENDANCE_STATUS)).required(),

  remarks: Joi.string().trim().allow("", null),
}).or("employeeId", "employeeCode");

export const updateAttendanceStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ATTENDANCE_STATUS)).required(),

  remarks: Joi.string().trim().allow("", null),
});

/* ---------------- Regularization ---------------- */

export const createRegularizationSchema = Joi.object({
  attendanceId: objectId.allow("", null),

  employeeId: objectId.allow("", null),
  employeeCode: code.allow("", null),
  attendanceDate: Joi.date().allow(null),

  requestedCheckIn: Joi.date().allow(null),

  requestedCheckOut: Joi.date().allow(null),

  reason: Joi.string().trim().min(2).max(1000).required(),

  attachment: Joi.string().trim().allow("", null),

  employeeRemarks: Joi.string().trim().allow("", null),
}).or("attendanceId", "employeeCode", "employeeId");

export const updateRegularizationStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      REGULARIZATION_STATUS.APPROVED,
      REGULARIZATION_STATUS.REJECTED,
      REGULARIZATION_STATUS.CANCELLED
    )
    .required(),

  managerRemarks: Joi.string().trim().allow("", null),
});