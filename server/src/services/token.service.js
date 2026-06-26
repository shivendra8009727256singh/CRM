import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthSession } from "../models/AuthSession.js";

const getRefreshTokenExpiryDate = () => {
  const days = Number(String(env.JWT_REFRESH_EXPIRES_IN).replace("d", "")) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      permissions: user.permissions || [],
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenType: "refresh",
      jti: crypto.randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createAuthSession = async ({ user, refreshToken, req }) => {
  const session = await AuthSession.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
    deviceName: req.get("user-agent") || "Unknown Device",
    expiresAt: getRefreshTokenExpiryDate(),
  });

  return session;
};

export const generateAuthTokens = async ({ user, req }) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const session = await createAuthSession({
    user,
    refreshToken,
    req,
  });

  return {
    accessToken,
    refreshToken,
    sessionId: session._id,
  };
};

export const rotateRefreshToken = async ({ oldRefreshToken, user, req }) => {
  const oldHash = hashToken(oldRefreshToken);

  const session = await AuthSession.findOne({
    user: user._id,
    refreshTokenHash: oldHash,
    isRevoked: false,
  }).select("+refreshTokenHash");

  if (!session) {
    return null;
  }

  session.isRevoked = true;
  session.revokedAt = new Date();
  await session.save();

  return generateAuthTokens({ user, req });
};

export const revokeSession = async ({ refreshToken }) => {
  if (!refreshToken) return;

  await AuthSession.findOneAndUpdate(
    { refreshTokenHash: hashToken(refreshToken), isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
};

export const revokeAllUserSessions = async (userId) => {
  await AuthSession.updateMany(
    { user: userId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
};