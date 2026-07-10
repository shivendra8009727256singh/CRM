import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  updateMyProfileSchema,
  myCheckInSchema,
  myCheckOutSchema,
  myRegularizationSchema,
  myLeaveApplySchema,
  myLeaveCancelSchema,
  sendMessageToHRSchema,
} from "../validators/employeeSelf.validator.js";

import {
  getMyDashboardService,

  getMyProfileService,
  updateMyProfileService,

  getMyAttendanceService,
  myCheckInService,
  myCheckOutService,
  myRegularizationService,

  getMyLeaveBalancesService,
  getMyLeaveRequestsService,
  applyMyLeaveService,
  cancelMyLeaveRequestService,

  getMyPayslipsService,
  getMyPayslipByIdService,
  downloadMyPayslipPdfService,

  getMyNotificationsService,
  getMyUnreadNotificationCountService,
  markMyNotificationReadService,
  markAllMyNotificationsReadService,

  getMyMessagesService,
  getMyMessageByIdService,
  sendMyMessageToHRService,
  markMyMessageReadService,

  getMyMeetingsService,
  getMyEventsService,
  getMyHolidaysService,
} from "../services/employeeSelf.service.js";

/* =========================================================
   DASHBOARD
========================================================= */

export const getMyDashboard = asyncHandler(async (req, res) => {
  const data = await getMyDashboardService(req.user);

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "My dashboard fetched successfully"
    )
  );
});

/* =========================================================
   PROFILE
========================================================= */

export const getMyProfile = asyncHandler(async (req, res) => {
  const data = await getMyProfileService(req.user);

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "My profile fetched successfully"
    )
  );
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { value, error } = updateMyProfileSchema.validate(
    req.body,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details.map((item) => item.message).join(", ")
    );
  }

  const data = await updateMyProfileService(req.user, value);

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "My profile updated successfully"
    )
  );
});

/* =========================================================
   ATTENDANCE
========================================================= */

export const getMyAttendance = asyncHandler(async (req, res) => {
  const data = await getMyAttendanceService(
    req.user,
    req.query
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "My attendance fetched successfully"
    )
  );
});

export const myCheckIn = asyncHandler(async (req, res) => {
  const { value, error } = myCheckInSchema.validate(
    req.body,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details.map((item) => item.message).join(", ")
    );
  }

  const data = await myCheckInService(req.user, value);

  return res.status(201).json(
    new ApiResponse(
      201,
      data,
      "Check-in successful"
    )
  );
});

export const myCheckOut = asyncHandler(async (req, res) => {
  const { value, error } = myCheckOutSchema.validate(
    req.body,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details.map((item) => item.message).join(", ")
    );
  }

  const data = await myCheckOutService(req.user, value);

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "Check-out successful"
    )
  );
});

export const myRegularization = asyncHandler(
  async (req, res) => {
    const { value, error } =
      myRegularizationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (error) {
      throw new ApiError(
        400,
        error.details
          .map((item) => item.message)
          .join(", ")
      );
    }

    const data = await myRegularizationService(
      req.user,
      value
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        data,
        "Regularization request submitted successfully"
      )
    );
  }
);

/* =========================================================
   LEAVE
========================================================= */

export const getMyLeaveBalances = asyncHandler(
  async (req, res) => {
    const data = await getMyLeaveBalancesService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My leave balances fetched successfully"
      )
    );
  }
);

export const getMyLeaveRequests = asyncHandler(
  async (req, res) => {
    const data = await getMyLeaveRequestsService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My leave requests fetched successfully"
      )
    );
  }
);

export const applyMyLeave = asyncHandler(async (req, res) => {
  const { value, error } = myLeaveApplySchema.validate(
    req.body,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details.map((item) => item.message).join(", ")
    );
  }

  const data = await applyMyLeaveService(req.user, value);

  return res.status(201).json(
    new ApiResponse(
      201,
      data,
      "Leave request submitted successfully"
    )
  );
});

export const cancelMyLeaveRequest = asyncHandler(
  async (req, res) => {
    const { value, error } =
      myLeaveCancelSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (error) {
      throw new ApiError(
        400,
        error.details
          .map((item) => item.message)
          .join(", ")
      );
    }

    const data = await cancelMyLeaveRequestService(
      req.user,
      req.params.id,
      value
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Leave request cancelled successfully"
      )
    );
  }
);

/* =========================================================
   PAYSLIPS
========================================================= */

export const getMyPayslips = asyncHandler(
  async (req, res) => {
    const data = await getMyPayslipsService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My payslips fetched successfully"
      )
    );
  }
);

export const getMyPayslipById = asyncHandler(
  async (req, res) => {
    const data = await getMyPayslipByIdService(
      req.user,
      req.params.id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My payslip fetched successfully"
      )
    );
  }
);

export const downloadMyPayslipPdf = asyncHandler(
  async (req, res) => {
    const filePath = await downloadMyPayslipPdfService(
      req.user,
      req.params.id
    );

    return res.download(filePath);
  }
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

export const getMyNotifications = asyncHandler(
  async (req, res) => {
    const data = await getMyNotificationsService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My notifications fetched successfully"
      )
    );
  }
);

export const getMyUnreadNotificationCount = asyncHandler(
  async (req, res) => {
    const data =
      await getMyUnreadNotificationCountService(req.user);

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Unread notification count fetched successfully"
      )
    );
  }
);

export const markMyNotificationRead = asyncHandler(
  async (req, res) => {
    const data = await markMyNotificationReadService(
      req.user,
      req.params.id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Notification marked as read"
      )
    );
  }
);

export const markAllMyNotificationsRead = asyncHandler(
  async (req, res) => {
    const data =
      await markAllMyNotificationsReadService(req.user);

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "All notifications marked as read"
      )
    );
  }
);

/* =========================================================
   MESSAGES
========================================================= */

export const getMyMessages = asyncHandler(
  async (req, res) => {
    const data = await getMyMessagesService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My messages fetched successfully"
      )
    );
  }
);

export const getMyMessageById = asyncHandler(
  async (req, res) => {
    const data = await getMyMessageByIdService(
      req.user,
      req.params.id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My message fetched successfully"
      )
    );
  }
);

export const sendMyMessageToHR = asyncHandler(
  async (req, res) => {
    const { value, error } =
      sendMessageToHRSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (error) {
      throw new ApiError(
        400,
        error.details
          .map((item) => item.message)
          .join(", ")
      );
    }

    const data = await sendMyMessageToHRService(
      req.user,
      value
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        data,
        "Message sent successfully"
      )
    );
  }
);

export const markMyMessageRead = asyncHandler(
  async (req, res) => {
    const data = await markMyMessageReadService(
      req.user,
      req.params.id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Message marked as read"
      )
    );
  }
);

/* =========================================================
   MEETINGS
========================================================= */

export const getMyMeetings = asyncHandler(
  async (req, res) => {
    const data = await getMyMeetingsService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My meetings fetched successfully"
      )
    );
  }
);

/* =========================================================
   EVENTS
========================================================= */

export const getMyEvents = asyncHandler(
  async (req, res) => {
    const data = await getMyEventsService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My events fetched successfully"
      )
    );
  }
);

/* =========================================================
   HOLIDAYS
========================================================= */

export const getMyHolidays = asyncHandler(
  async (req, res) => {
    const data = await getMyHolidaysService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "My holidays fetched successfully"
      )
    );
  }
);