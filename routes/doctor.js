// Doctor Router
const doctorRouter = require("express").Router();
const requirePermission = require("./permission");
const Appointment = require("../models/Appointment");
const PatientRecord = require("../models/PatientRecord");
const HealthIssue = require("../models/HealthIssue");
const Prescription = require("../models/Prescription");

// Define the GET method to view appointments
doctorRouter.get(
    "/appointments/:patientId?",
    requirePermission("view_appointments"),
    async (req, res) => {
        try {
            let appointments;
            if (req.params.patientId) {
                // If a patientId is provided, return appointments for that patient
                appointments = await Appointment.find({
                    doctor: req.user._id,
                    patient: req.params.patientId,
                });
            } else {
                // If no patientId is provided, return all appointments
                appointments = await Appointment.find({ doctor: req.user._id });
            }
            res.json(appointments);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Define the DELETE method to delete appointments
doctorRouter.delete(
    "/appointments/:appointmentId",
    requirePermission("delete_appointments"),
    async (req, res) => {
        try {
            // Delete the appointment for the provided appointmentId
            const deletedAppointment = await Appointment.findOneAndDelete({
                _id: req.params.appointmentId,
                doctor: req.user._id,
            });
            if (!deletedAppointment) {
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });
            }
            res.json({ message: "Appointment deleted" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Define the PUT method to change the status of appointments
doctorRouter.put(
    "/appointments/:appointmentId",
    requirePermission("change_appointment_status"),
    async (req, res) => {
        try {
            // Get the new status from the request data
            const newStatus = req.body.status;
            if (!newStatus) {
                return res.status(400).json({ message: "No status provided" });
            }
            // Change the status of the appointment for the provided appointmentId
            const updatedAppointment = await Appointment.findOneAndUpdate(
                { _id: req.params.appointmentId, doctor: req.user._id },
                { status: newStatus },
                { new: true }
            );
            if (!updatedAppointment) {
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });
            }
            res.json(updatedAppointment);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Allow doctor to get all the patient records
doctorRouter.get(
    "/patient-records/:patientId",
    requirePermission("view_patient_records"),
    async (req, res) => {
        try {
            // Find all patient records for the given patient
            const patientRecords = await PatientRecord.find({
                patient: req.params.patientId,
            });

            // For each patient record, populate the healthIssues field with the corresponding health issue data
            for (let i = 0; i < patientRecords.length; i++) {
                const healthIssues = await HealthIssue.find({
                    _id: { $in: patientRecords[i].healthIssues },
                });
                patientRecords[i].healthIssues = healthIssues;
            }

            res.json(patientRecords);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Allow doctor to update the medical record
doctorRouter.put(
    "/patient-records/:patientRecordId",
    requirePermission("update_patient_records"),
    async (req, res) => {
        try {
            // Find the patient record to be updated
            const patientRecord = await PatientRecord.findById(
                req.params.patientRecordId
            );

            // Update the patient record with the request body
            Object.assign(patientRecord, req.body);

            // Save the updated patient record
            await patientRecord.save();

            res.json(patientRecord);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

doctorRouter.get("/health-status", async (req, res) => {
    const { patientId, healthStatus } = req.query;

    if (!patientId || !healthStatus) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        const patientRecord = await PatientRecord.findOne({
            patient: patientId,
        }).populate("healthIssues");

        const healthIssue = patientRecord.healthIssues.find(
            (issue) => issue.healthStatus === healthStatus
        );

        if (!healthIssue) {
            return res.status(404).json({ error: "Health issue not found" });
        }

        return res.json({ healthStatus, medicines: healthIssue.medicines });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Create a new prescription
doctorRouter.post("/prescription", async (req, res) => {
    try {
        const prescription = new Prescription(req.body);
        await prescription.save();
        res.status(201).json(prescription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update an existing prescription
doctorRouter.put("/prescription/:id", async (req, res) => {
    try {
        const prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found" });
        }
        res.json(prescription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete a prescription
doctorRouter.delete("/prescription/:id", async (req, res) => {
    try {
        const prescription = await Prescription.findByIdAndDelete(
            req.params.id
        );
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found" });
        }
        res.json({ message: "Prescription deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = doctorRouter;
