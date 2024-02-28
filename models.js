const mongoose = require("mongoose");

// Define User Schema with role
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    revokedPermissions: [String], // New field
});

// Define Role Schema
const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: [String],
});

// Create Models
const User = mongoose.model("User", UserSchema);
const Role = mongoose.model("Role", RoleSchema);

module.exports = { User, Role };
