import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createShiftSchema,
  updateShiftSchema,
  createAttendancePolicySchema,
  updateAttendancePolicySchema,
  checkInSchema,
  checkOutSchema,
  manualAttendanceSchema,
  updateAttendanceStatusSchema,
  createRegularizationSchema,
  updateRegularizationStatusSchema,
} from "../validators/attendance.validator.js";

import {
  createShiftService,
  getShiftsService,
  updateShiftService,
  deleteShiftService,

  createAttendancePolicyService,
  getAttendancePoliciesService,
  updateAttendancePolicyService,
  deleteAttendancePolicyService,

  checkInService,
  checkOutService,
  manualAttendanceService,
  getAttendanceService,
  updateAttendanceStatusService,

  createRegularizationService,
  getRegularizationsService,
  updateRegularizationStatusService,

  getAttendanceDashboardService,
  getMonthlyAttendanceService,
} from "../services/attendance.service.js";

/* ================= SHIFT ================= */

export const createShift = asyncHandler(async (req, res) => {
  const { value, error } = createShiftSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createShiftService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Shift created successfully"));
});

export const getShifts = asyncHandler(async (req, res) => {
  const data = await getShiftsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Shifts fetched successfully"));
});

export const updateShift = asyncHandler(async (req, res) => {
  const { value, error } = updateShiftSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateShiftService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Shift updated successfully"));
});

export const deleteShift = asyncHandler(async (req, res) => {
  await deleteShiftService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Shift deleted successfully"));
});

/* ================= ATTENDANCE POLICY ================= */

export const createAttendancePolicy = asyncHandler(async (req, res) => {
  const { value, error } = createAttendancePolicySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createAttendancePolicyService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Attendance policy created successfully"));
});

export const getAttendancePolicies = asyncHandler(async (req, res) => {
  const data = await getAttendancePoliciesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Attendance policies fetched successfully"));
});

export const updateAttendancePolicy = asyncHandler(async (req, res) => {
  const { value, error } = updateAttendancePolicySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateAttendancePolicyService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Attendance policy updated successfully"));
});

export const deleteAttendancePolicy = asyncHandler(async (req, res) => {
  await deleteAttendancePolicyService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Attendance policy deleted successfully"));
});

/* ================= ATTENDANCE ================= */

export const checkIn = asyncHandler(async (req, res) => {
  const { value, error } = checkInSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await checkInService(req.user, value);

  res.status(200).json(new ApiResponse(200, data, "Check-in successful"));
});

export const checkOut = asyncHandler(async (req, res) => {
  const { value, error } = checkOutSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await checkOutService(req.user, value);

  res.status(200).json(new ApiResponse(200, data, "Check-out successful"));
});

export const markManualAttendance = asyncHandler(async (req, res) => {
  const { value, error } = manualAttendanceSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await manualAttendanceService(req.user, value);

  res.status(200).json(new ApiResponse(200, data, "Attendance marked successfully"));
});

export const getAttendance = asyncHandler(async (req, res) => {
  const data = await getAttendanceService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Attendance fetched successfully"));
});

export const updateAttendanceStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateAttendanceStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateAttendanceStatusService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Attendance status updated successfully"));
});

/* ================= REGULARIZATION ================= */

export const createRegularization = asyncHandler(async (req, res) => {
  const { value, error } = createRegularizationSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createRegularizationService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Regularization request created successfully"));
});

export const getRegularizations = asyncHandler(async (req, res) => {
  const data = await getRegularizationsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Regularization requests fetched successfully"));
});

export const updateRegularizationStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateRegularizationStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateRegularizationStatusService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Regularization status updated successfully"));
});

/* ================= DASHBOARD / REPORT ================= */

export const getAttendanceDashboard = asyncHandler(async (req, res) => {
  const data = await getAttendanceDashboardService(req.user);

  res.status(200).json(new ApiResponse(200, data, "Attendance dashboard fetched successfully"));
});

export const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const data = await getMonthlyAttendanceService(
    req.user,
    req.params.employeeId,
    req.query
  );

  res.status(200).json(new ApiResponse(200, data, "Monthly attendance fetched successfully"));
});