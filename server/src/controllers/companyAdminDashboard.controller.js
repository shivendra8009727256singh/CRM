import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  getCompanyAdminDashboardService,
} from "../services/companyAdminDashboard.service.js";

export const getCompanyAdminDashboard = asyncHandler(
  async (req, res) => {
    const data = await getCompanyAdminDashboardService(
      req.user,
      req.query
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        data,
        "Company Admin dashboard fetched successfully"
      )
    );
  }
);