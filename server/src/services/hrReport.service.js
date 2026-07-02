import { ApiError } from "../utils/apiError.js";

import {
  employeeReport,
  attendanceReport,
  leaveReport,
  recruitmentReport,
  jobOpeningReport,
  payrollReport,
  payslipReport,
  holidayReport,
  eventReport,
  meetingReport,
} from "../repositories/hrReport.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const dateRangeFilter = (field, query = {}) => {
  if (!query.from && !query.to) return {};

  const range = {};

  if (query.from) range.$gte = new Date(query.from);
  if (query.to) range.$lte = new Date(query.to);

  return { [field]: range };
};

export const getEmployeeReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.branchId) filter.branchId = query.branchId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;
  if (query.employeeStatus) filter.employeeStatus = query.employeeStatus;

  Object.assign(filter, dateRangeFilter("joiningDate", query));

  return employeeReport(filter);
};

export const getAttendanceReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.status) filter.status = query.status;

  Object.assign(filter, dateRangeFilter("attendanceDate", query));

  return attendanceReport(filter);
};

export const getLeaveReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.leaveTypeId) filter.leaveTypeId = query.leaveTypeId;
  if (query.status) filter.status = query.status;

  Object.assign(filter, dateRangeFilter("fromDate", query));

  return leaveReport(filter);
};

export const getRecruitmentReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.appliedJobId) filter.appliedJobId = query.appliedJobId;
  if (query.recruiterId) filter.recruiterId = query.recruiterId;

  Object.assign(filter, dateRangeFilter("createdAt", query));

  return recruitmentReport(filter);
};

export const getJobOpeningReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;

  Object.assign(filter, dateRangeFilter("createdAt", query));

  return jobOpeningReport(filter);
};

export const getPayrollReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.month) filter.month = Number(query.month);
  if (query.year) filter.year = Number(query.year);
  if (query.status) filter.status = query.status;

  return payrollReport(filter);
};

export const getPayslipReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.month) filter.month = Number(query.month);
  if (query.year) filter.year = Number(query.year);
  if (query.status) filter.status = query.status;

  return payslipReport(filter);
};

export const getHolidayReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.branchId) filter.branchId = query.branchId;
  if (query.type) filter.type = query.type;

  Object.assign(filter, dateRangeFilter("date", query));

  return holidayReport(filter);
};

export const getEventReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.eventType) filter.eventType = query.eventType;
  if (query.status) filter.status = query.status;

  Object.assign(filter, dateRangeFilter("startDateTime", query));

  return eventReport(filter);
};

export const getMeetingReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.meetingMode) filter.meetingMode = query.meetingMode;
  if (query.status) filter.status = query.status;
  if (query.organizerId) filter.organizerId = query.organizerId;

  Object.assign(filter, dateRangeFilter("startDateTime", query));

  return meetingReport(filter);
};

export const getHRReportSummaryService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    employees,
    attendance,
    leave,
    recruitment,
    payroll,
    holidays,
    events,
    meetings,
  ] = await Promise.all([
    employeeReport({ companyId }),
    attendanceReport({ companyId }),
    leaveReport({ companyId }),
    recruitmentReport({ companyId }),
    payrollReport({ companyId }),
    holidayReport({ companyId }),
    eventReport({ companyId }),
    meetingReport({ companyId }),
  ]);

  return {
    employees: employees.length,
    attendance: attendance.length,
    leave: leave.length,
    recruitment: recruitment.length,
    payroll: payroll.length,
    holidays: holidays.length,
    events: events.length,
    meetings: meetings.length,
  };
};