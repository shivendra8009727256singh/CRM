import Joi from "joi";
import {
  EMPLOYEE_STATUS,
  EMPLOYMENT_TYPE,
  WORK_MODE,
} from "../models/Employee.js";

const objectId = Joi.string().hex().length(24);
const optionalObjectId = objectId.allow("", null);
const optionalCode = Joi.string().trim().uppercase().max(50).allow("", null);

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().allow("", null),
  addressLine2: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),
});

const emergencyContactSchema = Joi.object({
  name: Joi.string().trim().allow("", null),
  relation: Joi.string().trim().allow("", null),
  mobile: Joi.string().trim().allow("", null),
  alternateMobile: Joi.string().trim().allow("", null),
  address: Joi.string().trim().allow("", null),
});

export const createEmployeeSchema = Joi.object({
  // Frontend should not ask HR to type MongoDB ids. These id fields are kept
  // only for hidden dropdown values/backward compatibility. Prefer the *Code
  // fields below, such as employeeCode, branchCode, departmentCode, etc.
  userId: optionalObjectId,
  userEmail: Joi.string().email().lowercase().trim().allow("", null),

  employeeCode: optionalCode,
  employeePhoto: Joi.string().trim().allow("", null),

  firstName: Joi.string().trim().min(2).max(80).required(),
  middleName: Joi.string().trim().max(80).allow("", null),
  lastName: Joi.string().trim().min(2).max(80).required(),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not_to_say")
    .default("prefer_not_to_say"),

  dateOfBirth: Joi.date().allow("", null),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "")
    .allow("", null),

  maritalStatus: Joi.string()
    .valid("single", "married", "divorced", "widowed", "")
    .allow("", null),

  nationality: Joi.string().trim().allow("", null),

  officialEmail: Joi.string().email().lowercase().trim().allow("", null),
  personalEmail: Joi.string().email().lowercase().trim().allow("", null),

  mobile: Joi.string().trim().required(),
  alternateMobile: Joi.string().trim().allow("", null),

  currentAddress: addressSchema.default({}),
  permanentAddress: addressSchema.default({}),
  emergencyContact: emergencyContactSchema.default({}),

  branchId: optionalObjectId,
  branchCode: optionalCode,

  departmentId: optionalObjectId,
  departmentCode: optionalCode,

  designationId: optionalObjectId,
  designationCode: optionalCode,

  reportingManagerId: optionalObjectId,
  reportingManagerCode: optionalCode,

  employmentType: Joi.string()
    .valid(...Object.values(EMPLOYMENT_TYPE))
    .default(EMPLOYMENT_TYPE.PERMANENT),

  workMode: Joi.string()
    .valid(...Object.values(WORK_MODE))
    .default(WORK_MODE.OFFICE),

  workLocation: Joi.string().trim().allow("", null),

  shiftId: optionalObjectId,
  shiftCode: optionalCode,

  joiningDate: Joi.date().required(),
  confirmationDate: Joi.date().allow("", null),
  probationEndDate: Joi.date().allow("", null),

  noticePeriodDays: Joi.number().integer().min(0).default(30),

  employeeStatus: Joi.string()
    .valid(...Object.values(EMPLOYEE_STATUS))
    .default(EMPLOYEE_STATUS.ACTIVE),

  salaryStructureId: optionalObjectId,
  salaryStructureCode: optionalCode,

  attendancePolicyId: optionalObjectId,
  attendancePolicyCode: optionalCode,

  leavePolicyId: optionalObjectId,
  leavePolicyCode: optionalCode,

  tags: Joi.array().items(Joi.string().trim()).default([]),
  notes: Joi.string().trim().allow("", null),
  createLoginAccount: Joi.boolean().default(false),
});

export const updateEmployeeSchema = createEmployeeSchema.fork(
  ["firstName", "lastName", "mobile", "joiningDate"],
  (schema) => schema.optional()
);

export const updateEmployeeStatusSchema = Joi.object({
  employeeStatus: Joi.string()
    .valid(...Object.values(EMPLOYEE_STATUS))
    .required(),

  exitDate: Joi.date().allow("", null),

  exitReason: Joi.string().trim().allow("", null),
});

export const employeeFamilySchema = Joi.object({
  members: Joi.array()
    .items(
      Joi.object({
        relation: Joi.string()
          .valid(
            "father",
            "mother",
            "spouse",
            "son",
            "daughter",
            "guardian",
            "other"
          )
          .required(),

        fullName: Joi.string().trim().min(2).required(),

        dateOfBirth: Joi.date().allow("", null),

        occupation: Joi.string().trim().allow("", null),

        mobile: Joi.string().trim().allow("", null),

        dependent: Joi.boolean().default(false),
      })
    )
    .default([]),
});

export const employeeBankSchema = Joi.object({
  bankName: Joi.string().trim().allow("", null),

  branchName: Joi.string().trim().allow("", null),

  accountHolderName: Joi.string().trim().allow("", null),

  accountNumber: Joi.string().trim().allow("", null),

  ifscCode: Joi.string().trim().uppercase().allow("", null),

  accountType: Joi.string().valid("saving", "current").default("saving"),

  upiId: Joi.string().trim().allow("", null),

  salaryAccount: Joi.boolean().default(true),

  cancelledCheque: Joi.string().trim().allow("", null),

  passbookCopy: Joi.string().trim().allow("", null),
});

export const employeeStatutorySchema = Joi.object({
  aadhaarNumber: Joi.string().trim().allow("", null),

  panNumber: Joi.string().trim().uppercase().allow("", null),

  passportNumber: Joi.string().trim().uppercase().allow("", null),

  drivingLicenseNumber: Joi.string().trim().uppercase().allow("", null),

  uanNumber: Joi.string().trim().allow("", null),

  pfNumber: Joi.string().trim().allow("", null),

  esiNumber: Joi.string().trim().allow("", null),

  professionalTaxNumber: Joi.string().trim().allow("", null),

  labourWelfareNumber: Joi.string().trim().allow("", null),

  voterId: Joi.string().trim().uppercase().allow("", null),
});

export const employeeDocumentSchema = Joi.object({
  documents: Joi.array()
    .items(
      Joi.object({
        documentType: Joi.string()
          .valid(
            "resume",
            "aadhaar",
            "pan",
            "passport",
            "driving_license",
            "offer_letter",
            "appointment_letter",
            "joining_letter",
            "experience_letter",
            "education_certificate",
            "salary_revision",
            "warning_letter",
            "other"
          )
          .required(),

        fileName: Joi.string().trim().allow("", null),

        fileUrl: Joi.string().trim().required(),

        fileSize: Joi.number().allow(null),

        mimeType: Joi.string().trim().allow("", null),

        expiryDate: Joi.date().allow("", null),

        verified: Joi.boolean().default(false),

        remarks: Joi.string().trim().allow("", null),
      })
    )
    .default([]),
});
