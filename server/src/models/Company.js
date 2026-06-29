import mongoose from "mongoose";
import { COMPANY_STATUS, SUBSCRIPTION_STATUS } from "../constants/roles.js";

const companyAddressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: "",
    },

    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const companySettingsSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    currency: {
      type: String,
      default: "INR",
    },

    dateFormat: {
      type: String,
      default: "DD-MM-YYYY",
    },

    financialYearStartMonth: {
      type: Number,
      default: 4,
      min: 1,
      max: 12,
    },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    companyCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      default: "",
    },

    gstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    address: {
      type: companyAddressSchema,
      default: {},
    },

    status: {
      type: String,
      enum: Object.values(COMPANY_STATUS),
      default: COMPANY_STATUS.TRIAL,
      index: true,
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "starter", "business", "enterprise"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIAL,
      index: true,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    subscriptionEndsAt: {
      type: Date,
      default: null,
    },

    maxEmployees: {
      type: Number,
      default: 10,
      min: 1,
    },

    storageLimitMb: {
      type: Number,
      default: 1024,
      min: 100,
    },

    enabledModules: {
      type: [String],
      default: [
        "users",
        "employees",
        "attendance",
        "leave",
        "accounts",
      ],
    },

    settings: {
      type: companySettingsSchema,
      default: {},
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

companySchema.index({ companyName: "text", companyCode: "text", email: "text" });
companySchema.index({ status: 1, subscriptionStatus: 1 });

export const Company = mongoose.model("Company", companySchema);