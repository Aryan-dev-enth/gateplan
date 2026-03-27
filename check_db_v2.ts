import { connectDB } from "./course-tracker/lib/mongodb";
import { UserDataModel } from "./course-tracker/lib/models";
import mongoose from "mongoose";

async function check() {
  await connectDB();
  const user = await UserDataModel.findOne({ username: "aryan1" }).lean();
  console.log("User data for aryan1:");
  console.log("Found:", !!user);
  if (user) {
    console.log("aiChatHistory length:", user.aiChatHistory?.length || 0);
    if (user.aiChatHistory && user.aiChatHistory.length > 0) {
      console.log("Last message timestamp:", user.aiChatHistory[user.aiChatHistory.length-1].timestamp);
    }
  }
  await mongoose.disconnect();
}

check();
