const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const patientRecordSchema = new mongoose.Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    doctors: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    appointments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Appointment",
        },
    ],
    date: {
        type: Date,
        default: Date.now,
    },
    healthStatus: {
        type: String,
    },
    medicineTaken: [
        {
            type: Schema.Types.ObjectId,
            ref: "Prescription",
        },
    ],
    notes: {
        type: String,
    },
});

module.exports = mongoose.model("PatientRecord", patientRecordSchema);
