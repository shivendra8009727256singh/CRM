import Joi from "joi";

/**
 * Password Policy
 * - Minimum 8 characters
 * - Maximum 32 characters
 * - At least one uppercase
 * - At least one lowercase
 * - At least one number
 * - At least one special character
 */

const password = Joi.string()
  .min(8)
  .max(32)
  .pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=])[A-Za-z\d@$!%*?&^#()_\-+=]{8,32}$/
  )
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 32 characters",
    "string.pattern.base":
      "Password must contain uppercase, lowercase, number and special character",
  });

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

export const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().required(),

  email: Joi.string().email().lowercase().trim().required(),

  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .allow("", null),

  password,

  role: Joi.string()
    .valid("admin", "hr", "support", "employee")
    .required(),

  department: Joi.string().allow("", null),

  designation: Joi.string().allow("", null),

  employeeCode: Joi.string().uppercase().allow("", null),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120),

  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .allow("", null),

  department: Joi.string().allow("", null),

  designation: Joi.string().allow("", null),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),

  newPassword: password,

  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),

  password,

  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});