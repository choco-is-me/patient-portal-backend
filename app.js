// Import necessary modules
const express = require("express");
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect(
    "mongodb+srv://chocoisme:zxfzxAoyqmwyIX09@patientportaldata.uu1v0ci.mongodb.net/?retryWrites=true&w=majority"
);

// Define User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String, // consider using bcrypt to hash the password
    role: String,
    // other necessary fields
});

// Define Role Schema
const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: [String],
});

// Create Models
const User = mongoose.model("User", UserSchema);
const Role = mongoose.model("Role", RoleSchema);

// Create an Express application
const app = express();
const port = 3000;

// Define a route to check MongoDB connection
app.get("/api/check-connection", (req, res) => {
    if (mongoose.connection.readyState == 1) {
        res.send("Successfully connected to MongoDB!");
    } else {
        res.send("Failed to connect to MongoDB!");
    }
});

// Define a route
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
