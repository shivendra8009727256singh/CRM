import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { ROLE_PERMISSIONS, ROLES, USER_STATUS } from "../constants/roles.js";
import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  listUsers,
  updateUserById,
  countActiveAdmins,
} from "../repositories/user.repository.js";

const canCreateRole = (currentRole, targetRole) => {
  if (currentRole === ROLES.ADMIN) {
    return [
      ROLES.ADMIN,
      ROLES.HR,
      ROLES.SUPPORT,
      ROLES.EMPLOYEE,
    ].includes(targetRole);
  }

  if (currentRole === ROLES.HR) {
    return [ROLES.SUPPORT, ROLES.EMPLOYEE].includes(targetRole);
  }

  return false;
};

const canManageUser = (currentUser, targetUser) => {
  if (currentUser.role === ROLES.ADMIN) return true;

  if (currentUser.role === ROLES.HR) {
    return [ROLES.SUPPORT, ROLES.EMPLOYEE].includes(targetUser.role);
  }

  return false;
};

const buildVisibilityFilter = (currentUser, query) => {
  const filter = {};

  if (currentUser.role === ROLES.ADMIN) {
    if (query.role) filter.role = query.role;
  } else if (currentUser.role === ROLES.HR) {
    filter.role = { $in: [ROLES.SUPPORT, ROLES.EMPLOYEE] };

    if (query.role) {
      if (![ROLES.SUPPORT, ROLES.EMPLOYEE].includes(query.role)) {
        throw new ApiError(403, "HR can only view support and employee users.");
      }

      filter.role = query.role;
    }
  } else {
    throw new ApiError(403, "You are not allowed to view users.");
  }

  if (query.status) filter.status = query.status;

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
      { employeeCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

export const createUserService = async (currentUser, payload) => {
  if (!canCreateRole(currentUser.role, payload.role)) {
    throw new ApiError(403, "You are not allowed to create this role.");
  }

  const exists = await findUserByEmail(payload.email);

  if (exists) {
    throw new ApiError(409, "Email already exists.");
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_ROUNDS);

  const user = await createUserRecord({
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile,
    passwordHash,
    role: payload.role,
    permissions: ROLE_PERMISSIONS[payload.role] || [],
    employeeCode: payload.employeeCode || undefined,
    department: payload.department || "",
    designation: payload.designation || "",
    status: USER_STATUS.ACTIVE,
    isEmailVerified: false,
    forcePasswordChange: true,
    createdBy: currentUser._id,
  });

  return user.toSafeObject();
};

export const getUsersService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const filter = buildVisibilityFilter(currentUser, query);

  return listUsers({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getUserByIdService = async (currentUser, id) => {
  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, user)) {
    throw new ApiError(403, "You are not allowed to view this user.");
  }

  return user.toSafeObject();
};

export const updateUserService = async (currentUser, id, payload) => {
  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to update this user.");
  }

  const user = await updateUserById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });

  return user.toSafeObject();
};

export const deleteUserService = async (currentUser, id) => {
  if (currentUser.role !== ROLES.ADMIN) {
    throw new ApiError(403, "Only admin can delete users.");
  }

  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot delete your own account.");
  }

  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (targetUser.role === ROLES.ADMIN) {
    const adminCount = await countActiveAdmins();

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot delete the last active admin.");
    }
  }

  await deleteUserById(id);

  return true;
};

export const blockUserService = async (currentUser, id) => {
  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot block your own account.");
  }

  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to block this user.");
  }

  if (targetUser.role === ROLES.ADMIN) {
    const adminCount = await countActiveAdmins();

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot block the last active admin.");
    }
  }

  targetUser.status = USER_STATUS.BLOCKED;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  return targetUser.toSafeObject();
};

export const unblockUserService = async (currentUser, id) => {
  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to unblock this user.");
  }

  targetUser.status = USER_STATUS.ACTIVE;
  targetUser.loginAttempts = 0;
  targetUser.lockUntil = null;
  targetUser.unlockTokenHash = null;
  targetUser.unlockTokenExpiresAt = null;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  return targetUser.toSafeObject();
};

export const resetUserPasswordService = async (currentUser, id, password) => {
  const targetUser = await findUserByIdWithPassword(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to reset this user's password.");
  }

  targetUser.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  targetUser.forcePasswordChange = true;
  targetUser.loginAttempts = 0;
  targetUser.lockUntil = null;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  return true;
};

export const changeRoleService = async (currentUser, id, role) => {
  if (currentUser.role !== ROLES.ADMIN) {
    throw new ApiError(403, "Only admin can change roles.");
  }

  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot change your own role.");
  }

  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const adminCount = await countActiveAdmins();

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot change the role of the last active admin.");
    }
  }

  user.role = role;
  user.permissions = ROLE_PERMISSIONS[role] || [];
  user.updatedBy = currentUser._id;

  await user.save();

  return user.toSafeObject();
};

export const assignPermissionsService = async (
  currentUser,
  id,
  permissions = []
) => {
  if (currentUser.role !== ROLES.ADMIN) {
    throw new ApiError(403, "Only admin can assign permissions.");
  }

  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.permissions = permissions;
  user.updatedBy = currentUser._id;

  await user.save();

  return user.toSafeObject();
};