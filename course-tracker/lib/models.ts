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
  studySessions: { type: Array, default: [] },
  // Manual completions for weekly plan lecture refs not tracked in completedLectures
  // Key: "date|subject|module|refIndex|ref" → timestamp (number) or false
  manualLectureRefs: { type: Map, of: Schema.Types.Mixed, default: {} },
  // Modules ignored from backlog. Key: "Subject|Module" → boolean
  ignoredBacklogModules: { type: Map, of: Boolean, default: {} },
    dailySummaries: [{
      date: { type: String, required: true },
      studyHours: { type: Number, default: 0 },
      activities: [{
        name: String,
        minutes: Number,
        type: { type: String, enum: ['gym', 'running', 'sports', 'hangout', 'other', 'meditation', 'yoga', 'reading', 'gaming', 'walking', 'work'] },
        intensity: { type: Number, default: 3 }, // 1-5 scale
        notes: String
      }],
      sleepSlots: [{
        start: String,
        end: String
      }],
      meals: [{
        name: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number,
        time: String
      }],
      sleepyTimes: [String], // Array of times like "14:30"
      scores: {
        productivity: { type: Number, default: 5 },
        focus: { type: Number, default: 5 },
        laziness: { type: Number, default: 5 }
      },
      outcome: String,
      type: { type: String, enum: ['study', 'partial', 'revision', 'test', 'none'], default: 'study' },
      fatigue: Number,
      habits: { type: Array, default: [] },
      screenTime: { type: Number, default: 0 },
      studyQuality: { type: Number, default: 5 },
    }],
    lastAiWellnessRemark: {
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  },
  { minimize: false }
);

export const UserModel = models.User || model("User", UserSchema);
export const UserDataModel = models.UserData || model("UserData", UserDataSchema);

const AccountLogSchema = new Schema({
  username: { type: String, required: true, lowercase: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String }
});
export const AccountLogModel = models.AccountLog || model("AccountLog", AccountLogSchema);
