import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { ROLES, ROLE_PERMISSIONS, USER_STATUS } from "../constants/roles.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || "Platform Owner";

    if (!email || !password) {
      throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
    }

    const exists = await User.findOne({ email: email.toLowerCase() });

    if (exists) {
      console.log("Super Admin already exists.");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_ROUNDS || 12)
    );

    await User.create({
      companyId: null,
      isPlatformUser: true,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      forcePasswordChange: false,
    });

    console.log("Super Admin created successfully.");
    console.log("Email:", email);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

createSuperAdmin();