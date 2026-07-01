import Joi from "joi";

import {
  COMPONENT_TYPE,
  CALCULATION_TYPE,
} from "../models/SalaryComponent.js";

import { SALARY_STATUS } from "../models/EmployeeSalary.js";
import { PAYROLL_STATUS } from "../models/PayrollRun.js";
import { PAYSLIP_STATUS } from "../models/Payslip.js";

const objectId = Joi.string().hex().length(24);

const salaryComponentValueSchema = Joi.object({
  componentId: objectId.required(),
  componentName: Joi.string().trim().allow("", null),
  componentCode: Joi.string().trim().uppercase().allow("", null),
  type: Joi.string().valid("earning", "deduction").required(),
  amount: Joi.number().min(0).default(0),
});

/* ================= SALARY COMPONENT ================= */

export const createSalaryComponentSchema = Joi.object({
  componentName: Joi.string().trim().max(120).required(),

  componentCode: Joi.string().trim().uppercase().max(30).required(),

  type: Joi.string()
    .valid(...Object.values(COMPONENT_TYPE))
    .required(),

  calculationType: Joi.string()
    .valid(...Object.values(CALCULATION_TYPE))
    .default(CALCULATION_TYPE.FIXED),

  value: Joi.number().min(0).default(0),

  taxable: Joi.boolean().default(true),

  affectsPF: Joi.boolean().default(false),

  affectsESI: Joi.boolean().default(false),

  affectsGratuity: Joi.boolean().default(false),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const updateSalaryComponentSchema = createSalaryComponentSchema.fork(
  ["componentName", "componentCode", "type"],
  (schema) => schema.optional()
);

/* ================= SALARY STRUCTURE ================= */

const structureComponentSchema = Joi.object({
  componentId: objectId.required(),
  amount: Joi.number().min(0).default(0),
  percentageOfCTC: Joi.number().min(0).default(0),
  enabled: Joi.boolean().default(true),
});

export const createSalaryStructureSchema = Joi.object({
  structureName: Joi.string().trim().max(120).required(),

  structureCode: Joi.string().trim().uppercase().max(30).required(),

  description: Joi.string().trim().allow("", null),

  annualCTC: Joi.number().min(0).default(0),

  monthlyCTC: Joi.number().min(0).default(0),

  earnings: Joi.array().items(structureComponentSchema).default([]),

  deductions: Joi.array().items(structureComponentSchema).default([]),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const updateSalaryStructureSchema = createSalaryStructureSchema.fork(
  ["structureName", "structureCode"],
  (schema) => schema.optional()
);

/* ================= EMPLOYEE SALARY ================= */

export const assignEmployeeSalarySchema = Joi.object({
  employeeId: objectId.required(),

  salaryStructureId: objectId.allow(null),

  annualCTC: Joi.number().min(0).default(0),

  monthlyCTC: Joi.number().min(0).default(0),

  earnings: Joi.array().items(salaryComponentValueSchema).default([]),

  deductions: Joi.array().items(salaryComponentValueSchema).default([]),

  grossSalary: Joi.number().min(0).default(0),

  totalDeductions: Joi.number().min(0).default(0),

  netSalary: Joi.number().min(0).default(0),

  effectiveFrom: Joi.date().required(),

  effectiveTo: Joi.date().allow(null),

  status: Joi.string()
    .valid(...Object.values(SALARY_STATUS))
    .default(SALARY_STATUS.ACTIVE),

  remarks: Joi.string().trim().allow("", null),
});

export const updateEmployeeSalarySchema = assignEmployeeSalarySchema.fork(
  ["employeeId", "effectiveFrom"],
  (schema) => schema.optional()
);

/* ================= PAYROLL RUN ================= */

export const createPayrollRunSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),

  year: Joi.number().integer().min(2000).required(),

  fromDate: Joi.date().required(),

  toDate: Joi.date().required(),

  paymentDate: Joi.date().allow(null),

  remarks: Joi.string().trim().allow("", null),
});

export const updatePayrollStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PAYROLL_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});

/* ================= PAYSLIP ================= */

export const updatePayslipStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PAYSLIP_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});