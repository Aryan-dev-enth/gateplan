const mongoose = require("mongoose");
const uri = "mongodb+srv://aryan10xdev:aryan2003strange@cluster0.ullyfub.mongodb.net/Go-tracker";

async function test() {
  await mongoose.connect(uri);
  console.log("Connected to Go-tracker");

  const UserDataSchema = new mongoose.Schema({
    username: String,
    dailySummaries: Array
  }, { strict: false });

  const UserData = mongoose.models.UserData || mongoose.model("UserData", UserDataSchema, "userdatas");

  const username = "tester";
  let user = await UserData.findOne({ username: username });
  
  if (!user) {
    console.log("User not found, creating new");
    user = new UserData({ username });
  }

  const testSummary = {
    date: "2026-03-31",
    studyHours: 8,
    type: "study",
    activities: [],
    sleepSlots: [],
    scores: { productivity: 9, focus: 9, laziness: 2 },
    outcome: "Manual DB Test",
    fatigue: 30
  };

  if (!user.dailySummaries) user.dailySummaries = [];
  user.dailySummaries.push(testSummary);
  
  console.log("Saving user with summary...");
  await user.save();
  console.log("Saved successfully!");

  const updatedUser = await UserData.findOne({ username });
  console.log("Verified summaries count:", updatedUser.dailySummaries.length);
  
  await mongoose.disconnect();
}

test().catch(console.error);
