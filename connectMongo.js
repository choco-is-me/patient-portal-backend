const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECT_URI, {
            serverSelectionTimeoutMS: 30000,
        });
        console.log("Connect to MongoDB successfully");
    } catch (error) {
        console.log("Connect failed " + error.message);
    }
};

module.exports = connectDB;
