import { HRMeeting } from "../models/HRMeeting.js";

export const createMeetingRecord = async (payload) => {
  return HRMeeting.create(payload);
};

export const findMeetingById = async (id) => {
  return HRMeeting.findById(id);
};

export const findMeetingByCode = async (companyId, meetingCode) => {
  return HRMeeting.findOne({
    companyId,
    meetingCode,
  });
};

export const listMeetings = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    HRMeeting.find(filter)
      .populate("organizerId", "displayName employeeCode")
      .populate("attendees.employeeId", "displayName employeeCode")
      .populate("actionItems.assignedTo", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    HRMeeting.countDocuments(filter),
  ]);

  return {
    meetings: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateMeetingById = async (id, payload) => {
  return HRMeeting.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteMeetingById = async (id) => {
  return HRMeeting.findByIdAndDelete(id);
};

export const countMeetings = async (filter) => {
  return HRMeeting.countDocuments(filter);
};

export const getUpcomingMeetings = async (companyId, limit = 10) => {
  return HRMeeting.find({
    companyId,
    startDateTime: { $gte: new Date() },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate("organizerId", "displayName employeeCode")
    .sort({ startDateTime: 1 })
    .limit(limit)
    .lean();
};