import Joi from "joi";
import { OFFER_STATUS } from "../models/OfferLetter.js";

import {
  JOB_STATUS,
  JOB_PRIORITY,
} from "../models/JobOpening.js";

import {
  CANDIDATE_STATUS,
  CANDIDATE_SOURCE,
} from "../models/Candidate.js";

import {
  INTERVIEW_MODE,
  INTERVIEW_STATUS,
  INTERVIEW_RESULT,
} from "../models/Interview.js";

const objectId = Joi.string().hex().length(24);

const salaryRangeSchema = Joi.object({
  min: Joi.number().min(0).default(0),
  max: Joi.number().min(0).default(0),
  currency: Joi.string().trim().uppercase().default("INR"),
});

const experienceRangeSchema = Joi.object({
  minYears: Joi.number().min(0).default(0),
  maxYears: Joi.number().min(0).default(0),
});

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().allow("", null),
  addressLine2: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),
});

/* ---------------- Job Opening ---------------- */

export const createJobOpeningSchema = Joi.object({
  branchId: objectId.allow(null),
  departmentId: objectId.allow(null),
  designationId: objectId.allow(null),
  hiringManagerId: objectId.allow(null),

  jobTitle: Joi.string().trim().min(2).max(150).required(),

  employmentType: Joi.string()
    .valid(
      "permanent",
      "probation",
      "contract",
      "intern",
      "consultant",
      "part_time",
      "freelancer"
    )
    .default("permanent"),

  workMode: Joi.string()
    .valid("office", "remote", "hybrid", "field")
    .default("office"),

  location: Joi.string().trim().allow("", null),

  vacancies: Joi.number().integer().min(1).default(1),

  experience: experienceRangeSchema.default({}),

  salaryRange: salaryRangeSchema.default({}),

  requiredSkills: Joi.array().items(Joi.string().trim()).default([]),

  preferredSkills: Joi.array().items(Joi.string().trim()).default([]),

  education: Joi.string().trim().allow("", null),

  jobDescription: Joi.string().trim().allow("", null),

  responsibilities: Joi.array().items(Joi.string().trim()).default([]),

  requirements: Joi.array().items(Joi.string().trim()).default([]),

  benefits: Joi.array().items(Joi.string().trim()).default([]),

  openingDate: Joi.date().allow(null),

  closingDate: Joi.date().allow(null),

  status: Joi.string()
    .valid(...Object.values(JOB_STATUS))
    .default(JOB_STATUS.DRAFT),

  priority: Joi.string()
    .valid(...Object.values(JOB_PRIORITY))
    .default(JOB_PRIORITY.MEDIUM),

  sourceBudget: Joi.number().min(0).default(0),

  notes: Joi.string().trim().allow("", null),
});

export const updateJobOpeningSchema = createJobOpeningSchema.fork(
  ["jobTitle"],
  (schema) => schema.optional()
);

export const updateJobStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(JOB_STATUS))
    .required(),
});

/* ---------------- Candidate ---------------- */

export const createCandidateSchema = Joi.object({
  appliedJobId: objectId.required(),

  firstName: Joi.string().trim().min(2).required(),
  middleName: Joi.string().trim().allow("", null),
  lastName: Joi.string().trim().min(2).required(),

  photo: Joi.string().trim().allow("", null),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not_to_say")
    .default("prefer_not_to_say"),

  dateOfBirth: Joi.date().allow(null),

  email: Joi.string().email().lowercase().trim().allow("", null),

  mobile: Joi.string().trim().required(),

  alternateMobile: Joi.string().trim().allow("", null),

  linkedinUrl: Joi.string().trim().allow("", null),

  githubUrl: Joi.string().trim().allow("", null),

  portfolioUrl: Joi.string().trim().allow("", null),

  currentAddress: addressSchema.default({}),
  permanentAddress: addressSchema.default({}),

  totalExperience: Joi.number().min(0).default(0),

  currentCompany: Joi.string().trim().allow("", null),

  currentDesignation: Joi.string().trim().allow("", null),

  currentCTC: Joi.number().min(0).allow(null),

  expectedCTC: Joi.number().min(0).allow(null),

  noticePeriodDays: Joi.number().integer().min(0).allow(null),

  currentLocation: Joi.string().trim().allow("", null),

  preferredLocation: Joi.string().trim().allow("", null),

  education: Joi.array()
    .items(
      Joi.object({
        qualification: Joi.string().trim().allow("", null),
        specialization: Joi.string().trim().allow("", null),
        institute: Joi.string().trim().allow("", null),
        university: Joi.string().trim().allow("", null),
        passingYear: Joi.number().integer().allow(null),
        percentage: Joi.number().min(0).max(100).allow(null),
      })
    )
    .default([]),

  experienceHistory: Joi.array()
    .items(
      Joi.object({
        companyName: Joi.string().trim().allow("", null),
        designation: Joi.string().trim().allow("", null),
        startDate: Joi.date().allow(null),
        endDate: Joi.date().allow(null),
        currentlyWorking: Joi.boolean().default(false),
        description: Joi.string().trim().allow("", null),
      })
    )
    .default([]),

  skills: Joi.array().items(Joi.string().trim()).default([]),

  certifications: Joi.array().items(Joi.string().trim()).default([]),

  languages: Joi.array().items(Joi.string().trim()).default([]),

  resumeUrl: Joi.string().trim().allow("", null),

  coverLetter: Joi.string().trim().allow("", null),

  source: Joi.string()
    .valid(...Object.values(CANDIDATE_SOURCE))
    .default(CANDIDATE_SOURCE.CAREER_PORTAL),

  referredBy: objectId.allow(null),

  recruiterId: objectId.allow(null),

  status: Joi.string()
    .valid(...Object.values(CANDIDATE_STATUS))
    .default(CANDIDATE_STATUS.APPLIED),

  overallRating: Joi.number().min(0).max(5).default(0),

  remarks: Joi.string().trim().allow("", null),
});

export const updateCandidateSchema = createCandidateSchema.fork(
  ["appliedJobId", "firstName", "lastName", "mobile"],
  (schema) => schema.optional()
);

export const updateCandidateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(CANDIDATE_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});

/* ---------------- Interview ---------------- */

const panelMemberSchema = Joi.object({
  employeeId: objectId.allow(null),

  name: Joi.string().trim().allow("", null),

  email: Joi.string().email().lowercase().trim().allow("", null),

  role: Joi.string().trim().allow("", null),
});

const feedbackSchema = Joi.object({
  interviewerId: objectId.allow(null),

  technicalRating: Joi.number().min(0).max(5).default(0),

  communicationRating: Joi.number().min(0).max(5).default(0),

  cultureFitRating: Joi.number().min(0).max(5).default(0),

  overallRating: Joi.number().min(0).max(5).default(0),

  strengths: Joi.string().trim().allow("", null),

  weaknesses: Joi.string().trim().allow("", null),

  remarks: Joi.string().trim().allow("", null),

  recommendation: Joi.string()
    .valid("hire", "reject", "hold", "next_round", "")
    .default(""),

  submittedAt: Joi.date().allow(null),
});

export const createInterviewSchema = Joi.object({
  candidateId: objectId.required(),

  jobOpeningId: objectId.required(),

  roundName: Joi.string().trim().min(2).default("Round 1"),

  roundNumber: Joi.number().integer().min(1).default(1),

  interviewMode: Joi.string()
    .valid(...Object.values(INTERVIEW_MODE))
    .default(INTERVIEW_MODE.ONLINE),

  scheduledDate: Joi.date().required(),

  startTime: Joi.string().trim().required(),

  endTime: Joi.string().trim().allow("", null),

  durationMinutes: Joi.number().integer().min(5).default(30),

  location: Joi.string().trim().allow("", null),

  meetingLink: Joi.string().trim().allow("", null),

  agenda: Joi.string().trim().allow("", null),

  panelMembers: Joi.array().items(panelMemberSchema).default([]),

  feedback: Joi.array().items(feedbackSchema).default([]),

  status: Joi.string()
    .valid(...Object.values(INTERVIEW_STATUS))
    .default(INTERVIEW_STATUS.SCHEDULED),

  result: Joi.string()
    .valid(...Object.values(INTERVIEW_RESULT))
    .default(INTERVIEW_RESULT.PENDING),

  finalRemarks: Joi.string().trim().allow("", null),
});

export const updateInterviewSchema = createInterviewSchema.fork(
  ["candidateId", "jobOpeningId", "scheduledDate", "startTime"],
  (schema) => schema.optional()
);

export const updateInterviewResultSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(INTERVIEW_STATUS))
    .required(),

  result: Joi.string()
    .valid(...Object.values(INTERVIEW_RESULT))
    .required(),

  feedback: Joi.array().items(feedbackSchema).default([]),

  finalRemarks: Joi.string().trim().allow("", null),

  rescheduleReason: Joi.string().trim().allow("", null),

  cancelledReason: Joi.string().trim().allow("", null),
});
const offerSalarySchema = Joi.object({
    basic: Joi.number().min(0).default(0),
  
    hra: Joi.number().min(0).default(0),
  
    allowances: Joi.number().min(0).default(0),
  
    bonus: Joi.number().min(0).default(0),
  
    grossSalary: Joi.number().min(0).default(0),
  
    deductions: Joi.number().min(0).default(0),
  
    netSalary: Joi.number().min(0).default(0),
  
    ctc: Joi.number().min(0).default(0),
  
    currency: Joi.string()
      .trim()
      .uppercase()
      .default("INR"),
  });


  export const createOfferSchema = Joi.object({
    candidateId: objectId.required(),
  
    jobOpeningId: objectId.required(),
  
    joiningDate: Joi.date().required(),
  
    offerDate: Joi.date().default(() => new Date()),
  
    validTill: Joi.date().allow(null),
  
    probationMonths: Joi.number()
      .integer()
      .min(0)
      .default(6),
  
    noticePeriodDays: Joi.number()
      .integer()
      .min(0)
      .default(30),
  
    salary: offerSalarySchema.required(),
  
    offerPdfUrl: Joi.string()
      .trim()
      .allow("", null),
  
    terms: Joi.string()
      .trim()
      .allow("", null),
  
    remarks: Joi.string()
      .trim()
      .allow("", null),
  });


  export const updateOfferStatusSchema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(OFFER_STATUS))
      .required(),
  
    remarks: Joi.string()
      .trim()
      .allow("", null),
  });

  export const acceptOfferSchema = Joi.object({
    joiningDate: Joi.date().required(),
  });


  export const convertCandidateSchema = Joi.object({
    reportingManagerId: objectId.allow(null),
  
    branchId: objectId.allow(null),
  
    departmentId: objectId.allow(null),
  
    designationId: objectId.allow(null),
  
    workLocation: Joi.string()
      .trim()
      .allow("", null),
  
    workMode: Joi.string()
      .valid(
        "office",
        "remote",
        "hybrid",
        "field"
      )
      .default("office"),
  
    shiftId: objectId.allow(null),
  
    leavePolicyId: objectId.allow(null),
  
    attendancePolicyId: objectId.allow(null),
  
    salaryStructureId: objectId.allow(null),
  
    sendWelcomeEmail: Joi.boolean().default(true),
});

export const updateOfferSchema = createOfferSchema.fork(
  ["candidateId", "jobOpeningId", "joiningDate", "offerDate", "validTill"],
  (field) => field.optional()
);