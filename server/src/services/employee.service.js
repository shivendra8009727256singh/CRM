import bcrypt from "bcryptjs";
import crypto from "crypto";

import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import {
  ROLE_PERMISSIONS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import { EMPLOYEE_STATUS } from "../models/Employee.js";
import { Company } from "../models/Company.js";

import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
  findUserById,
} from "../repositories/user.repository.js";

import { sendWelcomeEmployeeEmail } from "./email.service.js";

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
  "reportingManagerEmployeeCode",
  "shiftCode",
  "attendancePolicyCode",
  "leavePolicyCode",
  "salaryStructureCode",
  "structureCode",
  "createLoginAccount",
];

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

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
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const normalizeOptionalId = (value) => {
  if (!hasValue(value)) return null;
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

const shouldResolveReference = (payload, idField, codeFields = [], partial) => {
  if (!partial) return true;

  if (hasOwn(payload, idField)) return true;

  return codeFields.some((field) => hasOwn(payload, field));
};

const resolveUserReference = async (
  companyId,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "userId",
    ["userEmail"],
    partial
  );

  if (!shouldResolve) return;

  const userId = normalizeOptionalId(payload.userId);
  const userEmail = payload.userEmail?.trim().toLowerCase();

  if (!userId && !userEmail) {
    payload.userId = null;
    return;
  }

  const user = userEmail
    ? await findUserByEmail(userEmail)
    : await findUserById(userId);

  if (
    !user ||
    !user.companyId ||
    user.companyId.toString() !== companyId.toString()
  ) {
    throw new ApiError(400, "Invalid user for this company.");
  }

  payload.userId = user._id;
};

const resolveBranchReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "branchId",
    ["branchCode"],
    partial
  );

  if (!shouldResolve) return;

  const branchId = normalizeOptionalId(payload.branchId);
  const branchCode = normalizeCode(payload.branchCode);

  if (!branchId && !branchCode) {
    resolved.branchId = null;
    return;
  }

  const branch = branchCode
    ? await findBranchByCode(companyId, branchCode)
    : await findBranchById(branchId);

  ensureDocumentCompany(branch, companyId, "Invalid branch for this company.");
  resolved.branchId = branch._id;
};

const resolveDepartmentReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "departmentId",
    ["departmentCode"],
    partial
  );

  if (!shouldResolve) return;

  const departmentId = normalizeOptionalId(payload.departmentId);
  const departmentCode = normalizeCode(payload.departmentCode);

  if (!departmentId && !departmentCode) {
    resolved.departmentId = null;
    return;
  }

  const department = departmentCode
    ? await findDepartmentByCode(companyId, departmentCode)
    : await findDepartmentById(departmentId);

  ensureDocumentCompany(
    department,
    companyId,
    "Invalid department for this company."
  );

  resolved.departmentId = department._id;
};

const resolveDesignationReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "designationId",
    ["designationCode"],
    partial
  );

  if (!shouldResolve) return;

  const designationId = normalizeOptionalId(payload.designationId);
  const designationCode = normalizeCode(payload.designationCode);

  if (!designationId && !designationCode) {
    resolved.designationId = null;
    return;
  }

  const designation = designationCode
    ? await findDesignationByCode(companyId, designationCode)
    : await findDesignationById(designationId);

  ensureDocumentCompany(
    designation,
    companyId,
    "Invalid designation for this company."
  );

  resolved.designationId = designation._id;
};

const resolveReportingManagerReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "reportingManagerId",
    ["reportingManagerCode", "reportingManagerEmployeeCode"],
    partial
  );

  if (!shouldResolve) return;

  const reportingManagerId = normalizeOptionalId(payload.reportingManagerId);
  const reportingManagerCode = normalizeCode(
    payload.reportingManagerCode || payload.reportingManagerEmployeeCode
  );

  if (!reportingManagerId && !reportingManagerCode) {
    resolved.reportingManagerId = null;
    return;
  }

  const manager = reportingManagerCode
    ? await findEmployeeByCode(companyId, reportingManagerCode)
    : await findEmployeeById(reportingManagerId);

  ensureDocumentCompany(
    manager,
    companyId,
    "Invalid reporting manager for this company."
  );

  resolved.reportingManagerId = manager._id;
};

const resolveShiftReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "shiftId",
    ["shiftCode"],
    partial
  );

  if (!shouldResolve) return;

  const shiftId = normalizeOptionalId(payload.shiftId);
  const shiftCode = normalizeCode(payload.shiftCode);

  if (!shiftId && !shiftCode) {
    resolved.shiftId = null;
    return;
  }

  const shift = shiftCode
    ? await findShiftByCode(companyId, shiftCode)
    : await findShiftById(shiftId);

  ensureDocumentCompany(shift, companyId, "Invalid shift for this company.");
  resolved.shiftId = shift._id;
};

const resolveAttendancePolicyReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "attendancePolicyId",
    ["attendancePolicyCode"],
    partial
  );

  if (!shouldResolve) return;

  const attendancePolicyId = normalizeOptionalId(payload.attendancePolicyId);
  const attendancePolicyCode = normalizeCode(payload.attendancePolicyCode);

  if (!attendancePolicyId && !attendancePolicyCode) {
    resolved.attendancePolicyId = null;
    return;
  }

  const attendancePolicy = attendancePolicyCode
    ? await findAttendancePolicyByCode(companyId, attendancePolicyCode)
    : await findAttendancePolicyById(attendancePolicyId);

  ensureDocumentCompany(
    attendancePolicy,
    companyId,
    "Invalid attendance policy for this company."
  );

  resolved.attendancePolicyId = attendancePolicy._id;
};

const resolveLeavePolicyReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "leavePolicyId",
    ["leavePolicyCode"],
    partial
  );

  if (!shouldResolve) return;

  const leavePolicyId = normalizeOptionalId(payload.leavePolicyId);
  const leavePolicyCode = normalizeCode(payload.leavePolicyCode);

  if (!leavePolicyId && !leavePolicyCode) {
    resolved.leavePolicyId = null;
    return;
  }

  const leavePolicy = leavePolicyCode
    ? await findLeavePolicyByCode(companyId, leavePolicyCode)
    : await findLeavePolicyById(leavePolicyId);

  ensureDocumentCompany(
    leavePolicy,
    companyId,
    "Invalid leave policy for this company."
  );

  resolved.leavePolicyId = leavePolicy._id;
};

const resolveSalaryStructureReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "salaryStructureId",
    ["salaryStructureCode", "structureCode"],
    partial
  );

  if (!shouldResolve) return;

  const salaryStructureId = normalizeOptionalId(payload.salaryStructureId);
  const salaryStructureCode = normalizeCode(
    payload.salaryStructureCode || payload.structureCode
  );

  if (!salaryStructureId && !salaryStructureCode) {
    resolved.salaryStructureId = null;
    return;
  }

  const salaryStructure = salaryStructureCode
    ? await findSalaryStructureByCode(companyId, salaryStructureCode)
    : await findSalaryStructureById(salaryStructureId);

  ensureDocumentCompany(
    salaryStructure,
    companyId,
    "Invalid salary structure for this company."
  );

  resolved.salaryStructureId = salaryStructure._id;
};

const resolveEmployeeReferences = async (
  companyId,
  payload,
  { partial = false } = {}
) => {
  const resolved = { ...payload };

  await resolveUserReference(companyId, resolved, { partial });

  await resolveBranchReference(companyId, resolved, payload, { partial });
  await resolveDepartmentReference(companyId, resolved, payload, { partial });
  await resolveDesignationReference(companyId, resolved, payload, { partial });
  await resolveReportingManagerReference(companyId, resolved, payload, {
    partial,
  });
  await resolveShiftReference(companyId, resolved, payload, { partial });
  await resolveAttendancePolicyReference(companyId, resolved, payload, {
    partial,
  });
  await resolveLeavePolicyReference(companyId, resolved, payload, { partial });
  await resolveSalaryStructureReference(companyId, resolved, payload, {
    partial,
  });

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

const generateTemporaryPassword = () => {
  return `Emp@${crypto.randomBytes(4).toString("hex")}`;
};

const createEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    token,
    tokenHash,
    expiresAt,
  };
};

const buildEmployeeDisplayName = (payload) => {
  return [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(" ");
};

const resolveEmployeeFilterReferences = async (companyId, query = {}) => {
  const resolvedQuery = { ...query };

  if (query.branchCode && !query.branchId) {
    const branch = await findBranchByCode(companyId, query.branchCode);

    if (!branch) {
      throw new ApiError(404, "Branch not found.");
    }

    resolvedQuery.branchId = branch._id;
  }

  if (query.departmentCode && !query.departmentId) {
    const department = await findDepartmentByCode(
      companyId,
      query.departmentCode
    );

    if (!department) {
      throw new ApiError(404, "Department not found.");
    }

    resolvedQuery.departmentId = department._id;
  }

  if (query.designationCode && !query.designationId) {
    const designation = await findDesignationByCode(
      companyId,
      query.designationCode
    );

    if (!designation) {
      throw new ApiError(404, "Designation not found.");
    }

    resolvedQuery.designationId = designation._id;
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

const ensureNoDuplicates = async (
  companyId,
  payload,
  currentEmployeeId = null
) => {
  if (payload.employeeCode) {
    const existingCode = await findEmployeeByCode(
      companyId,
      payload.employeeCode
    );

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

  const resolvedPayload = await resolveEmployeeReferences(companyId, payload, {
    partial: false,
  });

  const employeeCode =
    normalizeCode(resolvedPayload.employeeCode) ||
    (await generateEmployeeCode(companyId));

  const finalPayload = {
    ...resolvedPayload,
    employeeCode,
  };

  await ensureNoDuplicates(companyId, finalPayload);

  const shouldCreateLoginAccount = payload.createLoginAccount === true;

  if (shouldCreateLoginAccount && !finalPayload.officialEmail) {
    throw new ApiError(
      400,
      "Official email is required to create employee login account."
    );
  }

  if (shouldCreateLoginAccount) {
    const existingUser = await findUserByEmail(finalPayload.officialEmail);

    if (existingUser) {
      throw new ApiError(
        409,
        "A user account already exists with this official email."
      );
    }
  }

  const employee = await createEmployeeRecord({
    ...finalPayload,
    companyId,
    createdBy: currentUser._id,
  });

  if (!shouldCreateLoginAccount) {
    return employee;
  }

  let createdUser = null;

  try {
    const temporaryPassword = generateTemporaryPassword();

    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      env.BCRYPT_ROUNDS
    );

    const verification = createEmailVerificationToken();

    const displayName =
      employee.displayName || buildEmployeeDisplayName(finalPayload);

    createdUser = await createUserRecord({
      companyId,
      isPlatformUser: false,

      name: displayName,
      email: finalPayload.officialEmail,
      mobile: finalPayload.mobile || "",

      passwordHash,

      role: ROLES.EMPLOYEE,
      permissions: ROLE_PERMISSIONS[ROLES.EMPLOYEE] || [],

      employeeCode: employee.employeeCode,
      employee: employee._id,

      department: finalPayload.department || "",
      designation: finalPayload.designation || "",

      status: USER_STATUS.ACTIVE,

      isEmailVerified: false,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,

      forcePasswordChange: true,

      createdBy: currentUser._id,
    });

    await updateEmployeeById(employee._id, {
      userId: createdUser._id,
      updatedBy: currentUser._id,
    });

    const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verification.token}`;
    const loginUrl = `${env.CLIENT_ORIGIN}/login`;

    await sendWelcomeEmployeeEmail({
      to: createdUser.email,
      name: createdUser.name,
      employeeCode: employee.employeeCode,
      temporaryPassword,
      loginUrl,
      verifyUrl,
    });

    const employeeObj =
      typeof employee.toObject === "function" ? employee.toObject() : employee;

    return {
      ...employeeObj,
      userId: createdUser._id,
      loginAccountCreated: true,
      loginEmailSentTo: createdUser.email,
    };
  } catch (error) {
    if (createdUser?._id) {
      await deleteUserById(createdUser._id);
    }

    await updateEmployeeById(employee._id, {
      userId: null,
      updatedBy: currentUser._id,
    });

    throw new ApiError(
      502,
      `Employee profile was created, but login account/email setup failed. Login user was rolled back. ${error.message}`
    );
  }
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

  const resolvedPayload = await resolveEmployeeReferences(companyId, payload, {
    partial: true,
  });

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

export const upsertEmployeeFamilyService = async (
  currentUser,
  employeeId,
  payload
) => {
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

export const upsertEmployeeBankService = async (
  currentUser,
  employeeId,
  payload
) => {
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