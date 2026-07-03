import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { User } from "../models/User.js";
import { NOTIFICATION_TYPE } from "../models/Notification.js";

import {
  createMessageRecord,
  findMessageById,
  listMessages,
  updateMessageById,
  createNotificationRecord,
  findNotificationById,
  listNotifications,
  updateNotificationById,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "../repositories/communication.repository.js";

import {
  emitNotificationToUser,
  emitMessageToUser,
} from "../socket/socket.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canSendCommunication = (currentUser) => {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.COMPANY_ADMIN,
    ROLES.HR,
  ].includes(currentUser.role);
};

const ensureCommunicationAccess = (currentUser) => {
  if (!canSendCommunication(currentUser)) {
    throw new ApiError(403, "You are not allowed to send communication.");
  }
};

const ensureRecipientBelongsToCompany = async (currentUser, recipientUserId) => {
  const recipient = await User.findById(recipientUserId);

  if (!recipient) {
    throw new ApiError(404, "Recipient user not found.");
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return recipient;
  }

  const senderCompanyId = getCompanyId(currentUser).toString();
  const recipientCompanyId = recipient.companyId?.toString();

  if (senderCompanyId !== recipientCompanyId) {
    throw new ApiError(403, "Recipient does not belong to your company.");
  }

  return recipient;
};

const ensureSameCompanyRecord = (
  currentUser,
  record,
  message = "Record not found."
) => {
  if (!record) {
    throw new ApiError(404, message);
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return;
  }

  const companyId = getCompanyId(currentUser).toString();

  if (record.companyId.toString() !== companyId) {
    throw new ApiError(403, "You cannot access another company's data.");
  }
};

const resolveCompanyIdForCommunication = (currentUser, recipient) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    if (!recipient.companyId) {
      throw new ApiError(400, "Recipient has no company assigned.");
    }

    return recipient.companyId;
  }

  return getCompanyId(currentUser);
};

/* ================= MESSAGES ================= */

export const sendMessageService = async (currentUser, payload) => {
  ensureCommunicationAccess(currentUser);

  const recipient = await ensureRecipientBelongsToCompany(
    currentUser,
    payload.recipientUserId
  );

  const companyId = resolveCompanyIdForCommunication(currentUser, recipient);

  const message = await createMessageRecord({
    companyId,
    senderUserId: currentUser._id,
    recipientUserId: payload.recipientUserId,
    subject: payload.subject || "",
    body: payload.body,
    attachmentUrl: payload.attachmentUrl || "",
    createdBy: currentUser._id,
  });

  const notification = await createNotificationRecord({
    companyId,
    recipientUserId: payload.recipientUserId,
    senderUserId: currentUser._id,
    type: NOTIFICATION_TYPE.MESSAGE,
    title: payload.subject || "New Message",
    message: payload.body,
    entityType: "Message",
    entityId: message._id,
    actionUrl: `/messages/${message._id}`,
    createdBy: currentUser._id,
  });

  emitMessageToUser(payload.recipientUserId.toString(), message);
  emitNotificationToUser(payload.recipientUserId.toString(), notification);

  return {
    message,
    notification,
  };
};

export const getMessagesService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {
    $or: [
      { senderUserId: currentUser._id },
      { recipientUserId: currentUser._id },
    ],
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return listMessages({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getMessageByIdService = async (currentUser, id) => {
  const message = await findMessageById(id);

  ensureSameCompanyRecord(currentUser, message, "Message not found.");

  const isSender = message.senderUserId.toString() === currentUser._id.toString();
  const isRecipient =
    message.recipientUserId.toString() === currentUser._id.toString();

  if (!isSender && !isRecipient && currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "You cannot view this message.");
  }

  return message;
};

export const markMessageReadService = async (currentUser, id) => {
  const message = await findMessageById(id);

  ensureSameCompanyRecord(currentUser, message, "Message not found.");

  if (
    message.recipientUserId.toString() !== currentUser._id.toString() &&
    currentUser.role !== ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "Only recipient can mark message as read.");
  }

  return updateMessageById(id, {
    status: "read",
    readAt: new Date(),
    updatedBy: currentUser._id,
  });
};

/* ================= NOTIFICATIONS ================= */

export const sendNotificationService = async (currentUser, payload) => {
  ensureCommunicationAccess(currentUser);

  const recipient = await ensureRecipientBelongsToCompany(
    currentUser,
    payload.recipientUserId
  );

  const companyId = resolveCompanyIdForCommunication(currentUser, recipient);

  const notification = await createNotificationRecord({
    companyId,
    recipientUserId: payload.recipientUserId,
    senderUserId: currentUser._id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    entityType: payload.entityType || "",
    entityId: payload.entityId || null,
    actionUrl: payload.actionUrl || "",
    createdBy: currentUser._id,
  });

  emitNotificationToUser(payload.recipientUserId.toString(), notification);

  return notification;
};

export const getNotificationsService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === "true";
  }

  if (query.type) {
    filter.type = query.type;
  }

  return listNotifications({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getUnreadNotificationCountService = async (currentUser) => {
  const filter = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  return {
    unreadCount: await countUnreadNotifications(filter),
  };
};

export const markNotificationReadService = async (currentUser, id) => {
  const notification = await findNotificationById(id);

  ensureSameCompanyRecord(currentUser, notification, "Notification not found.");

  if (
    notification.recipientUserId.toString() !== currentUser._id.toString() &&
    currentUser.role !== ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "You cannot update this notification.");
  }

  return updateNotificationById(id, {
    isRead: true,
    readAt: new Date(),
  });
};

export const markAllNotificationsReadService = async (currentUser) => {
  const payload = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    payload.companyId = getCompanyId(currentUser);
  }

  await markAllNotificationsRead(payload);

  return true;
};