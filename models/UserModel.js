const mongoose = require("mongoose");

// Define User Schema with role
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    revokedPermissions: [String], // New field
});

module.exports = mongoose.model("User", UserSchema);
