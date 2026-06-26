import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    deviceName: { type: String, default: "Unknown Device" },

    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);