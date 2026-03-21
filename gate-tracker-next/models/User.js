import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash

  // All study data embedded — one document = one user's entire prep
  topicStats:   { type: mongoose.Schema.Types.Mixed, default: {} },
  subjectStats: { type: mongoose.Schema.Types.Mixed, default: {} },
  dailyLogs:    { type: mongoose.Schema.Types.Mixed, default: {} },
  dailyHours:   { type: mongoose.Schema.Types.Mixed, default: {} },
  customSlotAssignments: { type: mongoose.Schema.Types.Mixed, default: {} },
  practiceLog:  { type: mongoose.Schema.Types.Mixed, default: {} },
  backlog:      { type: Array, default: [] },
  mockTests:    { type: Array, default: [] },
  streak: {
    current:      { type: Number, default: 0 },
    longest:      { type: Number, default: 0 },
    lastStudyDate:{ type: String, default: null },
    studiedDates: { type: Array, default: [] },
  },
  weeklyTarget: { type: Number, default: 45 },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
