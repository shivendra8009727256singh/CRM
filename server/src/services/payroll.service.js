import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { Company } from "../models/Company.js";
import { PAYROLL_STATUS } from "../models/PayrollRun.js";
import { PAYSLIP_STATUS } from "../models/Payslip.js";
import { findEmployeeById, listEmployees } from "../repositories/employee.repository.js";

import {
  createSalaryComponentRecord,
  findSalaryComponentById,
  findSalaryComponentByCode,
  listSalaryComponents,
  updateSalaryComponentById,
  deleteSalaryComponentById,

  createSalaryStructureRecord,
  findSalaryStructureById,
  findSalaryStructureByCode,
  listSalaryStructures,
  updateSalaryStructureById,
  deleteSalaryStructureById,

  createEmployeeSalaryRecord,
  findEmployeeSalaryById,
  findActiveEmployeeSalary,
  listEmployeeSalaries,
  updateEmployeeSalaryById,

  createPayrollRunRecord,
  findPayrollRunById,
  findPayrollRunByMonth,
  findPayrollRunByCode,
  listPayrollRuns,
  updatePayrollRunById,

  createPayslipRecord,
  findPayslipById,
  findPayslipByEmployeeMonth,
  listPayslips,
  updatePayslipById,
  countPayslips,
} from "../repositories/payroll.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) throw new ApiError(403, "Company context missing.");
  return currentUser.companyId._id || currentUser.companyId;
};

const ensurePayrollAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage payroll.");
  }
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");
  if (!company) throw new ApiError(404, "Company not found.");
  return company.companyCode;
};

const calculateTotals = (earnings = [], deductions = []) => {
  const grossSalary = earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return { grossSalary, totalDeductions, netSalary };
};

const generatePayrollCode = async (companyId, month, year) => {
  const companyCode = await getCompanyCode(companyId);
  return `${companyCode}-PAY-${year}-${String(month).padStart(2, "0")}`;
};

const generatePayslipNumber = async (companyId, employeeCode, month, year) => {
  const companyCode = await getCompanyCode(companyId);
  return `${companyCode}-SLIP-${employeeCode}-${year}-${String(month).padStart(2, "0")}`;
};

const validateEmployee = async (companyId, employeeId) => {
  const employee = await findEmployeeById(employeeId);

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

/* ================= SALARY COMPONENT ================= */

export const createSalaryComponentService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const exists = await findSalaryComponentByCode(companyId, payload.componentCode);
  if (exists) throw new ApiError(409, "Salary component code already exists.");

  return createSalaryComponentRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getSalaryComponentsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };
  if (query.type) filter.type = query.type;
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

  if (query.search) {
    filter.$or = [
      { componentName: { $regex: query.search, $options: "i" } },
      { componentCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listSalaryComponents({ filter, page, limit, sort: { createdAt: -1 } });
};

export const updateSalaryComponentService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const component = await findSalaryComponentById(id);
  ensureSameCompany(companyId, component, "Salary component not found.");

  return updateSalaryComponentById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteSalaryComponentService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const component = await findSalaryComponentById(id);
  ensureSameCompany(companyId, component, "Salary component not found.");

  await deleteSalaryComponentById(id);
  return true;
};

/* ================= SALARY STRUCTURE ================= */

export const createSalaryStructureService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const exists = await findSalaryStructureByCode(companyId, payload.structureCode);
  if (exists) throw new ApiError(409, "Salary structure code already exists.");

  const totals = calculateTotals(
    payload.earnings?.map((x) => ({ amount: x.amount })) || [],
    payload.deductions?.map((x) => ({ amount: x.amount })) || []
  );

  return createSalaryStructureRecord({
    ...payload,
    companyId,
    monthlyCTC: payload.monthlyCTC || totals.grossSalary,
    annualCTC: payload.annualCTC || (payload.monthlyCTC || totals.grossSalary) * 12,
    createdBy: currentUser._id,
  });
};

export const getSalaryStructuresService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

  if (query.search) {
    filter.$or = [
      { structureName: { $regex: query.search, $options: "i" } },
      { structureCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listSalaryStructures({ filter, page, limit, sort: { createdAt: -1 } });
};

export const updateSalaryStructureService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const structure = await findSalaryStructureById(id);
  ensureSameCompany(companyId, structure, "Salary structure not found.");

  return updateSalaryStructureById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteSalaryStructureService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const structure = await findSalaryStructureById(id);
  ensureSameCompany(companyId, structure, "Salary structure not found.");

  await deleteSalaryStructureById(id);
  return true;
};

/* ================= EMPLOYEE SALARY ================= */

export const assignEmployeeSalaryService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  await validateEmployee(companyId, payload.employeeId);

  const activeSalary = await findActiveEmployeeSalary(companyId, payload.employeeId);
  if (activeSalary) {
    await updateEmployeeSalaryById(activeSalary._id, {
      status: "inactive",
      effectiveTo: payload.effectiveFrom,
      updatedBy: currentUser._id,
    });
  }

  const totals = calculateTotals(payload.earnings, payload.deductions);

  return createEmployeeSalaryRecord({
    ...payload,
    companyId,
    grossSalary: payload.grossSalary || totals.grossSalary,
    totalDeductions: payload.totalDeductions || totals.totalDeductions,
    netSalary: payload.netSalary || totals.netSalary,
    monthlyCTC: payload.monthlyCTC || totals.grossSalary,
    annualCTC: payload.annualCTC || (payload.monthlyCTC || totals.grossSalary) * 12,
    createdBy: currentUser._id,
  });
};

export const getEmployeeSalariesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };
  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.status) filter.status = query.status;

  return listEmployeeSalaries({ filter, page, limit, sort: { createdAt: -1 } });
};

export const updateEmployeeSalaryService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const salary = await findEmployeeSalaryById(id);
  ensureSameCompany(companyId, salary, "Employee salary not found.");

  const totals = calculateTotals(payload.earnings || salary.earnings, payload.deductions || salary.deductions);

  return updateEmployeeSalaryById(id, {
    ...payload,
    grossSalary: payload.grossSalary || totals.grossSalary,
    totalDeductions: payload.totalDeductions || totals.totalDeductions,
    netSalary: payload.netSalary || totals.netSalary,
    updatedBy: currentUser._id,
  });
};

/* ================= PAYROLL RUN ================= */

export const createPayrollRunService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const exists = await findPayrollRunByMonth(companyId, payload.month, payload.year);
  if (exists) throw new ApiError(409, "Payroll already exists for this month.");

  const payrollCode = await generatePayrollCode(companyId, payload.month, payload.year);
  const codeExists = await findPayrollRunByCode(companyId, payrollCode);
  if (codeExists) throw new ApiError(409, "Payroll code already exists.");

  return createPayrollRunRecord({
    ...payload,
    companyId,
    payrollCode,
    createdBy: currentUser._id,
  });
};

export const getPayrollRunsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };
  if (query.month) filter.month = Number(query.month);
  if (query.year) filter.year = Number(query.year);
  if (query.status) filter.status = query.status;

  return listPayrollRuns({ filter, page, limit, sort: { createdAt: -1 } });
};

export const processPayrollRunService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const payroll = await findPayrollRunById(id);
  ensureSameCompany(companyId, payroll, "Payroll run not found.");

  if (![PAYROLL_STATUS.DRAFT, PAYROLL_STATUS.PROCESSED].includes(payroll.status)) {
    throw new ApiError(400, "Only draft/processed payroll can be processed.");
  }

  const employeeResult = await listEmployees({
    filter: { companyId, isActive: true },
    page: 1,
    limit: 10000,
    sort: { createdAt: 1 },
  });

  let totalGrossSalary = 0;
  let totalDeductions = 0;
  let totalNetSalary = 0;
  let totalEmployees = 0;

  for (const employee of employeeResult.employees) {
    const existingPayslip = await findPayslipByEmployeeMonth({
      companyId,
      employeeId: employee._id,
      month: payroll.month,
      year: payroll.year,
    });

    if (existingPayslip) continue;

    const salary = await findActiveEmployeeSalary(companyId, employee._id);
    if (!salary) continue;

    const payslipNumber = await generatePayslipNumber(
      companyId,
      employee.employeeCode,
      payroll.month,
      payroll.year
    );

    await createPayslipRecord({
      companyId,
      payrollRunId: payroll._id,
      employeeId: employee._id,
      payslipNumber,
      month: payroll.month,
      year: payroll.year,
      earnings: salary.earnings.map((x) => ({
        componentId: x.componentId,
        name: x.componentName || x.componentCode,
        code: x.componentCode,
        amount: x.amount,
      })),
      deductions: salary.deductions.map((x) => ({
        componentId: x.componentId,
        name: x.componentName || x.componentCode,
        code: x.componentCode,
        amount: x.amount,
      })),
      grossSalary: salary.grossSalary,
      totalDeductions: salary.totalDeductions,
      netSalary: salary.netSalary,
      status: PAYSLIP_STATUS.GENERATED,
      createdBy: currentUser._id,
    });

    totalEmployees += 1;
    totalGrossSalary += salary.grossSalary;
    totalDeductions += salary.totalDeductions;
    totalNetSalary += salary.netSalary;
  }

  return updatePayrollRunById(payroll._id, {
    status: PAYROLL_STATUS.PROCESSED,
    summary: {
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
    },
    processedBy: currentUser._id,
    processedAt: new Date(),
    updatedBy: currentUser._id,
  });
};

export const updatePayrollStatusService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const payroll = await findPayrollRunById(id);
  ensureSameCompany(companyId, payroll, "Payroll run not found.");

  const updatePayload = {
    status: payload.status,
    remarks: payload.remarks || payroll.remarks,
    updatedBy: currentUser._id,
  };

  if (payload.status === PAYROLL_STATUS.APPROVED) {
    updatePayload.approvedBy = currentUser._id;
    updatePayload.approvedAt = new Date();
  }

  if (payload.status === PAYROLL_STATUS.LOCKED) {
    updatePayload.lockedBy = currentUser._id;
    updatePayload.lockedAt = new Date();
  }

  return updatePayrollRunById(id, updatePayload);
};

/* ================= PAYSLIP ================= */

export const getPayslipsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };
  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.payrollRunId) filter.payrollRunId = query.payrollRunId;
  if (query.month) filter.month = Number(query.month);
  if (query.year) filter.year = Number(query.year);
  if (query.status) filter.status = query.status;

  return listPayslips({ filter, page, limit, sort: { createdAt: -1 } });
};

export const getPayslipByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);
  const payslip = await findPayslipById(id);

  ensureSameCompany(companyId, payslip, "Payslip not found.");

  return payslip;
};

export const updatePayslipStatusService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);
  const companyId = getCompanyId(currentUser);

  const payslip = await findPayslipById(id);
  ensureSameCompany(companyId, payslip, "Payslip not found.");

  const updatePayload = {
    status: payload.status,
    remarks: payload.remarks || payslip.remarks,
    updatedBy: currentUser._id,
  };

  if (payload.status === PAYSLIP_STATUS.PAID) {
    updatePayload.paidAt = new Date();
  }

  if (payload.status === PAYSLIP_STATUS.SENT) {
    updatePayload.sentAt = new Date();
  }

  return updatePayslipById(id, updatePayload);
};

export const getPayrollDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const generatedPayslips = await countPayslips({
    companyId,
    status: PAYSLIP_STATUS.GENERATED,
  });

  const paidPayslips = await countPayslips({
    companyId,
    status: PAYSLIP_STATUS.PAID,
  });

  return {
    generatedPayslips,
    paidPayslips,
  };
};

export const generatePayslipPdfService = async (currentUser, id) => {
    ensurePayrollAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
    const payslip = await findPayslipById(id);
  
    ensureSameCompany(companyId, payslip, "Payslip not found.");
  
    const fakePdfUrl = `/uploads/payslips/${payslip.payslipNumber}.pdf`;
  
    return updatePayslipById(id, {
      pdfUrl: fakePdfUrl,
      updatedBy: currentUser._id,
    });
  };