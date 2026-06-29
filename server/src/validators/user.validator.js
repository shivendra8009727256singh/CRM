import Joi from "joi";
import { ROLES, USER_STATUS } from "../constants/roles.js";
import { PERMISSIONS } from "../constants/permissions.js";


export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().lowercase().required(),

  mobile: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  password: Joi.string()
    .min(8)
    .max(30)
    .required(),

  role: Joi.string()
    .valid(
      ROLES.ADMIN,
      ROLES.HR,
      ROLES.SUPPORT,
      ROLES.EMPLOYEE
    )
    .required(),

  employeeCode: Joi.string()
    .trim()
    .allow("", null),

  department: Joi.string()
    .trim()
    .allow("", null),

  designation: Joi.string()
    .trim()
    .allow("", null),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),

  mobile: Joi.string()
    .pattern(/^[0-9]{10}$/),

  department: Joi.string(),

  designation: Joi.string(),

  status: Joi.string().valid(
    USER_STATUS.ACTIVE,
    USER_STATUS.INACTIVE,
    USER_STATUS.BLOCKED
  ),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string()
    .valid(
      ROLES.ADMIN,
      ROLES.HR,
      ROLES.SUPPORT,
      ROLES.EMPLOYEE
    )
    .required(),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(30)
    .required(),
});

// export const assignPermissionsSchema = Joi.object({
//   permissions: Joi.array()
//     .items(
//       Joi.string().valid(...Object.values(PERMISSIONS))
//     )
//     .required()
//     .messages({
//       "array.base": "Permissions must be an array.",
//       "any.only": "One or more permissions are invalid.",
//     }),
// });

export const assignPermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(PERMISSIONS)))
    .min(1)
    .required()
    .messages({
      "array.base": "Permissions must be an array.",
      "array.min": "At least one permission is required.",
      "any.only": "One or more permissions are invalid.",
    }),
});