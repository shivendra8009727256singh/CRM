import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  employeeFamilySchema,
  employeeBankSchema,
  employeeStatutorySchema,
  employeeDocumentSchema,
} from "../validators/employee.validator.js";

import {
  createEmployeeService,
  getEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService,
  updateEmployeeStatusService,
  deleteEmployeeService,

  upsertEmployeeFamilyService,
  getEmployeeFamilyService,

  upsertEmployeeBankService,
  getEmployeeBankService,

  upsertEmployeeStatutoryService,
  getEmployeeStatutoryService,

  upsertEmployeeDocumentsService,
  getEmployeeDocumentsService,

  getEmployeeDashboardService,
} from "../services/employee.service.js";

/* ---------------- Employee Core ---------------- */

export const createEmployee = asyncHandler(async (req, res) => {
  const { value, error } = createEmployeeSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await createEmployeeService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, employee, "Employee created successfully"));
});

export const getEmployees = asyncHandler(async (req, res) => {
  const employees = await getEmployeesService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, employees, "Employees fetched successfully"));
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByIdService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee fetched successfully"));
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { value, error } = updateEmployeeSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await updateEmployeeService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee updated successfully"));
});

export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateEmployeeStatusSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await updateEmployeeStatusService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee status updated successfully"));
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  await deleteEmployeeService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Employee deleted successfully"));
});

/* ---------------- Family ---------------- */

export const upsertEmployeeFamily = asyncHandler(async (req, res) => {
  const { value, error } = employeeFamilySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const family = await upsertEmployeeFamilyService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, family, "Employee family updated successfully"));
});

export const getEmployeeFamily = asyncHandler(async (req, res) => {
  const family = await getEmployeeFamilyService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, family, "Employee family fetched successfully"));
});

/* ---------------- Bank ---------------- */

export const upsertEmployeeBank = asyncHandler(async (req, res) => {
  const { value, error } = employeeBankSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const bank = await upsertEmployeeBankService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, bank, "Employee bank details updated successfully"));
});

export const getEmployeeBank = asyncHandler(async (req, res) => {
  const bank = await getEmployeeBankService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, bank, "Employee bank details fetched successfully"));
});

/* ---------------- Statutory ---------------- */

export const upsertEmployeeStatutory = asyncHandler(async (req, res) => {
  const { value, error } = employeeStatutorySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const statutory = await upsertEmployeeStatutoryService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, statutory, "Employee statutory details updated successfully")
    );
});

export const getEmployeeStatutory = asyncHandler(async (req, res) => {
  const statutory = await getEmployeeStatutoryService(req.user, req.params.id);

  res
    .status(200)
    .json(
      new ApiResponse(200, statutory, "Employee statutory details fetched successfully")
    );
});

/* ---------------- Documents ---------------- */

export const upsertEmployeeDocuments = asyncHandler(async (req, res) => {
  const { value, error } = employeeDocumentSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const documents = await upsertEmployeeDocumentsService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, documents, "Employee documents updated successfully"));
});

export const getEmployeeDocuments = asyncHandler(async (req, res) => {
  const documents = await getEmployeeDocumentsService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, documents, "Employee documents fetched successfully"));
});

/* ---------------- Dashboard ---------------- */

export const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getEmployeeDashboardService(req.user);

  res
    .status(200)
    .json(new ApiResponse(200, dashboard, "Employee dashboard fetched successfully"));
});