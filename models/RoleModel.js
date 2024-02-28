const mongoose = require("mongoose");

// Define Role Schema
const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: [String],
});

exports.Role = mongoose.model("Role", RoleSchema);
