const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const patientRecordSchema = new mongoose.Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    appointment: {
        type: Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    healthIssues: [
        {
            type: Schema.Types.ObjectId,
            ref: "HealthIssue",
        },
    ],
    notes: {
        type: String,
    },
});

module.exports = mongoose.model("PatientRecord", patientRecordSchema);
