import Joi from "joi";

import { LEAVE_DAY_TYPE } from "../models/LeaveRequest.js";

const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).allow(null),

  longitude: Joi.number().min(-180).max(180).allow(null),

  address: Joi.string().trim().max(500).allow("", null),
});

/* ================= PROFILE ================= */

export const updateMyProfileSchema = Joi.object({
  personalEmail: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(254)
    .allow("", null),

  mobile: Joi.string()
    .trim()
    .min(7)
    .max(20)
    .allow("", null),

  alternateMobile: Joi.string()
    .trim()
    .min(7)
    .max(20)
    .allow("", null),

  currentAddress: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),

  permanentAddress: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),

  emergencyContactName: Joi.string()
    .trim()
    .max(120)
    .allow("", null),

  emergencyContactRelation: Joi.string()
    .trim()
    .max(80)
    .allow("", null),

  emergencyContactNumber: Joi.string()
    .trim()
    .min(7)
    .max(20)
    .allow("", null),

  profilePhoto: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
}).min(1);

/* ================= ATTENDANCE ================= */

export const myCheckInSchema = Joi.object({
  attendanceDate: Joi.date().allow(null),

  checkInTime: Joi.date().allow(null),

  checkInSource: Joi.string()
    .valid("web", "mobile", "biometric", "manual")
    .default("web"),

  checkInLocation: locationSchema.default({}),

  checkInSelfie: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
});

export const myCheckOutSchema = Joi.object({
  attendanceDate: Joi.date().allow(null),

  checkOutTime: Joi.date().allow(null),

  checkOutSource: Joi.string()
    .valid("web", "mobile", "biometric", "manual")
    .default("web"),

  checkOutLocation: locationSchema.default({}),

  checkOutSelfie: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
});

export const myRegularizationSchema = Joi.object({
  attendanceDate: Joi.date().required(),

  requestedCheckIn: Joi.date().allow(null),

  requestedCheckOut: Joi.date().allow(null),

  reason: Joi.string()
    .trim()
    .min(2)
    .max(1000)
    .required(),

  attachment: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),

  employeeRemarks: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
}).custom((value, helpers) => {
  if (!value.requestedCheckIn && !value.requestedCheckOut) {
    return helpers.message({
      custom:
        "At least one of requestedCheckIn or requestedCheckOut is required.",
    });
  }

  if (
    value.requestedCheckIn &&
    value.requestedCheckOut &&
    new Date(value.requestedCheckOut) <=
      new Date(value.requestedCheckIn)
  ) {
    return helpers.message({
      custom:
        "Requested check-out must be after requested check-in.",
    });
  }

  return value;
});

/* ================= LEAVE ================= */

export const myLeaveApplySchema = Joi.object({
  leaveTypeCode: Joi.string()
    .trim()
    .uppercase()
    .min(1)
    .max(30)
    .required(),

  fromDate: Joi.date().required(),

  toDate: Joi.date()
    .min(Joi.ref("fromDate"))
    .required()
    .messages({
      "date.min":
        "Leave end date cannot be before the start date.",
    }),

  dayType: Joi.string()
    .valid(...Object.values(LEAVE_DAY_TYPE))
    .default(LEAVE_DAY_TYPE.FULL_DAY),

  reason: Joi.string()
    .trim()
    .min(2)
    .max(1000)
    .required(),

  attachment: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
});

export const myLeaveCancelSchema = Joi.object({
  cancellationReason: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
});

/* ================= COMMUNICATION ================= */

export const sendMessageToHRSchema = Joi.object({
  subject: Joi.string()
    .trim()
    .max(200)
    .allow("", null),

  body: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required(),

  attachmentUrl: Joi.string()
    .trim()
    .max(1000)
    .allow("", null),
});