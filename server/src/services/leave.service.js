import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { LEAVE_REQUEST_STATUS, LEAVE_DAY_TYPE } from "../models/LeaveRequest.js";

import {
  findEmployeeById,
  findEmployeeByCode,
} from "../repositories/employee.repository.js";

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

const resolveEmployee = async (companyId, payloadOrCode) => {
  let employeeId = null;
  let employeeCode = null;

  if (typeof payloadOrCode === "string") {
    employeeCode = payloadOrCode;
  } else {
    employeeId = payloadOrCode.employeeId || payloadOrCode.approverEmployeeId;
    employeeCode =
      payloadOrCode.employeeCode || payloadOrCode.approverEmployeeCode;
  }

  let employee = null;

  if (employeeId) {
    employee = await findEmployeeById(employeeId);
  }

  if (!employee && employeeCode) {
    employee = await findEmployeeByCode(companyId, employeeCode);
  }

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

const resolveLeaveType = async (companyId, payload = {}) => {
  const leaveTypeId = payload.leaveTypeId;
  const leaveTypeCode = payload.leaveTypeCode || payload.leaveCode;

  let leaveType = null;

  if (leaveTypeId) {
    leaveType = await findLeaveTypeById(leaveTypeId);
  }

  if (!leaveType && leaveTypeCode) {
    leaveType = await findLeaveTypeByCode(companyId, leaveTypeCode);
  }

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  return leaveType;
};

const resolveLeavePolicy = async (companyId, payload = {}) => {
  const leavePolicyId = payload.leavePolicyId;
  const leavePolicyCode = payload.leavePolicyCode || payload.policyCode;

  if (!leavePolicyId && !leavePolicyCode) return null;

  let leavePolicy = null;

  if (leavePolicyId) {
    leavePolicy = await findLeavePolicyById(leavePolicyId);
  }

  if (!leavePolicy && leavePolicyCode) {
    leavePolicy = await findLeavePolicyByCode(companyId, leavePolicyCode);
  }

  ensureSameCompany(companyId, leavePolicy, "Leave policy not found.");

  return leavePolicy;
};

const normalizePolicyRules = async (companyId, rules = []) => {
  const normalizedRules = [];

  for (const rule of rules) {
    const leaveType = await resolveLeaveType(companyId, rule);

    normalizedRules.push({
      ...rule,
      leaveTypeId: leaveType._id,
      leaveTypeCode: undefined,
      leaveCode: undefined,
    });
  }

  return normalizedRules;
};

const normalizeApprovalLevels = async (companyId, approvalLevels = []) => {
  const normalizedLevels = [];

  for (const level of approvalLevels) {
    let approverEmployeeId = level.approverEmployeeId || null;

    if (level.approverType === "specific_employee") {
      if (!approverEmployeeId && level.approverEmployeeCode) {
        const employee = await resolveEmployee(companyId, {
          employeeCode: level.approverEmployeeCode,
        });

        approverEmployeeId = employee._id;
      }

      if (!approverEmployeeId) {
        throw new ApiError(
          400,
          "approverEmployeeId or approverEmployeeCode is required for specific employee approver."
        );
      }
    }

    normalizedLevels.push({
      ...level,
      approverEmployeeId,
      approverEmployeeCode: undefined,
    });
  }

  return normalizedLevels;
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

  const rules = await normalizePolicyRules(companyId, payload.rules || []);
  const approvalLevels = await normalizeApprovalLevels(
    companyId,
    payload.approvalLevels || []
  );

  return createLeavePolicyRecord({
    ...payload,
    rules,
    approvalLevels,
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

  const updatePayload = { ...payload };

  if (payload.rules) {
    updatePayload.rules = await normalizePolicyRules(companyId, payload.rules);
  }

  if (payload.approvalLevels) {
    updatePayload.approvalLevels = await normalizeApprovalLevels(
      companyId,
      payload.approvalLevels
    );
  }

  return updateLeavePolicyById(id, {
    ...updatePayload,
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

  const employee = await resolveEmployee(companyId, payload);
  const leaveType = await resolveLeaveType(companyId, payload);
  const leavePolicy = await resolveLeavePolicy(companyId, payload);

  const employeeId = employee._id;
  const leaveTypeId = leaveType._id;
  const leavePolicyId = leavePolicy?._id || null;

  const exists = await findLeaveBalance({
    companyId,
    employeeId,
    leaveTypeId,
    year: payload.year,
  });

  if (exists) {
    throw new ApiError(409, "Leave balance already exists.");
  }

  const availableBalance =
    payload.availableBalance ??
    payload.openingBalance +
      payload.credited +
      payload.carryForward -
      payload.availed;

  return createLeaveBalanceRecord({
    ...payload,
    employeeId,
    leaveTypeId,
    leavePolicyId,
    employeeCode: undefined,
    leaveTypeCode: undefined,
    leaveCode: undefined,
    leavePolicyCode: undefined,
    policyCode: undefined,
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

  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (query.employeeCode) {
    const employee = await resolveEmployee(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  if (query.leaveTypeCode || query.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, {
      leaveTypeCode: query.leaveTypeCode,
      leaveCode: query.leaveCode,
    });

    filter.leaveTypeId = leaveType._id;
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

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

  const updatePayload = { ...payload };

  if (payload.employeeId || payload.employeeCode) {
    const employee = await resolveEmployee(companyId, payload);
    updatePayload.employeeId = employee._id;
  }

  if (payload.leaveTypeId || payload.leaveTypeCode || payload.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, payload);
    updatePayload.leaveTypeId = leaveType._id;
  }

  if (payload.leavePolicyId || payload.leavePolicyCode || payload.policyCode) {
    const leavePolicy = await resolveLeavePolicy(companyId, payload);
    updatePayload.leavePolicyId = leavePolicy?._id || null;
  }

  delete updatePayload.employeeCode;
  delete updatePayload.leaveTypeCode;
  delete updatePayload.leaveCode;
  delete updatePayload.leavePolicyCode;
  delete updatePayload.policyCode;

  return updateLeaveBalanceById(id, {
    ...updatePayload,
    updatedBy: currentUser._id,
  });
};

/* ================= LEAVE REQUEST ================= */

export const applyLeaveService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployee(companyId, payload);
  const leaveType = await resolveLeaveType(companyId, payload);
  const leavePolicy = await resolveLeavePolicy(companyId, payload);

  const employeeId = employee._id;
  const leaveTypeId = leaveType._id;
  const leavePolicyId = leavePolicy?._id || null;

  const totalDays = calculateLeaveDays(
    payload.fromDate,
    payload.toDate,
    payload.dayType
  );

  const year = new Date(payload.fromDate).getFullYear();

  const balance = await findLeaveBalance({
    companyId,
    employeeId,
    leaveTypeId,
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
    employeeId,
    leaveTypeId,
    leavePolicyId,
    employeeCode: undefined,
    leaveTypeCode: undefined,
    leaveCode: undefined,
    leavePolicyCode: undefined,
    policyCode: undefined,
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

  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (query.employeeCode) {
    const employee = await resolveEmployee(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  if (query.leaveTypeCode || query.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, {
      leaveTypeCode: query.leaveTypeCode,
      leaveCode: query.leaveCode,
    });

    filter.leaveTypeId = leaveType._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

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