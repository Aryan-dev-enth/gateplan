import mongoose from "mongoose";
import { UserDataModel } from "./course-tracker/lib/models";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "course-tracker", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

async function debug() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found");
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const users = await UserDataModel.find({});
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    console.log(`User: ${user.username}`);
    console.log(`Summaries: ${user.dailySummaries?.length || 0}`);
    if (user.dailySummaries?.length > 0) {
      console.log("Latest Summary:", JSON.stringify(user.dailySummaries[user.dailySummaries.length - 1], null, 2));
    }
    console.log("---");
  }

  await mongoose.disconnect();
}

debug();
