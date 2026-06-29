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

const buildAuthContext = (user) => ({
  userId: user._id,
  role: user.role,
  companyId: user.companyId?._id || null,
  company: user.companyId || null,
  isPlatformUser: Boolean(user.isPlatformUser),
  permissions: user.permissions || [],
});

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (decoded.forceChange) {
    throw new ApiError(403, "Password change required before accessing this resource.");
  }

  const user = await User.findById(decoded.sub).populate(
    "companyId",
    "companyName companyCode status subscriptionStatus subscriptionPlan enabledModules"
  );

  if (!user) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Your account is not active");
  }

  req.user = user;
  req.auth = buildAuthContext(user);

  next();
});

export const requireAuthOrForceChange = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(decoded.sub).populate(
    "companyId",
    "companyName companyCode status subscriptionStatus subscriptionPlan enabledModules"
  );

  if (!user) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Your account is not active");
  }

  req.user = user;
  req.auth = {
    ...buildAuthContext(user),
    forceChange: Boolean(decoded.forceChange),
  };

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