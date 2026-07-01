import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { EMPLOYEE_STATUS } from "../models/Employee.js";
import { Company } from "../models/Company.js";

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
  findDepartmentById,
  findDesignationById,

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

const ensureReferenceBelongsToCompany = async (companyId, payload) => {
  if (payload.branchId) {
    const branch = await findBranchById(payload.branchId);

    if (!branch || branch.companyId.toString() !== companyId.toString()) {
      throw new ApiError(400, "Invalid branch for this company.");
    }
  }

  if (payload.departmentId) {
    const department = await findDepartmentById(payload.departmentId);

    if (!department || department.companyId.toString() !== companyId.toString()) {
      throw new ApiError(400, "Invalid department for this company.");
    }
  }

  if (payload.designationId) {
    const designation = await findDesignationById(payload.designationId);

    if (!designation || designation.companyId.toString() !== companyId.toString()) {
      throw new ApiError(400, "Invalid designation for this company.");
    }
  }

  if (payload.reportingManagerId) {
    const manager = await findEmployeeById(payload.reportingManagerId);

    if (!manager || manager.companyId.toString() !== companyId.toString()) {
      throw new ApiError(400, "Invalid reporting manager for this company.");
    }
  }
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

  await ensureReferenceBelongsToCompany(companyId, payload);
  await ensureNoDuplicates(companyId, payload);

  const employeeCode = await generateEmployeeCode(companyId);

  const exists = await findEmployeeByCode(companyId, employeeCode);

  if (exists) {
    throw new ApiError(409, "Employee code already exists. Please retry.");
  }

  const employee = await createEmployeeRecord({
    ...payload,
    companyId,
    employeeCode,
    createdBy: currentUser._id,
  });

  return employee;
};

export const getEmployeesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const filter = buildEmployeeFilter(companyId, query);

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

  await ensureReferenceBelongsToCompany(companyId, payload);
  await ensureNoDuplicates(companyId, payload, employee._id);

  if (
    payload.reportingManagerId &&
    payload.reportingManagerId.toString() === employee._id.toString()
  ) {
    throw new ApiError(400, "Employee cannot be their own reporting manager.");
  }

  const updated = await updateEmployeeById(id, {
    ...payload,
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