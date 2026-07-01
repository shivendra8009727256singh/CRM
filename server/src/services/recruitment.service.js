import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { Company } from "../models/Company.js";
import { CANDIDATE_STATUS } from "../models/Candidate.js";
import { INTERVIEW_STATUS } from "../models/Interview.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ROLE_PERMISSIONS, USER_STATUS } from "../constants/roles.js";
import { OFFER_STATUS } from "../models/OfferLetter.js";
import { EMPLOYMENT_TYPE, EMPLOYEE_STATUS } from "../models/Employee.js";
import { createEmployeeRecord } from "../repositories/employee.repository.js";
import {createOfferRecord,
    findOfferById,
    findOfferByCandidate,
    findOfferByNumber,
    findLastOfferByCompany,
    updateOfferById,
    listOffers,
    deleteOfferById,} from "../repositories/recruitment.repository.js";

import {
  createJobOpeningRecord,
  findJobOpeningById,
  findJobOpeningByCode,
  findLastJobOpeningByCompany,
  updateJobOpeningById,
  deleteJobOpeningById,
  listJobOpenings,

  createCandidateRecord,
  findCandidateById,
  findCandidateByCode,
  findCandidateByEmail,
  findCandidateByMobile,
  findLastCandidateByCompany,
  updateCandidateById,
  deleteCandidateById,
  listCandidates,

  createInterviewRecord,
  findInterviewById,
  updateInterviewById,
  deleteInterviewById,
  listInterviews,

  countJobOpenings,
  countCandidates,
  getRecruitmentFunnel,
  getInterviewsToday,
} from "../repositories/recruitment.repository.js";

import {
  findBranchById,
  findDepartmentById,
  findDesignationById,
  findEmployeeById,
} from "../repositories/employee.repository.js";
import { sendWelcomeEmployeeEmail } from "./email.service.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureRecruitmentAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage recruitment.");
  }
};

const ensureSameCompanyRecord = (companyId, record, message) => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");

  if (!company) throw new ApiError(404, "Company not found.");

  return company.companyCode;
};

const generateJobCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastJob = await findLastJobOpeningByCompany(companyId);

  if (!lastJob?.jobCode) return `${companyCode}-JOB-000001`;

  const lastNumber = Number(lastJob.jobCode.split("-").pop()) || 0;
  return `${companyCode}-JOB-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generateCandidateCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastCandidate = await findLastCandidateByCompany(companyId);

  if (!lastCandidate?.candidateCode) return `${companyCode}-CAN-000001`;

  const lastNumber = Number(lastCandidate.candidateCode.split("-").pop()) || 0;
  return `${companyCode}-CAN-${String(lastNumber + 1).padStart(6, "0")}`;
};

const validateJobReferences = async (companyId, payload) => {
  if (payload.branchId) {
    const branch = await findBranchById(payload.branchId);
    ensureSameCompanyRecord(companyId, branch, "Invalid branch for this company.");
  }

  if (payload.departmentId) {
    const department = await findDepartmentById(payload.departmentId);
    ensureSameCompanyRecord(companyId, department, "Invalid department for this company.");
  }

  if (payload.designationId) {
    const designation = await findDesignationById(payload.designationId);
    ensureSameCompanyRecord(companyId, designation, "Invalid designation for this company.");
  }

  if (payload.hiringManagerId) {
    const manager = await findEmployeeById(payload.hiringManagerId);
    ensureSameCompanyRecord(companyId, manager, "Invalid hiring manager for this company.");
  }
};

const validateCandidateReferences = async (companyId, payload) => {
  const job = await findJobOpeningById(payload.appliedJobId);
  ensureSameCompanyRecord(companyId, job, "Invalid job opening for this company.");

  if (payload.referredBy) {
    const referredBy = await findEmployeeById(payload.referredBy);
    ensureSameCompanyRecord(companyId, referredBy, "Invalid referral employee for this company.");
  }

  if (payload.recruiterId) {
    const recruiter = await findEmployeeById(payload.recruiterId);
    ensureSameCompanyRecord(companyId, recruiter, "Invalid recruiter for this company.");
  }
};

const validateInterviewReferences = async (companyId, payload) => {
  const candidate = await findCandidateById(payload.candidateId);
  ensureSameCompanyRecord(companyId, candidate, "Invalid candidate for this company.");

  const job = await findJobOpeningById(payload.jobOpeningId);
  ensureSameCompanyRecord(companyId, job, "Invalid job opening for this company.");

  if (candidate.appliedJobId.toString() !== job._id.toString()) {
    throw new ApiError(400, "Candidate does not belong to this job opening.");
  }

  if (payload.panelMembers?.length) {
    for (const member of payload.panelMembers) {
      if (member.employeeId) {
        const employee = await findEmployeeById(member.employeeId);
        ensureSameCompanyRecord(companyId, employee, "Invalid panel member for this company.");
      }
    }
  }
};

const ensureCandidateNoDuplicates = async (companyId, payload, currentId = null) => {
  if (payload.email) {
    const existing = await findCandidateByEmail(companyId, payload.email);

    if (existing && (!currentId || existing._id.toString() !== currentId.toString())) {
      throw new ApiError(409, "Candidate email already exists.");
    }
  }

  if (payload.mobile) {
    const existing = await findCandidateByMobile(companyId, payload.mobile);

    if (existing && (!currentId || existing._id.toString() !== currentId.toString())) {
      throw new ApiError(409, "Candidate mobile already exists.");
    }
  }
};

const buildJobFilter = (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;
  if (query.branchId) filter.branchId = query.branchId;

  if (query.search) {
    filter.$or = [
      { jobCode: { $regex: query.search, $options: "i" } },
      { jobTitle: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildCandidateFilter = (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.appliedJobId) filter.appliedJobId = query.appliedJobId;
  if (query.source) filter.source = query.source;
  if (query.recruiterId) filter.recruiterId = query.recruiterId;

  if (query.search) {
    filter.$or = [
      { candidateCode: { $regex: query.search, $options: "i" } },
      { fullName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildInterviewFilter = (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.result) filter.result = query.result;
  if (query.candidateId) filter.candidateId = query.candidateId;
  if (query.jobOpeningId) filter.jobOpeningId = query.jobOpeningId;

  return filter;
};

/* ---------------- Job Opening ---------------- */

export const createJobOpeningService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  await validateJobReferences(companyId, payload);

  const jobCode = await generateJobCode(companyId);

  const exists = await findJobOpeningByCode(companyId, jobCode);

  if (exists) throw new ApiError(409, "Job code already exists. Please retry.");

  return createJobOpeningRecord({
    ...payload,
    companyId,
    jobCode,
    createdBy: currentUser._id,
  });
};

export const getJobOpeningsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  return listJobOpenings({
    filter: buildJobFilter(companyId, query),
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getJobOpeningByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);
  const job = await findJobOpeningById(id);

  ensureSameCompanyRecord(companyId, job, "Job opening not found.");

  return job;
};

export const updateJobOpeningService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await findJobOpeningById(id);

  ensureSameCompanyRecord(companyId, job, "Job opening not found.");

  await validateJobReferences(companyId, payload);

  return updateJobOpeningById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const updateJobStatusService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await findJobOpeningById(id);

  ensureSameCompanyRecord(companyId, job, "Job opening not found.");

  return updateJobOpeningById(id, {
    status: payload.status,
    updatedBy: currentUser._id,
  });
};

export const deleteJobOpeningService = async (currentUser, id) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await findJobOpeningById(id);

  ensureSameCompanyRecord(companyId, job, "Job opening not found.");

  await deleteJobOpeningById(id);

  return true;
};

/* ---------------- Candidate ---------------- */

export const createCandidateService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  await validateCandidateReferences(companyId, payload);
  await ensureCandidateNoDuplicates(companyId, payload);

  const candidateCode = await generateCandidateCode(companyId);

  const exists = await findCandidateByCode(companyId, candidateCode);

  if (exists) throw new ApiError(409, "Candidate code already exists. Please retry.");

  return createCandidateRecord({
    ...payload,
    companyId,
    candidateCode,
    createdBy: currentUser._id,
  });
};

export const getCandidatesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  return listCandidates({
    filter: buildCandidateFilter(companyId, query),
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getCandidateByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);
  const candidate = await findCandidateById(id);

  ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");

  return candidate;
};

export const updateCandidateService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await findCandidateById(id);

  ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");

  if (payload.appliedJobId || payload.referredBy || payload.recruiterId) {
    await validateCandidateReferences(companyId, {
      appliedJobId: payload.appliedJobId || candidate.appliedJobId,
      referredBy: payload.referredBy,
      recruiterId: payload.recruiterId,
    });
  }

  await ensureCandidateNoDuplicates(companyId, payload, candidate._id);

  return updateCandidateById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const updateCandidateStatusService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await findCandidateById(id);

  ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");

  return updateCandidateById(id, {
    status: payload.status,
    remarks: payload.remarks || candidate.remarks,
    updatedBy: currentUser._id,
  });
};

export const deleteCandidateService = async (currentUser, id) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await findCandidateById(id);

  ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");

  await deleteCandidateById(id);

  return true;
};

/* ---------------- Interview ---------------- */

export const createInterviewService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  await validateInterviewReferences(companyId, payload);

  const interview = await createInterviewRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });

  await updateCandidateById(payload.candidateId, {
    status: CANDIDATE_STATUS.INTERVIEW_SCHEDULED,
    updatedBy: currentUser._id,
  });

  return interview;
};

export const getInterviewsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  return listInterviews({
    filter: buildInterviewFilter(companyId, query),
    page,
    limit,
    sort: { scheduledDate: -1 },
  });
};

export const getInterviewByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  return interview;
};

export const updateInterviewService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  if (payload.candidateId || payload.jobOpeningId || payload.panelMembers) {
    await validateInterviewReferences(companyId, {
      candidateId: payload.candidateId || interview.candidateId,
      jobOpeningId: payload.jobOpeningId || interview.jobOpeningId,
      panelMembers: payload.panelMembers || [],
    });
  }

  return updateInterviewById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const updateInterviewResultService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  const updated = await updateInterviewById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });

  if (payload.status === INTERVIEW_STATUS.COMPLETED) {
    await updateCandidateById(interview.candidateId, {
      status:
        payload.result === "pass"
          ? CANDIDATE_STATUS.INTERVIEWED
          : payload.result === "fail"
            ? CANDIDATE_STATUS.REJECTED
            : CANDIDATE_STATUS.ON_HOLD,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

export const deleteInterviewService = async (currentUser, id) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  await deleteInterviewById(id);

  return true;
};

/* ---------------- Dashboard ---------------- */

export const getRecruitmentDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    openJobs,
    totalCandidates,
    shortlistedCandidates,
    selectedCandidates,
    interviewsToday,
    funnel,
  ] = await Promise.all([
    countJobOpenings({ companyId, status: "open" }),
    countCandidates({ companyId }),
    countCandidates({ companyId, status: "shortlisted" }),
    countCandidates({ companyId, status: "selected" }),
    getInterviewsToday(companyId),
    getRecruitmentFunnel(companyId),
  ]);

  return {
    openJobs,
    totalCandidates,
    shortlistedCandidates,
    selectedCandidates,
    interviewsToday,
    funnel,
  };
};

const generateOfferNumber = async (companyId) => {
    const companyCode = await getCompanyCode(companyId);
    const lastOffer = await findLastOfferByCompany(companyId);
  
    if (!lastOffer?.offerNumber) {
      return `${companyCode}-OFFER-000001`;
    }
  
    const lastNumber = Number(lastOffer.offerNumber.split("-").pop()) || 0;
  
    return `${companyCode}-OFFER-${String(lastNumber + 1).padStart(6, "0")}`;
  };
  
  const generateTempPassword = () => {
    return `Temp@${crypto.randomBytes(4).toString("hex")}`;
  };
  
  /* ---------------- Offer Letter ---------------- */
  
  export const createOfferService = async (currentUser, payload) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const candidate = await findCandidateById(payload.candidateId);
    ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");
  
    const job = await findJobOpeningById(payload.jobOpeningId);
    ensureSameCompanyRecord(companyId, job, "Job opening not found.");
  
    if (candidate.appliedJobId.toString() !== job._id.toString()) {
      throw new ApiError(400, "Candidate does not belong to this job opening.");
    }
  
    const existingOffer = await findOfferByCandidate(companyId, candidate._id);
  
    if (existingOffer) {
      throw new ApiError(409, "Offer already exists for this candidate.");
    }
  
    const offerNumber = await generateOfferNumber(companyId);
  
    const offerExists = await findOfferByNumber(companyId, offerNumber);
  
    if (offerExists) {
      throw new ApiError(409, "Offer number already exists. Please retry.");
    }
  
    const offer = await createOfferRecord({
      ...payload,
      companyId,
      offerNumber,
      status: OFFER_STATUS.DRAFT,
      createdBy: currentUser._id,
    });
  
    await updateCandidateById(candidate._id, {
      status: CANDIDATE_STATUS.OFFER_SENT,
      updatedBy: currentUser._id,
    });
  
    return offer;
  };
  
  export const getOffersService = async (currentUser, query = {}) => {
    const companyId = getCompanyId(currentUser);
  
    const page = Number(query.page || 1);
    const limit = Math.min(Number(query.limit || 10), 100);
  
    const filter = { companyId };
  
    if (query.status) filter.status = query.status;
    if (query.candidateId) filter.candidateId = query.candidateId;
    if (query.jobOpeningId) filter.jobOpeningId = query.jobOpeningId;
  
    return listOffers({
      filter,
      page,
      limit,
      sort: { createdAt: -1 },
    });
  };
  
  export const getOfferByIdService = async (currentUser, id) => {
    const companyId = getCompanyId(currentUser);
  
    const offer = await findOfferById(id);
  
    ensureSameCompanyRecord(companyId, offer, "Offer not found.");
  
    return offer;
  };
  
  export const updateOfferService = async (currentUser, id, payload) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const offer = await findOfferById(id);
  
    ensureSameCompanyRecord(companyId, offer, "Offer not found.");
  
    if (offer.status === OFFER_STATUS.ACCEPTED) {
      throw new ApiError(400, "Accepted offer cannot be edited.");
    }
  
    return updateOfferById(id, {
      ...payload,
      updatedBy: currentUser._id,
    });
  };
  
  export const updateOfferStatusService = async (currentUser, id, payload) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const offer = await findOfferById(id);
  
    ensureSameCompanyRecord(companyId, offer, "Offer not found.");
  
    const updatePayload = {
      status: payload.status,
      remarks: payload.remarks || offer.remarks,
      updatedBy: currentUser._id,
    };
  
    if (payload.status === OFFER_STATUS.ACCEPTED) {
      updatePayload.acceptedAt = new Date();
    }
  
    if (payload.status === OFFER_STATUS.REJECTED) {
      updatePayload.rejectedAt = new Date();
    }
  
    const updated = await updateOfferById(id, updatePayload);
  
    if (payload.status === OFFER_STATUS.ACCEPTED) {
      await updateCandidateById(offer.candidateId, {
        status: CANDIDATE_STATUS.OFFER_ACCEPTED,
        updatedBy: currentUser._id,
      });
    }
  
    return updated;
  };
  
  export const acceptOfferService = async (currentUser, candidateId, payload) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const candidate = await findCandidateById(candidateId);
  
    ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");
  
    const offer = await findOfferByCandidate(companyId, candidateId);
  
    if (!offer) {
      throw new ApiError(404, "Offer not found for this candidate.");
    }
  
    const updated = await updateOfferById(offer._id, {
      status: OFFER_STATUS.ACCEPTED,
      joiningDate: payload.joiningDate,
      acceptedAt: new Date(),
      updatedBy: currentUser._id,
    });
  
    await updateCandidateById(candidateId, {
      status: CANDIDATE_STATUS.OFFER_ACCEPTED,
      updatedBy: currentUser._id,
    });
  
    return updated;
  };
  
  export const deleteOfferService = async (currentUser, id) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const offer = await findOfferById(id);
  
    ensureSameCompanyRecord(companyId, offer, "Offer not found.");
  
    if (offer.status === OFFER_STATUS.ACCEPTED) {
      throw new ApiError(400, "Accepted offer cannot be deleted.");
    }
  
    await deleteOfferById(id);
  
    return true;
  };
  
  /* ---------------- Candidate Conversion ---------------- */
  
  export const getCandidateConversionPreviewService = async (
    currentUser,
    candidateId
  ) => {
    const companyId = getCompanyId(currentUser);
  
    const candidate = await findCandidateById(candidateId);
    ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");
  
    const offer = await findOfferByCandidate(companyId, candidateId);
  
    if (!offer) {
      throw new ApiError(404, "Offer not found.");
    }
  
    return {
      candidate,
      offer,
      canConvert: candidate.status === CANDIDATE_STATUS.OFFER_ACCEPTED,
    };
  };
  
  export const convertCandidateToEmployeeService = async (
    currentUser,
    candidateId,
    payload
  ) => {
    ensureRecruitmentAccess(currentUser);
  
    const companyId = getCompanyId(currentUser);
  
    const candidate = await findCandidateById(candidateId);
    ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");
  
    if (candidate.employeeId) {
      throw new ApiError(409, "Candidate already converted to employee.");
    }
  
    if (candidate.status !== CANDIDATE_STATUS.OFFER_ACCEPTED) {
      throw new ApiError(400, "Only offer accepted candidates can be converted.");
    }
  
    const offer = await findOfferByCandidate(companyId, candidateId);
  
    if (!offer || offer.status !== OFFER_STATUS.ACCEPTED) {
      throw new ApiError(400, "Accepted offer is required before conversion.");
    }
  
    const job = await findJobOpeningById(candidate.appliedJobId);
    ensureSameCompanyRecord(companyId, job, "Job opening not found.");
  
    const email = candidate.email || `${candidate.candidateCode.toLowerCase()}@noemail.local`;

    if (payload.sendWelcomeEmail !== false) {
      try {
        await sendWelcomeEmployeeEmail({
          to: user.email,
          name: user.name,
          employeeCode: employee.employeeCode,
          temporaryPassword: tempPassword,
          loginUrl: `${env.CLIENT_ORIGIN}/login`,
        });
      } catch (emailError) {
        console.error("[convertCandidateToEmployee] Welcome email failed:", emailError.message);
      }
    }
  
    const existingUser = await User.findOne({ email: email.toLowerCase() });
  
    if (existingUser) {
      throw new ApiError(409, "User email already exists.");
    }
  
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);
  
    const user = await User.create({
      companyId,
      isPlatformUser: false,
      name: candidate.fullName,
      email,
      mobile: candidate.mobile,
      passwordHash,
      role: ROLES.EMPLOYEE,
      permissions: ROLE_PERMISSIONS[ROLES.EMPLOYEE] || [],
      status: USER_STATUS.ACTIVE,
      isEmailVerified: false,
      forcePasswordChange: true,
      createdBy: currentUser._id,
    });
  
    const employee = await createEmployeeRecord({
      companyId,
      userId: user._id,
  
      firstName: candidate.firstName,
      middleName: candidate.middleName || "",
      lastName: candidate.lastName,
      employeePhoto: candidate.photo || "",
  
      gender: candidate.gender,
      dateOfBirth: candidate.dateOfBirth || null,
  
      officialEmail: candidate.email || "",
      personalEmail: candidate.email || "",
      mobile: candidate.mobile,
      alternateMobile: candidate.alternateMobile || "",
  
      currentAddress: candidate.currentAddress || {},
      permanentAddress: candidate.permanentAddress || {},
  
      branchId: payload.branchId || job.branchId || null,
      departmentId: payload.departmentId || job.departmentId || null,
      designationId: payload.designationId || job.designationId || null,
      reportingManagerId: payload.reportingManagerId || job.hiringManagerId || null,
  
      employmentType: job.employmentType || EMPLOYMENT_TYPE.PERMANENT,
      workMode: payload.workMode || job.workMode || "office",
      workLocation: payload.workLocation || job.location || "",
  
      shiftId: payload.shiftId || null,
  
      joiningDate: offer.joiningDate,
  
      noticePeriodDays: offer.noticePeriodDays || 30,
  
      employeeStatus: EMPLOYEE_STATUS.ACTIVE,
  
      salaryStructureId: payload.salaryStructureId || null,
      attendancePolicyId: payload.attendancePolicyId || null,
      leavePolicyId: payload.leavePolicyId || null,
  
      notes: `Converted from candidate ${candidate.candidateCode}`,
  
      createdBy: currentUser._id,
    });
  
    user.employee = employee._id;
    await user.save();
  
    await updateCandidateById(candidate._id, {
      status: CANDIDATE_STATUS.JOINED,
      employeeId: employee._id,
      joinedOn: new Date(),
      updatedBy: currentUser._id,
    });
  
    return {
      employee,
      user: user.toSafeObject(),
      temporaryPassword: tempPassword,
    };
  };