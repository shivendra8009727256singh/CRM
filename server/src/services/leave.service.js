import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { LEAVE_REQUEST_STATUS, LEAVE_DAY_TYPE } from "../models/LeaveRequest.js";

import { findEmployeeById } from "../repositories/employee.repository.js";

import {
  createLeaveTypeRecord,
  findLeaveTypeById,
  findLeaveTypeByCode,
  listLeaveTypes,
  updateLeaveTypeById,
  deleteLeaveTypeById,

  createLeavePolicyRecord,
  findLeavePolicyById,
  findLeavePolicyByCode,
  listLeavePolicies,
  updateLeavePolicyById,
  deleteLeavePolicyById,

  createLeaveBalanceRecord,
  findLeaveBalance,
  findLeaveBalanceById,
  updateLeaveBalanceById,
  listLeaveBalances,

  createLeaveRequestRecord,
  findLeaveRequestById,
  listLeaveRequests,
  updateLeaveRequestById,
  countLeaveRequests,
  getLeaveCalendar,
} from "../repositories/leave.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureLeaveAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage leave.");
  }
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const validateEmployee = async (companyId, employeeId) => {
  const employee = await findEmployeeById(employeeId);

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

const calculateLeaveDays = (fromDate, toDate, dayType) => {
  if (dayType !== LEAVE_DAY_TYPE.FULL_DAY) return 0.5;

  const from = new Date(fromDate);
  const to = new Date(toDate);

  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;

  if (diff <= 0) {
    throw new ApiError(400, "Invalid leave date range.");
  }

  return diff;
};

/* ================= LEAVE TYPE ================= */

export const createLeaveTypeService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findLeaveTypeByCode(companyId, payload.leaveCode);

  if (exists) {
    throw new ApiError(409, "Leave type code already exists.");
  }

  return createLeaveTypeRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getLeaveTypesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.category) filter.category = query.category;

  if (query.search) {
    filter.$or = [
      { leaveName: { $regex: query.search, $options: "i" } },
      { leaveCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listLeaveTypes({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeaveTypeService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const leaveType = await findLeaveTypeById(id);

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  return updateLeaveTypeById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteLeaveTypeService = async (currentUser, id) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const leaveType = await findLeaveTypeById(id);

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  await deleteLeaveTypeById(id);
  return true;
};

/* ================= LEAVE POLICY ================= */

export const createLeavePolicyService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findLeavePolicyByCode(companyId, payload.policyCode);

  if (exists) {
    throw new ApiError(409, "Leave policy code already exists.");
  }

  for (const rule of payload.rules || []) {
    const leaveType = await findLeaveTypeById(rule.leaveTypeId);
    ensureSameCompany(companyId, leaveType, "Invalid leave type in policy.");
  }

  return createLeavePolicyRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getLeavePoliciesService = async (currentUser, query = {}) => {
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

  return listLeavePolicies({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeavePolicyService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findLeavePolicyById(id);

  ensureSameCompany(companyId, policy, "Leave policy not found.");

  return updateLeavePolicyById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteLeavePolicyService = async (currentUser, id) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findLeavePolicyById(id);

  ensureSameCompany(companyId, policy, "Leave policy not found.");

  await deleteLeavePolicyById(id);
  return true;
};

/* ================= LEAVE BALANCE ================= */

export const createLeaveBalanceService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  await validateEmployee(companyId, payload.employeeId);

  const leaveType = await findLeaveTypeById(payload.leaveTypeId);
  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  const exists = await findLeaveBalance({
    companyId,
    employeeId: payload.employeeId,
    leaveTypeId: payload.leaveTypeId,
    year: payload.year,
  });

  if (exists) {
    throw new ApiError(409, "Leave balance already exists.");
  }

  const availableBalance =
    payload.availableBalance ??
    payload.openingBalance + payload.credited + payload.carryForward - payload.availed;

  return createLeaveBalanceRecord({
    ...payload,
    companyId,
    availableBalance,
    createdBy: currentUser._id,
  });
};

export const getLeaveBalancesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.leaveTypeId) filter.leaveTypeId = query.leaveTypeId;
  if (query.year) filter.year = Number(query.year);

  return listLeaveBalances({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeaveBalanceService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const balance = await findLeaveBalanceById(id);

  ensureSameCompany(companyId, balance, "Leave balance not found.");

  return updateLeaveBalanceById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

/* ================= LEAVE REQUEST ================= */

export const applyLeaveService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  await validateEmployee(companyId, payload.employeeId);

  const leaveType = await findLeaveTypeById(payload.leaveTypeId);
  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  const totalDays = calculateLeaveDays(
    payload.fromDate,
    payload.toDate,
    payload.dayType
  );

  const year = new Date(payload.fromDate).getFullYear();

  const balance = await findLeaveBalance({
    companyId,
    employeeId: payload.employeeId,
    leaveTypeId: payload.leaveTypeId,
    year,
  });

  if (!balance) {
    throw new ApiError(400, "Leave balance not found.");
  }

  if (balance.availableBalance < totalDays && leaveType.paid) {
    throw new ApiError(400, "Insufficient leave balance.");
  }

  const leaveRequest = await createLeaveRequestRecord({
    ...payload,
    companyId,
    totalDays,
    status: LEAVE_REQUEST_STATUS.PENDING,
    createdBy: currentUser._id,
  });

  await updateLeaveBalanceById(balance._id, {
    pending: balance.pending + totalDays,
    availableBalance: Math.max(0, balance.availableBalance - totalDays),
    updatedBy: currentUser._id,
  });

  return leaveRequest;
};

export const getLeaveRequestsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.leaveTypeId) filter.leaveTypeId = query.leaveTypeId;
  if (query.status) filter.status = query.status;

  return listLeaveRequests({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeaveRequestStatusService = async (
  currentUser,
  id,
  payload
) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const request = await findLeaveRequestById(id);

  ensureSameCompany(companyId, request, "Leave request not found.");

  if (request.status !== LEAVE_REQUEST_STATUS.PENDING) {
    throw new ApiError(400, "Only pending leave requests can be updated.");
  }

  const year = new Date(request.fromDate).getFullYear();

  const balance = await findLeaveBalance({
    companyId,
    employeeId: request.employeeId,
    leaveTypeId: request.leaveTypeId,
    year,
  });

  if (!balance) {
    throw new ApiError(400, "Leave balance not found.");
  }

  const updatePayload = {
    status: payload.status,
    approverRemarks: payload.approverRemarks || "",
    updatedBy: currentUser._id,
  };

  const balanceUpdate = {
    pending: Math.max(0, balance.pending - request.totalDays),
    updatedBy: currentUser._id,
  };

  if (payload.status === LEAVE_REQUEST_STATUS.APPROVED) {
    updatePayload.approvedBy = currentUser._id;
    updatePayload.approvedAt = new Date();

    balanceUpdate.availed = balance.availed + request.totalDays;
  }

  if (payload.status === LEAVE_REQUEST_STATUS.REJECTED) {
    updatePayload.rejectedBy = currentUser._id;
    updatePayload.rejectedAt = new Date();

    balanceUpdate.rejected = balance.rejected + request.totalDays;
    balanceUpdate.availableBalance = balance.availableBalance + request.totalDays;
  }

  if (payload.status === LEAVE_REQUEST_STATUS.CANCELLED) {
    updatePayload.cancelledBy = currentUser._id;
    updatePayload.cancelledAt = new Date();
    updatePayload.cancellationReason = payload.cancellationReason || "";

    balanceUpdate.availableBalance = balance.availableBalance + request.totalDays;
  }

  await updateLeaveBalanceById(balance._id, balanceUpdate);

  return updateLeaveRequestById(id, updatePayload);
};

/* ================= DASHBOARD / CALENDAR ================= */

export const getLeaveCalendarService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date();

  return getLeaveCalendar({ companyId, from, to });
};

export const getLeaveDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [pending, approved, rejected, cancelled] = await Promise.all([
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.PENDING }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.APPROVED }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.REJECTED }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.CANCELLED }),
  ]);

  return {
    pending,
    approved,
    rejected,
    cancelled,
  };
};