import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { ATTENDANCE_STATUS, CHECKIN_SOURCE } from "../models/Attendance.js";
import { REGULARIZATION_STATUS } from "../models/AttendanceRegularization.js";

import { findEmployeeByCode } from "../repositories/employee.repository.js";

import {
  createShiftRecord,
  findShiftById,
  findShiftByCode,
  listShifts,
  updateShiftById,
  deleteShiftById,

  createAttendancePolicyRecord,
  findAttendancePolicyById,
  findAttendancePolicyByCode,
  listAttendancePolicies,
  updateAttendancePolicyById,
  deleteAttendancePolicyById,

  createAttendanceRecord,
  findAttendanceById,
  findAttendanceByEmployeeAndDate,
  updateAttendanceById,
  listAttendance,

  createRegularizationRecord,
  findRegularizationById,
  updateRegularizationById,
  listRegularizations,

  countAttendance,
  todayAttendanceSummary,
  monthlyAttendanceSummary,
} from "../repositories/attendance.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canManageAttendance = (currentUser) => {
  return [ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role);
};

const ensureManageAccess = (currentUser) => {
  if (!canManageAttendance(currentUser)) {
    throw new ApiError(403, "You are not allowed to manage attendance.");
  }
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const normalizeCode = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim().toUpperCase();
};

const normalizeDate = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const calculateMinutes = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60000));
};

const calculateAttendanceStatus = ({
  checkInTime,
  checkOutTime,
  shift,
  policy,
}) => {
  const totalWorkMinutes = calculateMinutes(checkInTime, checkOutTime);

  let lateByMinutes = 0;
  let overtimeMinutes = 0;
  let isLate = false;
  let isHalfDay = false;
  let status = ATTENDANCE_STATUS.PRESENT;

  if (shift?.startTime && checkInTime) {
    const date = new Date(checkInTime);
    const [h, m] = shift.startTime.split(":").map(Number);

    const shiftStart = new Date(date);
    shiftStart.setHours(h || 0, m || 0, 0, 0);

    const graceMinutes = policy?.graceMinutes ?? shift?.graceMinutes ?? 0;
    const lateLimit = new Date(shiftStart.getTime() + graceMinutes * 60000);

    if (new Date(checkInTime) > lateLimit) {
      lateByMinutes = calculateMinutes(lateLimit, checkInTime);
      isLate = true;
      status = ATTENDANCE_STATUS.LATE;
    }
  }

  const halfDayAfterMinutes =
    policy?.halfDayAfterMinutes ?? shift?.halfDayAfterMinutes ?? 240;

  const fullDayMinutes = shift?.fullDayMinutes ?? 480;

  if (checkOutTime && totalWorkMinutes < halfDayAfterMinutes) {
    isHalfDay = true;
    status = ATTENDANCE_STATUS.HALF_DAY;
  }

  if (checkOutTime && totalWorkMinutes > fullDayMinutes) {
    overtimeMinutes = totalWorkMinutes - fullDayMinutes;
  }

  return {
    totalWorkMinutes,
    lateByMinutes,
    overtimeMinutes,
    isLate,
    isHalfDay,
    status,
  };
};

const resolveEmployeeByCode = async (companyId, employeeCode) => {
  const normalizedEmployeeCode = normalizeCode(employeeCode);

  if (!normalizedEmployeeCode) {
    throw new ApiError(400, "Employee code is required.");
  }

  const employee = await findEmployeeByCode(companyId, normalizedEmployeeCode);

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

const resolveShiftByCode = async (companyId, payload = {}) => {
  const shiftCode = normalizeCode(payload.shiftCode);

  if (!shiftCode) return null;

  const shift = await findShiftByCode(companyId, shiftCode);

  ensureSameCompany(companyId, shift, "Shift not found.");

  return shift;
};

const resolvePolicyByCode = async (companyId, payload = {}) => {
  const policyCode = normalizeCode(
    payload.attendancePolicyCode || payload.policyCode
  );

  if (!policyCode) return null;

  const policy = await findAttendancePolicyByCode(companyId, policyCode);

  ensureSameCompany(companyId, policy, "Attendance policy not found.");

  return policy;
};

/* ================= SHIFT ================= */

export const createShiftService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const shiftCode = normalizeCode(payload.shiftCode);

  const exists = await findShiftByCode(companyId, shiftCode);

  if (exists) {
    throw new ApiError(409, "Shift code already exists.");
  }

  return createShiftRecord({
    ...payload,
    shiftCode,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getShiftsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.$or = [
      { shiftName: { $regex: query.search, $options: "i" } },
      { shiftCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listShifts({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateShiftService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const shift = await findShiftById(id);

  ensureSameCompany(companyId, shift, "Shift not found.");

  const updatePayload = {
    ...payload,
    updatedBy: currentUser._id,
  };

  if (payload.shiftCode) {
    updatePayload.shiftCode = normalizeCode(payload.shiftCode);
  }

  return updateShiftById(id, updatePayload);
};

export const deleteShiftService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const shift = await findShiftById(id);

  ensureSameCompany(companyId, shift, "Shift not found.");

  await deleteShiftById(id);
  return true;
};

/* ================= POLICY ================= */

export const createAttendancePolicyService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policyCode = normalizeCode(payload.policyCode);

  const exists = await findAttendancePolicyByCode(companyId, policyCode);

  if (exists) {
    throw new ApiError(409, "Attendance policy code already exists.");
  }

  return createAttendancePolicyRecord({
    ...payload,
    policyCode,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getAttendancePoliciesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.$or = [
      { policyName: { $regex: query.search, $options: "i" } },
      { policyCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listAttendancePolicies({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateAttendancePolicyService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findAttendancePolicyById(id);

  ensureSameCompany(companyId, policy, "Attendance policy not found.");

  const updatePayload = {
    ...payload,
    updatedBy: currentUser._id,
  };

  if (payload.policyCode) {
    updatePayload.policyCode = normalizeCode(payload.policyCode);
  }

  return updateAttendancePolicyById(id, updatePayload);
};

export const deleteAttendancePolicyService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findAttendancePolicyById(id);

  ensureSameCompany(companyId, policy, "Attendance policy not found.");

  await deleteAttendancePolicyById(id);
  return true;
};

/* ================= ATTENDANCE ================= */

export const checkInService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployeeByCode(companyId, payload.employeeCode);
  const shift = await resolveShiftByCode(companyId, payload);
  const policy = await resolvePolicyByCode(companyId, payload);

  const employeeId = employee._id;
  const shiftId = shift?._id || null;
  const attendancePolicyId = policy?._id || null;

  const attendanceDate = normalizeDate(payload.attendanceDate);
  const checkInTime = payload.checkInTime || new Date();

  const existing = await findAttendanceByEmployeeAndDate(
    companyId,
    employeeId,
    attendanceDate
  );

  if (existing?.checkInTime) {
    throw new ApiError(409, "Employee already checked in for this date.");
  }

  if (existing) {
    return updateAttendanceById(existing._id, {
      checkInTime,
      checkInSource: payload.checkInSource || CHECKIN_SOURCE.WEB,
      checkInLocation: payload.checkInLocation || {},
      checkInSelfie: payload.checkInSelfie || "",
      shiftId: shiftId || existing.shiftId,
      attendancePolicyId: attendancePolicyId || existing.attendancePolicyId,
      status: ATTENDANCE_STATUS.PRESENT,
      remarks: payload.remarks || existing.remarks,
      updatedBy: currentUser._id,
    });
  }

  const result = calculateAttendanceStatus({
    checkInTime,
    checkOutTime: null,
    shift,
    policy,
  });

  return createAttendanceRecord({
    companyId,
    employeeId,
    attendanceDate,
    shiftId,
    attendancePolicyId,
    checkInTime,
    checkInSource: payload.checkInSource || CHECKIN_SOURCE.WEB,
    checkInLocation: payload.checkInLocation || {},
    checkInSelfie: payload.checkInSelfie || "",
    status: result.status,
    isLate: result.isLate,
    lateByMinutes: result.lateByMinutes,
    remarks: payload.remarks || "",
    createdBy: currentUser._id,
  });
};

export const checkOutService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployeeByCode(companyId, payload.employeeCode);
  const employeeId = employee._id;

  const attendanceDate = normalizeDate(payload.attendanceDate);

  const attendance = await findAttendanceByEmployeeAndDate(
    companyId,
    employeeId,
    attendanceDate
  );

  if (!attendance) {
    throw new ApiError(404, "Check-in record not found.");
  }

  if (attendance.checkOutTime) {
    throw new ApiError(409, "Employee already checked out for this date.");
  }

  const shift = attendance.shiftId
    ? await findShiftById(attendance.shiftId)
    : null;

  const policy = attendance.attendancePolicyId
    ? await findAttendancePolicyById(attendance.attendancePolicyId)
    : null;

  const checkOutTime = payload.checkOutTime || new Date();

  const result = calculateAttendanceStatus({
    checkInTime: attendance.checkInTime,
    checkOutTime,
    shift,
    policy,
  });

  return updateAttendanceById(attendance._id, {
    checkOutTime,
    checkOutSource: payload.checkOutSource || CHECKIN_SOURCE.WEB,
    checkOutLocation: payload.checkOutLocation || {},
    checkOutSelfie: payload.checkOutSelfie || "",
    totalWorkMinutes: result.totalWorkMinutes,
    overtimeMinutes: result.overtimeMinutes,
    lateByMinutes: result.lateByMinutes,
    isLate: result.isLate,
    isHalfDay: result.isHalfDay,
    status: result.status,
    remarks: payload.remarks || attendance.remarks,
    updatedBy: currentUser._id,
  });
};

export const manualAttendanceService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployeeByCode(companyId, payload.employeeCode);
  const shift = await resolveShiftByCode(companyId, payload);
  const policy = await resolvePolicyByCode(companyId, payload);

  const employeeId = employee._id;
  const shiftId = shift?._id || null;
  const attendancePolicyId = policy?._id || null;

  const attendanceDate = normalizeDate(payload.attendanceDate);

  const existing = await findAttendanceByEmployeeAndDate(
    companyId,
    employeeId,
    attendanceDate
  );

  const attendancePayload = {
    employeeId,
    attendanceDate,
    shiftId,
    attendancePolicyId,
    checkInTime: payload.checkInTime || null,
    checkOutTime: payload.checkOutTime || null,
    totalWorkMinutes: payload.totalWorkMinutes || 0,
    breakMinutes: payload.breakMinutes || 0,
    overtimeMinutes: payload.overtimeMinutes || 0,
    lateByMinutes: payload.lateByMinutes || 0,
    earlyCheckoutMinutes: payload.earlyCheckoutMinutes || 0,
    status: payload.status,
    remarks: payload.remarks || "",
    checkInSource: CHECKIN_SOURCE.MANUAL,
    checkOutSource: CHECKIN_SOURCE.MANUAL,
  };

  if (existing) {
    return updateAttendanceById(existing._id, {
      ...attendancePayload,
      updatedBy: currentUser._id,
    });
  }

  return createAttendanceRecord({
    ...attendancePayload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getAttendanceService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeByCode(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    filter.attendanceDate = {};
    if (query.from) filter.attendanceDate.$gte = normalizeDate(query.from);
    if (query.to) filter.attendanceDate.$lte = normalizeDate(query.to);
  }

  return listAttendance({
    filter,
    page,
    limit,
    sort: { attendanceDate: -1 },
  });
};

export const updateAttendanceStatusService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const attendance = await findAttendanceById(id);

  ensureSameCompany(companyId, attendance, "Attendance record not found.");

  return updateAttendanceById(id, {
    status: payload.status,
    remarks: payload.remarks || attendance.remarks,
    updatedBy: currentUser._id,
  });
};

/* ================= REGULARIZATION ================= */

export const createRegularizationService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployeeByCode(companyId, payload.employeeCode);
  const attendanceDate = normalizeDate(payload.attendanceDate);

  const attendance = await findAttendanceByEmployeeAndDate(
    companyId,
    employee._id,
    attendanceDate
  );

  ensureSameCompany(companyId, attendance, "Attendance record not found.");

  return createRegularizationRecord({
    companyId,
    employeeId: attendance.employeeId,
    attendanceId: attendance._id,
    attendanceDate: attendance.attendanceDate,
    requestedCheckIn: payload.requestedCheckIn || null,
    requestedCheckOut: payload.requestedCheckOut || null,
    reason: payload.reason,
    attachment: payload.attachment || "",
    employeeRemarks: payload.employeeRemarks || "",
    createdBy: currentUser._id,
  });
};

export const getRegularizationsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeByCode(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  return listRegularizations({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateRegularizationStatusService = async (
  currentUser,
  id,
  payload
) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const regularization = await findRegularizationById(id);

  ensureSameCompany(
    companyId,
    regularization,
    "Regularization request not found."
  );

  const updatePayload = {
    status: payload.status,
    managerRemarks: payload.managerRemarks || "",
    updatedBy: currentUser._id,
  };

  if (payload.status === REGULARIZATION_STATUS.APPROVED) {
    updatePayload.approvedBy = currentUser._id;
    updatePayload.approvedAt = new Date();

    const attendanceUpdate = {
      isRegularized: true,
      regularizationId: regularization._id,
      updatedBy: currentUser._id,
    };

    if (regularization.requestedCheckIn) {
      attendanceUpdate.checkInTime = regularization.requestedCheckIn;
    }

    if (regularization.requestedCheckOut) {
      attendanceUpdate.checkOutTime = regularization.requestedCheckOut;
    }

    await updateAttendanceById(regularization.attendanceId, attendanceUpdate);
  }

  if (payload.status === REGULARIZATION_STATUS.REJECTED) {
    updatePayload.rejectedBy = currentUser._id;
    updatePayload.rejectedAt = new Date();
  }

  return updateRegularizationById(id, updatePayload);
};

/* ================= DASHBOARD / REPORT ================= */

export const getAttendanceDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);
  const today = normalizeDate(new Date());

  const [present, absent, late, halfDay, onLeave, summary] = await Promise.all([
    countAttendance({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.PRESENT,
    }),
    countAttendance({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.ABSENT,
    }),
    countAttendance({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.LATE,
    }),
    countAttendance({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.HALF_DAY,
    }),
    countAttendance({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.ON_LEAVE,
    }),
    todayAttendanceSummary(companyId, today),
  ]);

  return {
    date: today,
    present,
    absent,
    late,
    halfDay,
    onLeave,
    summary,
  };
};

export const getMonthlyAttendanceService = async (
  currentUser,
  employeeCode,
  query = {}
) => {
  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployeeByCode(companyId, employeeCode);

  const now = new Date();
  const year = Number(query.year || now.getFullYear());
  const month = Number(query.month || now.getMonth() + 1);

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  to.setHours(23, 59, 59, 999);

  const records = await monthlyAttendanceSummary(
    companyId,
    employee._id,
    from,
    to
  );

  return {
    employeeCode: employee.employeeCode,
    employeeName: employee.displayName,
    year,
    month,
    records,
    totalPresent: records.filter((x) => x.status === ATTENDANCE_STATUS.PRESENT)
      .length,
    totalAbsent: records.filter((x) => x.status === ATTENDANCE_STATUS.ABSENT)
      .length,
    totalLate: records.filter((x) => x.status === ATTENDANCE_STATUS.LATE)
      .length,
    totalHalfDay: records.filter((x) => x.status === ATTENDANCE_STATUS.HALF_DAY)
      .length,
    totalOnLeave: records.filter((x) => x.status === ATTENDANCE_STATUS.ON_LEAVE)
      .length,
    totalWorkMinutes: records.reduce(
      (sum, x) => sum + (x.totalWorkMinutes || 0),
      0
    ),
    totalOvertimeMinutes: records.reduce(
      (sum, x) => sum + (x.overtimeMinutes || 0),
      0
    ),
  };
};