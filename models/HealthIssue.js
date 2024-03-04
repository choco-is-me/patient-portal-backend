const mongoose = require("mongoose");

const healthIssueSchema = new mongoose.Schema({
    healthStatus: {
        type: String,
        required: true,
    },
    medicines: [
        {
            name: {
                type: String,
                required: true,
            },
            dosage: {
                type: String,
                required: true,
            },
            frequency: {
                type: String,
                required: true,
            },
            duration: {
                type: String,
                required: true,
            },
        },
    ],
});

module.exports = mongoose.model("HealthIssue", healthIssueSchema);
