import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

const createAdmin = async () => {
  try {
    await connectDB();

    const exists = await User.findOne({
      role: ROLES.ADMIN,
    });

    if (exists) {
      console.log("Admin already exists.");
      process.exit(0);
    }

    const admin = new User({
      name: "System Administrator",
      email: "admin@opascrm.com",
      mobile: "9999999999",

      role: ROLES.ADMIN,

      status: USER_STATUS.ACTIVE,

      isEmailVerified: true,

      forcePasswordChange: true,
    });

    await admin.setPassword("Admin@123");

    await admin.save();

    console.log("");

    console.log("================================");

    console.log("Admin Created Successfully");

    console.log("Email : admin@opascrm.com");

    console.log("Password : Admin@123");

    console.log("Change password after login.");

    console.log("================================");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();