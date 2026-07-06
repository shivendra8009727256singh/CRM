import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { EMPLOYEE_STATUS } from "../models/Employee.js";
import { Company } from "../models/Company.js";
import { findUserByEmail, findUserById } from "../repositories/user.repository.js";

import {
  createEmployeeRecord,
  findEmployeeById,
  findEmployeeByCode,
  findEmployeeByOfficialEmail,
  findEmployeeByMobile,
  findLastEmployeeByCompany,
  updateEmployeeById,
  softDeleteEmployeeById,
  listEmployees,

  findBranchById,
  findBranchByCode,
  findDepartmentById,
  findDepartmentByCode,
  findDesignationById,
  findDesignationByCode,
  findShiftById,
  findShiftByCode,
  findAttendancePolicyById,
  findAttendancePolicyByCode,
  findLeavePolicyById,
  findLeavePolicyByCode,
  findSalaryStructureById,
  findSalaryStructureByCode,

  upsertEmployeeFamily,
  findEmployeeFamily,

  upsertEmployeeBank,
  findEmployeeBank,

  upsertEmployeeStatutory,
  findEmployeeStatutory,

  upsertEmployeeDocuments,
  findEmployeeDocuments,

  countEmployees,
  getUpcomingBirthdays,
} from "../repositories/employee.repository.js";

const CODE_FIELDS = [
  "userEmail",
  "branchCode",
  "departmentCode",
  "designationCode",
  "reportingManagerCode",
  "shiftCode",
  "attendancePolicyCode",
  "leavePolicyCode",
  "salaryStructureCode",
];

const REFERENCE_ID_FIELDS = [
  "userId",
  "branchId",
  "departmentId",
  "designationId",
  "reportingManagerId",
  "shiftId",
  "attendancePolicyId",
  "leavePolicyId",
  "salaryStructureId",
];

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canManageHR = (currentUser) => {
  return [ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role);
};

const ensureManageAccess = (currentUser) => {
  if (!canManageHR(currentUser)) {
    throw new ApiError(403, "You are not allowed to manage employees.");
  }
};

const ensureSameCompany = (currentUser, employee) => {
  const userCompanyId = getCompanyId(currentUser).toString();
  const employeeCompanyId = employee.companyId.toString();

  if (userCompanyId !== employeeCompanyId) {
    throw new ApiError(403, "You cannot access another company's employee.");
  }
};

const normalizeCode = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim().toUpperCase();
};

const normalizeOptionalId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const removeHelperFields = (payload) => {
  const clean = { ...payload };

  for (const field of CODE_FIELDS) {
    delete clean[field];
  }

  return clean;
};

const ensureDocumentCompany = (document, companyId, message) => {
  if (!document || document.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }
};

const resolveUserReference = async (companyId, payload) => {
  const userId = normalizeOptionalId(payload.userId);
  const userEmail = payload.userEmail?.trim().toLowerCase();

  if (!userId && !userEmail) {
    payload.userId = null;
    return;
  }

  const user = userEmail ? await findUserByEmail(userEmail) : await findUserById(userId);

  if (!user || !user.companyId || user.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, "Invalid user for this company.");
  }

  payload.userId = user._id;
};

const resolveEmployeeReferences = async (companyId, payload) => {
  const resolved = { ...payload };

  await resolveUserReference(companyId, resolved);

  const branchId = normalizeOptionalId(resolved.branchId);
  const branchCode = normalizeCode(resolved.branchCode);
  if (branchId || branchCode) {
    const branch = branchCode
      ? await findBranchByCode(companyId, branchCode)
      : await findBranchById(branchId);

    ensureDocumentCompany(branch, companyId, "Invalid branch for this company.");
    resolved.branchId = branch._id;
  } else {
    resolved.branchId = null;
  }

  const departmentId = normalizeOptionalId(resolved.departmentId);
  const departmentCode = normalizeCode(resolved.departmentCode);
  if (departmentId || departmentCode) {
    const department = departmentCode
      ? await findDepartmentByCode(companyId, departmentCode)
      : await findDepartmentById(departmentId);

    ensureDocumentCompany(department, companyId, "Invalid department for this company.");
    resolved.departmentId = department._id;
  } else {
    resolved.departmentId = null;
  }

  const designationId = normalizeOptionalId(resolved.designationId);
  const designationCode = normalizeCode(resolved.designationCode);
  if (designationId || designationCode) {
    const designation = designationCode
      ? await findDesignationByCode(companyId, designationCode)
      : await findDesignationById(designationId);

    ensureDocumentCompany(designation, companyId, "Invalid designation for this company.");
    resolved.designationId = designation._id;
  } else {
    resolved.designationId = null;
  }

  const reportingManagerId = normalizeOptionalId(resolved.reportingManagerId);
  const reportingManagerCode = normalizeCode(resolved.reportingManagerCode);
  if (reportingManagerId || reportingManagerCode) {
    const manager = reportingManagerCode
      ? await findEmployeeByCode(companyId, reportingManagerCode)
      : await findEmployeeById(reportingManagerId);

    ensureDocumentCompany(manager, companyId, "Invalid reporting manager for this company.");
    resolved.reportingManagerId = manager._id;
  } else {
    resolved.reportingManagerId = null;
  }

  const shiftId = normalizeOptionalId(resolved.shiftId);
  const shiftCode = normalizeCode(resolved.shiftCode);
  if (shiftId || shiftCode) {
    const shift = shiftCode
      ? await findShiftByCode(companyId, shiftCode)
      : await findShiftById(shiftId);

    ensureDocumentCompany(shift, companyId, "Invalid shift for this company.");
    resolved.shiftId = shift._id;
  } else {
    resolved.shiftId = null;
  }

  const attendancePolicyId = normalizeOptionalId(resolved.attendancePolicyId);
  const attendancePolicyCode = normalizeCode(resolved.attendancePolicyCode);
  if (attendancePolicyId || attendancePolicyCode) {
    const attendancePolicy = attendancePolicyCode
      ? await findAttendancePolicyByCode(companyId, attendancePolicyCode)
      : await findAttendancePolicyById(attendancePolicyId);

    ensureDocumentCompany(attendancePolicy, companyId, "Invalid attendance policy for this company.");
    resolved.attendancePolicyId = attendancePolicy._id;
  } else {
    resolved.attendancePolicyId = null;
  }

  const leavePolicyId = normalizeOptionalId(resolved.leavePolicyId);
  const leavePolicyCode = normalizeCode(resolved.leavePolicyCode);
  if (leavePolicyId || leavePolicyCode) {
    const leavePolicy = leavePolicyCode
      ? await findLeavePolicyByCode(companyId, leavePolicyCode)
      : await findLeavePolicyById(leavePolicyId);

    ensureDocumentCompany(leavePolicy, companyId, "Invalid leave policy for this company.");
    resolved.leavePolicyId = leavePolicy._id;
  } else {
    resolved.leavePolicyId = null;
  }

  const salaryStructureId = normalizeOptionalId(resolved.salaryStructureId);
  const salaryStructureCode = normalizeCode(resolved.salaryStructureCode);
  if (salaryStructureId || salaryStructureCode) {
    const salaryStructure = salaryStructureCode
      ? await findSalaryStructureByCode(companyId, salaryStructureCode)
      : await findSalaryStructureById(salaryStructureId);

    ensureDocumentCompany(salaryStructure, companyId, "Invalid salary structure for this company.");
    resolved.salaryStructureId = salaryStructure._id;
  } else {
    resolved.salaryStructureId = null;
  }

  return removeHelperFields(resolved);
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company.companyCode;
};

const generateEmployeeCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastEmployee = await findLastEmployeeByCompany(companyId);

  if (!lastEmployee?.employeeCode) {
    return `${companyCode}-EMP-000001`;
  }

  const lastNumber = Number(lastEmployee.employeeCode.split("-").pop()) || 0;
  const nextNumber = lastNumber + 1;

  return `${companyCode}-EMP-${String(nextNumber).padStart(6, "0")}`;
};

const resolveEmployeeFilterReferences = async (companyId, query = {}) => {
  const resolvedQuery = { ...query };

  if (query.branchCode && !query.branchId) {
    const branch = await findBranchByCode(companyId, query.branchCode);
    resolvedQuery.branchId = branch?._id;
  }

  if (query.departmentCode && !query.departmentId) {
    const department = await findDepartmentByCode(companyId, query.departmentCode);
    resolvedQuery.departmentId = department?._id;
  }

  if (query.designationCode && !query.designationId) {
    const designation = await findDesignationByCode(companyId, query.designationCode);
    resolvedQuery.designationId = designation?._id;
  }

  return resolvedQuery;
};

const buildEmployeeFilter = (companyId, query = {}) => {
  const filter = {
    companyId,
    isActive: query.includeInactive === "true" ? { $in: [true, false] } : true,
  };

  if (query.employeeStatus) filter.employeeStatus = query.employeeStatus;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;

  if (query.search) {
    filter.$or = [
      { employeeCode: { $regex: query.search, $options: "i" } },
      { displayName: { $regex: query.search, $options: "i" } },
      { officialEmail: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const ensureNoDuplicates = async (companyId, payload, currentEmployeeId = null) => {
  if (payload.employeeCode) {
    const existingCode = await findEmployeeByCode(companyId, payload.employeeCode);

    if (
      existingCode &&
      (!currentEmployeeId ||
        existingCode._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Employee code already exists.");
    }
  }

  if (payload.officialEmail) {
    const existingEmail = await findEmployeeByOfficialEmail(
      companyId,
      payload.officialEmail
    );

    if (
      existingEmail &&
      (!currentEmployeeId ||
        existingEmail._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Official email already exists.");
    }
  }

  if (payload.mobile) {
    const existingMobile = await findEmployeeByMobile(companyId, payload.mobile);

    if (
      existingMobile &&
      (!currentEmployeeId ||
        existingMobile._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Mobile number already exists.");
    }
  }
};

export const createEmployeeService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const resolvedPayload = await resolveEmployeeReferences(companyId, payload);

  const employeeCode = normalizeCode(resolvedPayload.employeeCode) ||
    await generateEmployeeCode(companyId);

  const finalPayload = {
    ...resolvedPayload,
    employeeCode,
  };

  await ensureNoDuplicates(companyId, finalPayload);

  const employee = await createEmployeeRecord({
    ...finalPayload,
    companyId,
    createdBy: currentUser._id,
  });

  return employee;
};

export const getEmployeesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const resolvedQuery = await resolveEmployeeFilterReferences(companyId, query);
  const filter = buildEmployeeFilter(companyId, resolvedQuery);

  return listEmployees({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getEmployeeByIdService = async (currentUser, id) => {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  return employee;
};

export const updateEmployeeService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const resolvedPayload = await resolveEmployeeReferences(companyId, payload);

  if (
    resolvedPayload.reportingManagerId &&
    resolvedPayload.reportingManagerId.toString() === employee._id.toString()
  ) {
    throw new ApiError(400, "Employee cannot be their own reporting manager.");
  }

  await ensureNoDuplicates(companyId, resolvedPayload, employee._id);

  const updated = await updateEmployeeById(id, {
    ...resolvedPayload,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const updateEmployeeStatusService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const updatePayload = {
    employeeStatus: payload.employeeStatus,
    updatedBy: currentUser._id,
  };

  if (
    [
      EMPLOYEE_STATUS.RESIGNED,
      EMPLOYEE_STATUS.TERMINATED,
      EMPLOYEE_STATUS.ABSCONDED,
      EMPLOYEE_STATUS.RETIRED,
    ].includes(payload.employeeStatus)
  ) {
    updatePayload.exitDate = payload.exitDate || new Date();
    updatePayload.exitReason = payload.exitReason || "";
    updatePayload.isActive = false;
  }

  if (
    [
      EMPLOYEE_STATUS.ACTIVE,
      EMPLOYEE_STATUS.PROBATION,
      EMPLOYEE_STATUS.CONFIRMED,
      EMPLOYEE_STATUS.NOTICE_PERIOD,
    ].includes(payload.employeeStatus)
  ) {
    updatePayload.isActive = true;
  }

  const updated = await updateEmployeeById(id, updatePayload);

  return updated;
};

export const deleteEmployeeService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  await softDeleteEmployeeById(id, currentUser._id);

  return true;
};

/* ---------------- Employee Details ---------------- */

export const upsertEmployeeFamilyService = async (currentUser, employeeId, payload) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeFamily(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeFamilyService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeFamily(employeeId);
};

export const upsertEmployeeBankService = async (currentUser, employeeId, payload) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeBank(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeBankService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeBank(employeeId);
};

export const upsertEmployeeStatutoryService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeStatutory(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeStatutoryService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeStatutory(employeeId);
};

export const upsertEmployeeDocumentsService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeDocuments(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeDocumentsService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeDocuments(employeeId);
};

/* ---------------- Dashboard ---------------- */

export const getEmployeeDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    resignedEmployees,
    upcomingBirthdays,
  ] = await Promise.all([
    countEmployees({ companyId }),
    countEmployees({ companyId, isActive: true }),
    countEmployees({ companyId, isActive: false }),
    countEmployees({ companyId, employeeStatus: EMPLOYEE_STATUS.RESIGNED }),
    getUpcomingBirthdays(companyId, 10),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    resignedEmployees,
    upcomingBirthdays,
  };
};
