import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

import {
  createEventRecord,
  findEventById,
  findEventByCode,
  listEvents,
  updateEventById,
  deleteEventById,
  countEvents,
  getUpcomingEvents,
} from "../repositories/event.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureEventAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage events.");
  }
};

const ensureSameCompany = (companyId, record, message = "Event not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

export const createEventService = async (currentUser, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findEventByCode(companyId, payload.eventCode);

  if (exists) {
    throw new ApiError(409, "Event code already exists.");
  }

  return createEventRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getEventsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.eventType) filter.eventType = query.eventType;
  if (query.status) filter.status = query.status;

  if (query.from || query.to) {
    filter.startDateTime = {};
    if (query.from) filter.startDateTime.$gte = new Date(query.from);
    if (query.to) filter.startDateTime.$lte = new Date(query.to);
  }

  if (query.search) {
    filter.$or = [
      { eventTitle: { $regex: query.search, $options: "i" } },
      { eventCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listEvents({
    filter,
    page,
    limit,
    sort: { startDateTime: 1 },
  });
};

export const getEventByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);

  const event = await findEventById(id);

  ensureSameCompany(companyId, event);

  return event;
};

export const updateEventService = async (currentUser, id, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await findEventById(id);

  ensureSameCompany(companyId, event);

  return updateEventById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const updateEventStatusService = async (currentUser, id, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await findEventById(id);

  ensureSameCompany(companyId, event);

  return updateEventById(id, {
    status: payload.status,
    updatedBy: currentUser._id,
  });
};

export const deleteEventService = async (currentUser, id) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await findEventById(id);

  ensureSameCompany(companyId, event);

  await deleteEventById(id);

  return true;
};

export const getEventDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalEvents = await countEvents({ companyId });
  const upcomingEvents = await getUpcomingEvents(companyId, 10);

  return {
    totalEvents,
    upcomingEvents,
  };
};