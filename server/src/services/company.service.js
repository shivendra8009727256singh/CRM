import bcrypt from "bcryptjs";
import crypto from "crypto";

import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

import {
  COMPANY_STATUS,
  ROLE_PERMISSIONS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import {
  createCompanyRecord,
  deleteCompanyById,
  findCompanyByCode,
  findCompanyByEmail,
  findCompanyById,
  listCompanies,
  updateCompanyById,
} from "../repositories/company.repository.js";

import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
} from "../repositories/user.repository.js";

import { sendVerificationEmail } from "./email.service.js";

const ensureSuperAdmin = (currentUser) => {
  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can perform this action.");
  }
};

const createEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    token,
    tokenHash,
    expiresAt,
  };
};

export const createCompanyService = async (currentUser, payload) => {
  ensureSuperAdmin(currentUser);

  const codeExists = await findCompanyByCode(payload.companyCode);

  if (codeExists) {
    throw new ApiError(409, "Company code already exists.");
  }

  const emailExists = await findCompanyByEmail(payload.email);

  if (emailExists) {
    throw new ApiError(409, "Company email already exists.");
  }

  const company = await createCompanyRecord({
    ...payload,
    status: COMPANY_STATUS.TRIAL,
    createdBy: currentUser._id,
  });

  return company;
};

export const getCompaniesService = async (currentUser, query = {}) => {
  ensureSuperAdmin(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {};

  if (query.status) filter.status = query.status;

  if (query.subscriptionStatus) {
    filter.subscriptionStatus = query.subscriptionStatus;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return listCompanies({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getCompanyByIdService = async (currentUser, companyId) => {
  ensureSuperAdmin(currentUser);

  const company = await findCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateCompanyService = async (currentUser, companyId, payload) => {
  ensureSuperAdmin(currentUser);

  const company = await updateCompanyById(companyId, {
    ...payload,
    updatedBy: currentUser._id,
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateCompanyStatusService = async (
  currentUser,
  companyId,
  payload
) => {
  ensureSuperAdmin(currentUser);

  const company = await updateCompanyById(companyId, {
    status: payload.status,
    subscriptionStatus: payload.subscriptionStatus,
    subscriptionEndsAt: payload.subscriptionEndsAt,
    trialEndsAt: payload.trialEndsAt,
    updatedBy: currentUser._id,
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const deleteCompanyService = async (currentUser, companyId) => {
  ensureSuperAdmin(currentUser);

  const company = await deleteCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return true;
};

export const createCompanyAdminService = async (
  currentUser,
  companyId,
  payload
) => {
  ensureSuperAdmin(currentUser);

  const company = await findCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  if (company.status === COMPANY_STATUS.SUSPENDED) {
    throw new ApiError(400, "Cannot create admin for suspended company.");
  }

  const adminEmail = String(payload.email || "").trim().toLowerCase();

  if (!adminEmail) {
    throw new ApiError(400, "Company admin email is required.");
  }

  const exists = await findUserByEmail(adminEmail);

  if (exists) {
    throw new ApiError(409, "Email already exists.");
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_ROUNDS);

  const verification = createEmailVerificationToken();

  const user = await createUserRecord({
    companyId: company._id,
    isPlatformUser: false,

    name: payload.name,
    email: adminEmail,
    mobile: payload.mobile || "",
    passwordHash,

    role: ROLES.COMPANY_ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN] || [],

    department: payload.department || "",
    designation: payload.designation || "Company Admin",

    status: USER_STATUS.ACTIVE,

    isEmailVerified: false,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,

    forcePasswordChange: false,

    createdBy: currentUser._id,
  });

  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verification.token}`;

  try {
    console.log("[company-admin-verification] Sending verification email", {
      to: adminEmail,
      from: env.SMTP_FROM || env.SMTP_USER,
      companyId: company._id.toString(),
      userId: user._id.toString(),
    });

    await sendVerificationEmail({
      to: adminEmail,
      name: user.name,
      verifyUrl,
    });
  } catch (error) {
    await deleteUserById(user._id);

    throw new ApiError(
      502,
      `Company admin was not created because verification email could not be sent. Please check SMTP settings. ${error.message}`
    );
  }

  return {
    ...user.toSafeObject(),
    verificationEmailSentTo: adminEmail,
  };
};

export const getMyCompanyProfileService = async (currentUser) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(400, "Super admin does not belong to a company.");
  }

  const company = await findCompanyById(currentUser.companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateMyCompanyProfileService = async (currentUser, payload) => {
  if (currentUser.role !== ROLES.COMPANY_ADMIN) {
    throw new ApiError(403, "Only company admin can update company profile.");
  }

  const company = await updateCompanyById(currentUser.companyId, {
    ...payload,
    updatedBy: currentUser._id,
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};