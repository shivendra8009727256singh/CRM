import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { findBranchById } from "../repositories/employee.repository.js";

import {
  createHolidayRecord,
  findHolidayById,
  findHolidayByDateName,
  listHolidays,
  updateHolidayById,
  deleteHolidayById,
  getUpcomingHolidays,
  countHolidays,
} from "../repositories/holiday.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureHolidayAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage holidays.");
  }
};

const ensureSameCompany = (companyId, record, message = "Holiday not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const validateBranch = async (companyId, branchId) => {
  if (!branchId) return null;

  const branch = await findBranchById(branchId);

  if (!branch || branch.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, "Invalid branch for this company.");
  }

  return branch;
};

export const createHolidayService = async (currentUser, payload) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  await validateBranch(companyId, payload.branchId);

  const date = normalizeDate(payload.date);

  const exists = await findHolidayByDateName({
    companyId,
    branchId: payload.branchId || null,
    date,
    holidayName: payload.holidayName,
  });

  if (exists) {
    throw new ApiError(409, "Holiday already exists for this date.");
  }

  return createHolidayRecord({
    ...payload,
    companyId,
    date,
    createdBy: currentUser._id,
  });
};

export const getHolidaysService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.branchId) filter.branchId = query.branchId;
  if (query.type) filter.type = query.type;
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = normalizeDate(query.from);
    if (query.to) filter.date.$lte = normalizeDate(query.to);
  }

  if (query.search) {
    filter.holidayName = { $regex: query.search, $options: "i" };
  }

  return listHolidays({
    filter,
    page,
    limit,
    sort: { date: 1 },
  });
};

export const getHolidayByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);

  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  return holiday;
};

export const updateHolidayService = async (currentUser, id, payload) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  if (payload.branchId) {
    await validateBranch(companyId, payload.branchId);
  }

  const updatePayload = {
    ...payload,
    updatedBy: currentUser._id,
  };

  if (payload.date) {
    updatePayload.date = normalizeDate(payload.date);
  }

  return updateHolidayById(id, updatePayload);
};

export const deleteHolidayService = async (currentUser, id) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  await deleteHolidayById(id);

  return true;
};

export const getHolidayDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalHolidays = await countHolidays({
    companyId,
    isActive: true,
  });

  const upcomingHolidays = await getUpcomingHolidays(companyId, 10);

  return {
    totalHolidays,
    upcomingHolidays,
  };
};