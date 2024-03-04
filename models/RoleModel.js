const mongoose = require("mongoose");

// Define Role Schema
const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: [String],
});

module.exports = mongoose.model("Role", RoleSchema);
