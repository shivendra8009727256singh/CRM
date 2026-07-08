import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { ROLES, USER_STATUS, ROLE_PERMISSIONS,COMPANY_STATUS,
  SUBSCRIPTION_STATUS, } from "../constants/roles.js";
import { sendVerificationEmail } from "./email.service.js";

const generateEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
};

export const registerCompanyService = async (payload) => {
  const existingCompany = await Company.findOne({
    $or: [
      { companyCode: payload.companyCode.toUpperCase() },
      { email: payload.companyEmail.toLowerCase() },
    ],
  });

  if (existingCompany) {
    throw new ApiError(409, "Company already exists with this code or email.");
  }

  const existingUser = await User.findOne({
    email: payload.adminEmail.toLowerCase(),
  });

  if (existingUser) {
    throw new ApiError(409, "Admin email already exists.");
  }

  const company = await Company.create({
    companyName: payload.companyName,
    companyCode: payload.companyCode.toUpperCase(),
    email: payload.companyEmail.toLowerCase(),
    phone: payload.companyPhone || "",
    country: payload.country || "",
    status: COMPANY_STATUS.PENDING_VERIFICATION,
    subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
    createdBy: null,
  });

  const verification = generateEmailVerificationToken();

  const admin = new User({
    companyId: company._id,
    isPlatformUser: false,
    name: payload.adminName,
    email: payload.adminEmail.toLowerCase(),
    mobile: payload.adminMobile || "",
    role: ROLES.COMPANY_ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN] || [],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: false,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
    createdBy: null,
  });

  await admin.setPassword(payload.password);
  await admin.save();

  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verification.token}`;

  await sendVerificationEmail({
    to: admin.email,
    name: admin.name,
    verifyUrl,
  });

  return {
    company: {
      id: company._id,
      companyName: company.companyName,
      companyCode: company.companyCode,
      status: company.status,
    },
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isEmailVerified: admin.isEmailVerified,
    },
    message: "Company registered successfully. Please verify your email before login.",
  };
};