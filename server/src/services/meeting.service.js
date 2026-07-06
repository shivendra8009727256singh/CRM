import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

import {
  findEmployeeById,
  findEmployeeByCode,
} from "../repositories/employee.repository.js";

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

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

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

const resolveMeeting = async (companyId, idOrCode) => {
  let meeting = null;

  if (isMongoId(idOrCode)) {
    meeting = await findMeetingById(idOrCode);
  }

  if (!meeting) {
    meeting = await findMeetingByCode(companyId, normalizeCode(idOrCode));
  }

  ensureSameCompany(companyId, meeting, "Meeting not found.");

  return meeting;
};

const resolveEmployee = async (
  companyId,
  payload = {},
  message = "Employee not found."
) => {
  const employeeId =
    payload.employeeId ||
    payload.organizerId ||
    payload.assignedTo;

  const employeeCode = normalizeCode(
    payload.employeeCode ||
      payload.organizerCode ||
      payload.organizerEmployeeCode ||
      payload.assignedToEmployeeCode
  );

  if (!hasValue(employeeId) && !employeeCode) {
    return null;
  }

  let employee = null;

  if (hasValue(employeeId)) {
    employee = await findEmployeeById(employeeId);
  }

  if (!employee && employeeCode) {
    employee = await findEmployeeByCode(companyId, employeeCode);
  }

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }

  return employee;
};

const normalizeAttendees = async (companyId, attendees = []) => {
  const normalized = [];

  for (const attendee of attendees) {
    const employee = await resolveEmployee(
      companyId,
      attendee,
      "Invalid attendee for this company."
    );

    if (!employee) {
      continue;
    }

    normalized.push({
      employeeId: employee._id,
      status: attendee.status || "invited",
    });
  }

  return normalized;
};

const normalizeActionItems = async (companyId, actionItems = []) => {
  const normalized = [];

  for (const item of actionItems) {
    const row = { ...item };

    const employee = await resolveEmployee(
      companyId,
      {
        assignedTo: item.assignedTo,
        assignedToEmployeeCode: item.assignedToEmployeeCode || item.employeeCode,
      },
      "Invalid action item employee for this company."
    );

    row.assignedTo = employee?._id || null;

    delete row.assignedToEmployeeCode;
    delete row.employeeCode;

    normalized.push(row);
  }

  return normalized;
};

const normalizeMeetingPayload = async (
  companyId,
  payload = {},
  partial = false
) => {
  const normalized = { ...payload };

  if (
    !partial ||
    "organizerId" in payload ||
    "organizerCode" in payload ||
    "organizerEmployeeCode" in payload
  ) {
    const organizer = await resolveEmployee(
      companyId,
      {
        organizerId: payload.organizerId,
        organizerCode: payload.organizerCode,
        organizerEmployeeCode: payload.organizerEmployeeCode,
      },
      "Invalid organizer for this company."
    );

    normalized.organizerId = organizer?._id || null;
  }

  if (!partial || "attendees" in payload) {
    normalized.attendees = await normalizeAttendees(
      companyId,
      payload.attendees || []
    );
  }

  if (!partial || "actionItems" in payload) {
    normalized.actionItems = await normalizeActionItems(
      companyId,
      payload.actionItems || []
    );
  }

  if (payload.meetingCode) {
    normalized.meetingCode = normalizeCode(payload.meetingCode);
  }

  delete normalized.organizerCode;
  delete normalized.organizerEmployeeCode;

  return normalized;
};

export const createMeetingService = async (currentUser, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const meetingCode = normalizeCode(payload.meetingCode);

  const exists = await findMeetingByCode(companyId, meetingCode);

  if (exists) {
    throw new ApiError(409, "Meeting code already exists.");
  }

  const normalizedPayload = await normalizeMeetingPayload(
    companyId,
    {
      ...payload,
      meetingCode,
    },
    false
  );

  return createMeetingRecord({
    ...normalizedPayload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getMeetingsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.meetingMode) {
    filter.meetingMode = query.meetingMode;
  }

  if (query.meetingCode) {
    filter.meetingCode = normalizeCode(query.meetingCode);
  }

  if (query.organizerId) {
    filter.organizerId = query.organizerId;
  }

  if (query.organizerCode || query.organizerEmployeeCode) {
    const organizer = await resolveEmployee(
      companyId,
      {
        organizerCode: query.organizerCode,
        organizerEmployeeCode: query.organizerEmployeeCode,
      },
      "Organizer not found."
    );

    filter.organizerId = organizer._id;
  }

  if (query.attendeeEmployeeId || query.employeeId) {
    filter["attendees.employeeId"] =
      query.attendeeEmployeeId || query.employeeId;
  }

  if (query.attendeeEmployeeCode || query.employeeCode) {
    const employee = await resolveEmployee(
      companyId,
      {
        employeeCode: query.attendeeEmployeeCode || query.employeeCode,
      },
      "Attendee not found."
    );

    filter["attendees.employeeId"] = employee._id;
  }

  if (query.from || query.to) {
    filter.startDateTime = {};

    if (query.from) {
      filter.startDateTime.$gte = new Date(query.from);
    }

    if (query.to) {
      filter.startDateTime.$lte = new Date(query.to);
    }
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

export const getMeetingByIdService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);

  return resolveMeeting(companyId, idOrCode);
};

export const updateMeetingService = async (currentUser, idOrCode, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);

  if (
    payload.meetingCode &&
    normalizeCode(payload.meetingCode) !== meeting.meetingCode
  ) {
    const exists = await findMeetingByCode(companyId, payload.meetingCode);

    if (exists && exists._id.toString() !== meeting._id.toString()) {
      throw new ApiError(409, "Meeting code already exists.");
    }
  }

  const normalizedPayload = await normalizeMeetingPayload(
    companyId,
    payload,
    true
  );

  return updateMeetingById(meeting._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateMeetingStatusService = async (
  currentUser,
  idOrCode,
  payload
) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);

  return updateMeetingById(meeting._id, {
    status: payload.status,
    remarks: payload.remarks || meeting.remarks,
    updatedBy: currentUser._id,
  });
};

export const deleteMeetingService = async (currentUser, idOrCode) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);

  await deleteMeetingById(meeting._id);

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