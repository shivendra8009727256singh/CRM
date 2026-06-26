import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../services/token.service.js";
import { USER_STATUS } from "../constants/roles.js";

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.sub);

  if (!user) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Your account is not active");
  }

  req.user = user;
  next();
});

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission"));
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    const userPermissions = req.user.permissions || [];

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new ApiError(403, "Permission denied"));
    }

    next();
  };
};