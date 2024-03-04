const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const prescriptionSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        default: Date.now,
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
    notes: {
        type: String,
    },
});

module.exports = mongoose.model("Prescription", prescriptionSchema);
