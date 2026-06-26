import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ROLE_PERMISSIONS, ROLES, USER_STATUS } from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true, maxlength: 20, default: "" },

    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.EMPLOYEE,
    },

    permissions: { type: [String], default: [] },

    employeeCode: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },

    department: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },

    forcePasswordChange: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },

    resetPasswordTokenHash: { type: String, select: false, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    unlockTokenHash: { type: String, select: false, default: null },
    unlockTokenExpiresAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (!this.permissions?.length) {
    this.permissions = ROLE_PERMISSIONS[this.role] || [];
  }
  next();
});

// FIX: Use env.BCRYPT_ROUNDS instead of hardcoded 12.
// env.js already reads BCRYPT_ROUNDS from .env with a default of 12,
// so this is a no-op change in practice but respects the config properly.
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  this.passwordChangedAt = new Date();
};

userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

userSchema.methods.createSecureToken = function (fieldName, expiryFieldName, minutes = 15) {
  const token = crypto.randomBytes(32).toString("hex");
  this[fieldName] = crypto.createHash("sha256").update(token).digest("hex");
  this[expiryFieldName] = new Date(Date.now() + minutes * 60 * 1000);
  return token;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordTokenHash;
  delete obj.emailVerificationTokenHash;
  delete obj.unlockTokenHash;
  delete obj.__v;
  return obj;
};

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ employee: 1 });

export const User = mongoose.model("User", userSchema);