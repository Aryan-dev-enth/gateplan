const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "course-tracker", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

// Define a minimal schema since we can't easily import the model file here
const UserDataSchema = new mongoose.Schema({
  username: String,
  dailySummaries: Array
}, { collection: 'userdatas' }); // Check the collection name

const UserData = mongoose.models.UserData || mongoose.model("UserData", UserDataSchema);

async function debug() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not found");
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const users = await UserData.find({});
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    console.log(`User: ${user.username}`);
    console.log(`Summaries count: ${user.dailySummaries ? user.dailySummaries.length : 'undefined/null'}`);
    if (user.dailySummaries && user.dailySummaries.length > 0) {
      console.log("Latest Summary date:", user.dailySummaries[user.dailySummaries.length - 1].date);
      // console.log(JSON.stringify(user.dailySummaries[user.dailySummaries.length - 1], null, 2));
    }
    console.log("---");
  }

  await mongoose.disconnect();
}

debug().catch(console.error);
