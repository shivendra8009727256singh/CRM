import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { findEmployeeById } from "../repositories/employee.repository.js";

import {
  createMeetingRecord,
  findMeetingById,
  findMeetingByCode,
  listMeetings,
  updateMeetingById,
  deleteMeetingById,
  countMeetings,
  getUpcomingMeetings,
} from "../repositories/meeting.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureMeetingAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage meetings.");
  }
};

const ensureSameCompany = (companyId, record, message = "Meeting not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const validateEmployee = async (companyId, employeeId, message) => {
  if (!employeeId) return null;

  const employee = await findEmployeeById(employeeId);

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }

  return employee;
};

const validateMeetingEmployees = async (companyId, payload) => {
  if (payload.organizerId) {
    await validateEmployee(companyId, payload.organizerId, "Invalid organizer for this company.");
  }

  if (payload.attendees?.length) {
    for (const attendee of payload.attendees) {
      if (attendee.employeeId) {
        await validateEmployee(companyId, attendee.employeeId, "Invalid attendee for this company.");
      }
    }
  }

  if (payload.actionItems?.length) {
    for (const item of payload.actionItems) {
      if (item.assignedTo) {
        await validateEmployee(companyId, item.assignedTo, "Invalid action item employee for this company.");
      }
    }
  }
};

export const createMeetingService = async (currentUser, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findMeetingByCode(companyId, payload.meetingCode);

  if (exists) {
    throw new ApiError(409, "Meeting code already exists.");
  }

  await validateMeetingEmployees(companyId, payload);

  return createMeetingRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getMeetingsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.meetingMode) filter.meetingMode = query.meetingMode;
  if (query.organizerId) filter.organizerId = query.organizerId;

  if (query.from || query.to) {
    filter.startDateTime = {};
    if (query.from) filter.startDateTime.$gte = new Date(query.from);
    if (query.to) filter.startDateTime.$lte = new Date(query.to);
  }

  if (query.search) {
    filter.$or = [
      { meetingTitle: { $regex: query.search, $options: "i" } },
      { meetingCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listMeetings({
    filter,
    page,
    limit,
    sort: { startDateTime: 1 },
  });
};

export const getMeetingByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);

  const meeting = await findMeetingById(id);

  ensureSameCompany(companyId, meeting);

  return meeting;
};

export const updateMeetingService = async (currentUser, id, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await findMeetingById(id);

  ensureSameCompany(companyId, meeting);

  await validateMeetingEmployees(companyId, payload);

  return updateMeetingById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const updateMeetingStatusService = async (currentUser, id, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await findMeetingById(id);

  ensureSameCompany(companyId, meeting);

  return updateMeetingById(id, {
    status: payload.status,
    remarks: payload.remarks || meeting.remarks,
    updatedBy: currentUser._id,
  });
};

export const deleteMeetingService = async (currentUser, id) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await findMeetingById(id);

  ensureSameCompany(companyId, meeting);

  await deleteMeetingById(id);

  return true;
};

export const getMeetingDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalMeetings = await countMeetings({ companyId });
  const upcomingMeetings = await getUpcomingMeetings(companyId, 10);

  return {
    totalMeetings,
    upcomingMeetings,
  };
};