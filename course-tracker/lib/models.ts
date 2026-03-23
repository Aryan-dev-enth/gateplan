import mongoose, { Schema, model, models } from "mongoose";

// User auth
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
});

// User data (progress, plans, etc.)
const UserDataSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  completedLectures: { type: Map, of: Schema.Types.Mixed, default: {} },
  weeklyPlans: { type: Array, default: [] },
  targetDate: { type: String, default: null },
});

export const UserModel = models.User || model("User", UserSchema);
export const UserDataModel = models.UserData || model("UserData", UserDataSchema);
