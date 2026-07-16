import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  getSuperAdminDashboardService,
} from "../services/superAdminDashboard.service.js";

/* =========================================================
   SUPER ADMIN DASHBOARD
========================================================= */

export const getSuperAdminDashboard = asyncHandler(
  async (req, res) => {
    const data = await getSuperAdminDashboardService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Super Admin dashboard fetched successfully"
      )
    );
  }
);