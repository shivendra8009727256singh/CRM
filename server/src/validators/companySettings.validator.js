import Joi from "joi";

const objectId = Joi.string().length(24).hex();
const optionalObjectId = objectId.allow("", null);
const code = Joi.string().trim().uppercase().min(2).max(30).allow("", null);

export const createBranchSchema = Joi.object({
  branchName: Joi.string().trim().min(2).max(120).required(),

  branchCode: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  email: Joi.string().email().allow("", null),

  phone: Joi.string().allow("", null),

  address: Joi.object({
    addressLine1: Joi.string().allow("", null),
    addressLine2: Joi.string().allow("", null),
    city: Joi.string().allow("", null),
    state: Joi.string().allow("", null),
    country: Joi.string().allow("", null),
    pincode: Joi.string().allow("", null),
  }).default({}),

  isHeadOffice: Joi.boolean().default(false),
});

export const updateBranchSchema = createBranchSchema.fork(
  ["branchName", "branchCode"],
  (schema) => schema.optional()
);

export const createDepartmentSchema = Joi.object({
  // Internal/hidden field. Frontend should prefer branchCode.
  branchId: optionalObjectId,

  // Human-readable field for frontend forms, e.g. BR-01 / HEAD / NOIDA.
  branchCode: code,

  departmentName: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required(),

  departmentCode: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  description: Joi.string().allow("", null),
});

export const updateDepartmentSchema = createDepartmentSchema.fork(
  ["departmentName", "departmentCode"],
  (schema) => schema.optional()
);

export const createDesignationSchema = Joi.object({
  // Internal/hidden field. Frontend should prefer departmentCode.
  departmentId: optionalObjectId,

  // Human-readable field for frontend forms, e.g. HR / SALES / TECH.
  departmentCode: code,

  designationName: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required(),

  designationCode: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  level: Joi.number().integer().min(1).max(100).default(1),

  description: Joi.string().allow("", null),
});

export const updateDesignationSchema = createDesignationSchema.fork(
  ["designationName", "designationCode"],
  (schema) => schema.optional()
);

export const createHolidaySchema = Joi.object({
  // Internal/hidden field. Frontend should prefer branchCode.
  branchId: optionalObjectId,

  // Human-readable field for frontend forms, e.g. BR-01 / HEAD / NOIDA.
  branchCode: code,

  holidayName: Joi.string()
    .trim()
    .min(2)
    .max(120)
    .required(),

  date: Joi.date().required(),

  type: Joi.string()
    .valid("public", "company", "festival", "optional")
    .default("company"),

  description: Joi.string().allow("", null),

  isPaid: Joi.boolean().default(true),
});

export const updateHolidaySchema = createHolidaySchema.fork(
  ["holidayName", "date"],
  (schema) => schema.optional()
);
