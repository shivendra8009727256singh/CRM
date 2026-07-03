import Joi from "joi";

import {
  NOTIFICATION_TYPE,
  NOTIFICATION_PRIORITY,
} from "../models/Notification.js";

const objectId = Joi.string().hex().length(24);

export const sendMessageSchema = Joi.object({
  recipientUserId: objectId.required(),

  subject: Joi.string()
    .trim()
    .max(200)
    .allow("", null),

  body: Joi.string()
    .trim()
    .max(5000)
    .required(),

  attachmentUrl: Joi.string()
    .trim()
    .allow("", null),
});

export const sendNotificationSchema = Joi.object({
  recipientUserId: objectId.required(),

  type: Joi.string()
    .valid(...Object.values(NOTIFICATION_TYPE))
    .default(NOTIFICATION_TYPE.SYSTEM),

  title: Joi.string()
    .trim()
    .max(200)
    .required(),

  message: Joi.string()
    .trim()
    .max(2000)
    .required(),

  priority: Joi.string()
    .valid(...Object.values(NOTIFICATION_PRIORITY))
    .default(NOTIFICATION_PRIORITY.NORMAL),

  entityType: Joi.string()
    .trim()
    .allow("", null),

  entityId: objectId.allow(null),

  actionUrl: Joi.string()
    .trim()
    .allow("", null),
});

export const markNotificationReadSchema = Joi.object({
  isRead: Joi.boolean().default(true),
});