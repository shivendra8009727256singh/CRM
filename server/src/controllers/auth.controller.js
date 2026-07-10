import crypto from "crypto";
import { User } from "../models/User.js";
import { LoginAudit } from "../models/LoginAudit.js";
import { AuthSession } from "../models/AuthSession.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateAuthTokens,
  rotateRefreshToken,
  verifyRefreshToken,
  revokeSession,
  revokeAllUserSessions,
} from "../services/token.service.js";
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendUnlockEmail,
} from "../services/email.service.js";
import {
  loginSchema,
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  registerCompanySchema,
} from "../validators/auth.validator.js";
import { registerCompanyService } from "../services/onboarding.service.js";
import { Company } from "../models/Company.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SECURE ? "none" : "lax",
  path: "/",
};

const getClientIp = (req) => {
  if (req.ip) return req.ip;

  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return "";
};

const getRefreshTokenFromReq = (req) => {
  return req.cookies?.refreshToken || req.body?.refreshToken || null;
};

const sanitizeUser = (user) => user.toSafeObject();

const auditLogin = async ({ user = null, email, status, reason, req }) => {
  await LoginAudit.create({
    user: user?._id || null,
    email,
    status,
    reason,
    ipAddress: getClientIp(req),
    userAgent: req.get("user-agent") || "",
  });
};

/* ================= LOGIN ================= */

export const login = asyncHandler(async (req, res) => {
  const { value, error } = loginSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findOne({ email: value.email })
    .select("+passwordHash")
    .populate(
      "companyId",
      "companyName companyCode status subscriptionStatus subscriptionPlan enabledModules"
    );

  if (!user) {
    await auditLogin({
      email: value.email,
      status: "failed",
      reason: "User not found",
      req,
    });

    throw new ApiError(401, "Invalid email or password");
  }

  if (
    user.role !== ROLES.SUPER_ADMIN &&
    user.companyId &&
    user.companyId.status === "suspended"
  ) {
    throw new ApiError(403, "Your company account is suspended");
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    await auditLogin({
      user,
      email: value.email,
      status: "failed",
      reason: "Inactive or blocked account",
      req,
    });

    throw new ApiError(403, "Your account is not active");
  }

  if (user.lockUntil && user.lockUntil <= new Date()) {
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.unlockTokenHash = null;
    user.unlockTokenExpiresAt = null;
    await user.save();
  }

  if (user.isLocked()) {
    await auditLogin({
      user,
      email: value.email,
      status: "locked",
      reason: "Account already locked",
      req,
    });

    throw new ApiError(
      423,
      "Account locked. Please check your email to unlock your account."
    );
  }

  if (!user.isEmailVerified) {
    await auditLogin({
      user,
      email: value.email,
      status: "failed",
      reason: "Email not verified",
      req,
    });

    throw new ApiError(403, "Please verify your email address before logging in.");
  }

  const isPasswordValid = await user.verifyPassword(value.password);

  if (!isPasswordValid) {
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);

      try {
        const unlockToken = user.createSecureToken(
          "unlockTokenHash",
          "unlockTokenExpiresAt",
          30
        );

        const unlockUrl = `${env.CLIENT_ORIGIN}/unlock-account?token=${unlockToken}`;

        await sendUnlockEmail({
          to: user.email,
          name: user.name,
          unlockUrl,
        });
      } catch (emailError) {
        console.error("[login] Unlock email failed:", emailError.message);

        user.unlockTokenHash = null;
        user.unlockTokenExpiresAt = null;
      }
    }

    await user.save();

    await auditLogin({
      user,
      email: value.email,
      status: "failed",
      reason: "Invalid password",
      req,
    });

    const remainingAttempts = Math.max(0, 5 - user.loginAttempts);

    throw new ApiError(
      401,
      remainingAttempts > 0
        ? `Invalid email or password. ${remainingAttempts} attempt(s) remaining before lockout.`
        : "Invalid email or password. Your account has been locked. Please check your email or contact an administrator."
    );
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.unlockTokenHash = null;
  user.unlockTokenExpiresAt = null;
  user.lastLoginAt = new Date();

  await user.save();

  const tokens = await generateAuthTokens({ user, req });

  await auditLogin({
    user,
    email: value.email,
    status: "success",
    reason: "Login successful",
    req,
  });

  res
    .cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(user),
          sessionId: tokens.sessionId,
        },
        "Login successful"
      )
    );
});

/* ================= LOGOUT ================= */

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromReq(req);

  await revokeSession({ refreshToken });

  await auditLogin({
    user: req.user,
    email: req.user.email,
    status: "logout",
    reason: "Logout successful",
    req,
  });

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, null, "Logout successful"));
});

/* ================= REFRESH TOKEN ================= */

export const refreshToken = asyncHandler(async (req, res) => {
  const token = getRefreshTokenFromReq(req);

  if (!token) {
    throw new ApiError(401, "Refresh token required");
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.sub);

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokens = await rotateRefreshToken({
    oldRefreshToken: token,
    user,
    req,
  });

  if (!tokens) {
    throw new ApiError(401, "Invalid refresh token session");
  }

  res
    .cookie("accessToken", tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json(new ApiResponse(200, { sessionId: tokens.sessionId }, "Token refreshed"));
});

/* ================= GET ME ================= */

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: req.user.toSafeObject(),
        company: req.auth?.company || null,
      },
      "User fetched"
    )
  );
});

/* ================= CREATE USER ================= */

export const createUser = asyncHandler(async (req, res) => {
  const { value, error } = createUserSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  if (![ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN].includes(req.user.role)) {
    throw new ApiError(403, "Permission denied.");
  }

  const exists = await User.findOne({ email: value.email });

  if (exists) {
    throw new ApiError(409, "Email already exists");
  }

  const user = new User({
    name: value.name,
    email: value.email,
    mobile: value.mobile || "",
    role: value.role,
    department: value.department || "",
    designation: value.designation || "",
    employeeCode: value.employeeCode || undefined,
    status: USER_STATUS.ACTIVE,
    forcePasswordChange: false,
    createdBy: req.user._id,
  });

  await user.setPassword(value.password);

  const verificationToken = user.createSecureToken(
    "emailVerificationTokenHash",
    "emailVerificationExpiresAt",
    60 * 24
  );

  await user.save();

  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verificationToken}`;

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl,
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        sanitizeUser(user),
        `${value.role} user created successfully`
      )
    );
});

/* ================= FORGOT PASSWORD ================= */

export const forgotPassword = asyncHandler(async (req, res) => {
  const { value, error } = forgotPasswordSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findOne({ email: value.email });

  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If that email exists, a reset link has been sent"
        )
      );
  }

  const resetToken = user.createSecureToken(
    "resetPasswordTokenHash",
    "resetPasswordExpiresAt",
    15
  );

  await user.save();

  const resetUrl = `${env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;

  await sendResetPasswordEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "If that email exists, a reset link has been sent"
      )
    );
});

/* ================= RESET PASSWORD ================= */

export const resetPassword = asyncHandler(async (req, res) => {
  const { value, error } = resetPasswordSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(value.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +passwordHash");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  await user.setPassword(value.password);

  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  user.forcePasswordChange = false;
  user.loginAttempts = 0;
  user.lockUntil = null;

  await user.save();
  await revokeAllUserSessions(user._id);

  res.status(200).json(new ApiResponse(200, null, "Password reset successful"));
});

/* ================= VERIFY EMAIL ================= */

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    throw new ApiError(400, "Verification token required");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select("+emailVerificationTokenHash");

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  user.isEmailVerified = true;

  if (user.role === ROLES.COMPANY_ADMIN && user.companyId) {
    await Company.findByIdAndUpdate(user.companyId, {
      status: "active",
      updatedBy: user._id,
    });
  }

  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;

  await user.save();

  res.status(200).json(new ApiResponse(200, null, "Email verified successfully"));
});

/* ================= RESEND VERIFICATION EMAIL ================= */

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { value, error } = resendVerificationSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findOne({ email: value.email });

  if (!user) {
    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "If this email exists and is not verified, a verification link has been sent."
      )
    );
  }

  if (user.isEmailVerified) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Email is already verified."));
  }

  const verificationToken = user.createSecureToken(
    "emailVerificationTokenHash",
    "emailVerificationExpiresAt",
    60 * 24
  );

  await user.save();

  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verificationToken}`;

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl,
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Verification email sent successfully."));
});

/* ================= UNLOCK ACCOUNT ================= */

export const unlockAccount = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    throw new ApiError(400, "Unlock token required");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    unlockTokenHash: tokenHash,
    unlockTokenExpiresAt: { $gt: new Date() },
  }).select("+unlockTokenHash");

  if (!user) {
    throw new ApiError(400, "Invalid or expired unlock token");
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.unlockTokenHash = null;
  user.unlockTokenExpiresAt = null;

  await user.save();

  res.status(200).json(new ApiResponse(200, null, "Account unlocked successfully"));
});

/* ================= ADMIN UNLOCK USER ================= */

export const adminUnlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.unlockTokenHash = null;
  user.unlockTokenExpiresAt = null;

  await user.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        sanitizeUser(user),
        "User account unlocked by admin"
      )
    );
});

/* ================= UPDATE PROFILE ================= */

export const updateProfile = asyncHandler(async (req, res) => {
  const { value, error } = updateProfileSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      ...value,
      updatedBy: req.user._id,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json(new ApiResponse(200, sanitizeUser(user), "Profile updated"));
});

/* ================= CHANGE PASSWORD ================= */

export const changePassword = asyncHandler(async (req, res) => {
  const { value, error } = changePasswordSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findById(req.user._id).select("+passwordHash");

  const isPasswordValid = await user.verifyPassword(value.currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  await user.setPassword(value.newPassword);

  user.forcePasswordChange = false;

  await user.save();
  await revokeAllUserSessions(user._id);

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password changed successfully. Please login again."
      )
    );
});

/* ================= MY SESSIONS ================= */

export const getMySessions = asyncHandler(async (req, res) => {
  const sessions = await AuthSession.find({
    user: req.user._id,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, sessions, "Sessions fetched"));
});

/* ================= REVOKE MY SESSION ================= */

export const revokeMySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await AuthSession.findOneAndUpdate(
    {
      _id: sessionId,
      user: req.user._id,
    },
    {
      isRevoked: true,
      revokedAt: new Date(),
    }
  );

  res.status(200).json(new ApiResponse(200, null, "Session revoked"));
});

/* ================= REGISTER COMPANY ================= */

export const registerCompany = asyncHandler(async (req, res) => {
  const { value, error } = registerCompanySchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const data = await registerCompanyService(value);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        data,
        "Company registration successful. Please verify your email."
      )
    );
});