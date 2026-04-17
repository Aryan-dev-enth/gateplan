const mongoose = require('mongoose');

// Manually define the schema to test
const UserDataSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  ignoredBacklogModules: { type: Map, of: Boolean, default: {} },
}, { minimize: false });

const UserDataModel = mongoose.models.UserData || mongoose.model("UserData", UserDataSchema);

async function testUpdate() {
  const uri = "mongodb+srv://aryan10xdev:aryan2003strange@cluster0.ullyfub.mongodb.net/Go-tracker";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const username = "aryan"; // Assuming this is the user
  const moduleKey = "Digital Logic|Combinational Circuits";
  const ignored = true;

  console.log(`Testing update for ${username}: ${moduleKey}=${ignored}`);

  let doc = await UserDataModel.findOne({ username: username.toLowerCase() });
  if (!doc) {
      console.log("User not found, skipping.");
      process.exit(0);
  }

  if (!doc.ignoredBacklogModules || typeof doc.ignoredBacklogModules.set !== 'function') {
      console.log("Initializing Map");
      doc.ignoredBacklogModules = new Map();
  }

  doc.ignoredBacklogModules.set(moduleKey, ignored);
  doc.markModified("ignoredBacklogModules");
  await doc.save();

  console.log("Saved. Verifying...");
  const verified = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  console.log("Stored data:", verified.ignoredBacklogModules);
  
  process.exit(0);
}

testUpdate().catch(console.error);
