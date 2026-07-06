import Joi from "joi";

import {
  MEETING_MODE,
  MEETING_STATUS,
} from "../models/HRMeeting.js";

const objectId = Joi.string().hex().length(24);
const code = Joi.string().trim().uppercase().min(1).max(50);

const attendeeSchema = Joi.object({
  employeeId: objectId.allow("", null),
  employeeCode: code.allow("", null),

  status: Joi.string()
    .valid("invited", "accepted", "declined", "attended", "absent")
    .default("invited"),
}).or("employeeId", "employeeCode");

const agendaItemSchema = Joi.object({
  title: Joi.string().trim().allow("", null),

  description: Joi.string().trim().allow("", null),
});

const actionItemSchema = Joi.object({
  title: Joi.string().trim().required(),

  assignedTo: objectId.allow("", null),
  assignedToEmployeeCode: code.allow("", null),
  employeeCode: code.allow("", null),

  dueDate: Joi.date().allow(null),

  status: Joi.string()
    .valid("pending", "in_progress", "completed")
    .default("pending"),
});

export const createMeetingSchema = Joi.object({
  meetingTitle: Joi.string().trim().max(200).required(),

  meetingCode: Joi.string().trim().uppercase().max(30).required(),

  meetingMode: Joi.string()
    .valid(...Object.values(MEETING_MODE))
    .default(MEETING_MODE.ONLINE),

  meetingLink: Joi.string().trim().allow("", null),

  venue: Joi.string().trim().allow("", null),

  startDateTime: Joi.date().required(),

  endDateTime: Joi.date().required(),

  organizerId: objectId.allow("", null),
  organizerCode: code.allow("", null),
  organizerEmployeeCode: code.allow("", null),

  attendees: Joi.array().items(attendeeSchema).default([]),

  agenda: Joi.array().items(agendaItemSchema).default([]),

  minutesOfMeeting: Joi.string().trim().allow("", null),

  actionItems: Joi.array().items(actionItemSchema).default([]),

  status: Joi.string()
    .valid(...Object.values(MEETING_STATUS))
    .default(MEETING_STATUS.SCHEDULED),

  notifyAttendees: Joi.boolean().default(true),

  remarks: Joi.string().trim().allow("", null),
});

export const updateMeetingSchema = createMeetingSchema.fork(
  ["meetingTitle", "meetingCode", "startDateTime", "endDateTime"],
  (schema) => schema.optional()
);

export const updateMeetingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MEETING_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});