const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECT_URI, {
            serverSelectionTimeoutMS: 20000, // Timeout after 20 seconds
        });
        console.log("Connect to MongoDB successfully!");
    } catch (error) {
        console.log("Connect failed " + error.message);
    }
};

module.exports = connectDB;
