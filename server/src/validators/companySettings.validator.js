import Joi from "joi";

const code = Joi.string().trim().uppercase().min(2).max(30).allow("", null);

const addressSchema = Joi.object({
  addressLine1: Joi.string().allow("", null),
  addressLine2: Joi.string().allow("", null),
  city: Joi.string().allow("", null),
  state: Joi.string().allow("", null),
  country: Joi.string().allow("", null),
  pincode: Joi.string().allow("", null),
}).default({});

const withCompanySettingsAliases = (schema) => {
  return schema
    .rename("branchcode", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("branch_code", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("departmentcode", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("department_code", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designationcode", "designationCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designation_code", "designationCode", {
      ignoreUndefined: true,
      override: true,
    });
};

/* ================= BRANCH ================= */

const branchBaseSchema = Joi.object({
  branchName: Joi.string().trim().min(2).max(120).required(),

  branchCode: Joi.string().trim().uppercase().min(2).max(30).required(),

  email: Joi.string().email().allow("", null),

  phone: Joi.string().allow("", null),

  address: addressSchema,

  isHeadOffice: Joi.boolean().default(false),
});

export const createBranchSchema = branchBaseSchema;

export const updateBranchSchema = branchBaseSchema.fork(
  ["branchName", "branchCode"],
  (schema) => schema.optional()
);

/* ================= DEPARTMENT ================= */

const departmentBaseSchema = Joi.object({
  branchCode: code,

  departmentName: Joi.string().trim().min(2).max(120).required(),

  departmentCode: Joi.string().trim().uppercase().min(2).max(30).required(),

  description: Joi.string().allow("", null),
});

export const createDepartmentSchema =
  withCompanySettingsAliases(departmentBaseSchema);

export const updateDepartmentSchema = withCompanySettingsAliases(
  departmentBaseSchema.fork(
    ["departmentName", "departmentCode"],
    (schema) => schema.optional()
  )
);

/* ================= DESIGNATION ================= */

const designationBaseSchema = Joi.object({
  departmentCode: code,

  designationName: Joi.string().trim().min(2).max(120).required(),

  designationCode: Joi.string().trim().uppercase().min(2).max(30).required(),

  level: Joi.number().integer().min(1).max(100).default(1),

  description: Joi.string().allow("", null),
});

export const createDesignationSchema =
  withCompanySettingsAliases(designationBaseSchema);

export const updateDesignationSchema = withCompanySettingsAliases(
  designationBaseSchema.fork(
    ["designationName", "designationCode"],
    (schema) => schema.optional()
  )
);

/* ================= HOLIDAY ================= */

const holidayBaseSchema = Joi.object({
  branchCode: code,

  holidayName: Joi.string().trim().min(2).max(120).required(),

  date: Joi.date().required(),

  type: Joi.string()
    .valid("public", "company", "festival", "optional")
    .default("company"),

  description: Joi.string().allow("", null),

  isPaid: Joi.boolean().default(true),
});

export const createHolidaySchema =
  withCompanySettingsAliases(holidayBaseSchema);

export const updateHolidaySchema = withCompanySettingsAliases(
  holidayBaseSchema.fork(["holidayName", "date"], (schema) =>
    schema.optional()
  )
);