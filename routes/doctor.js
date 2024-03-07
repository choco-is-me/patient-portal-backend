// Doctor Router
const doctorRouter = require("express").Router();
const requirePermission = require("./permission");
const Appointment = require("../models/Appointment");
const PatientRecord = require("../models/PatientRecord");
const HealthIssue = require("../models/HealthIssue");
const Prescription = require("../models/Prescription");

// Define the GET method to view appointments
doctorRouter.get(
    "/appointments",
    requirePermission("view_appointments"),
    async (req, res) => {
        try {
            // Find all appointments where the doctor is the logged-in user
            const appointments = await Appointment.find({
                doctor: req.user._id,
            })
                .populate("patient", "username") // populate the patient field with the username from the User model
                .populate("doctor", "username") // populate the doctor field with the username from the User model
                .select("date time description status"); // select the necessary fields from the Appointment model

            // If no appointments found for the logged-in doctor, return an error message
            if (appointments.length === 0) {
                return res.status(404).json({
                    message: "No appointments found for this doctor.",
                });
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
                { new: true, runValidators: true }
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
    "/patient-records",
    requirePermission("view_patient_records"),
    async (req, res) => {
        try {
            // Get the doctor's id from the request
            const doctorId = req.user._id;

            // Find all appointments where the doctor is the current user
            const appointments = await Appointment.find({ doctor: doctorId });

            // Extract the patient ids from the appointments
            const patientIds = appointments.map(
                (appointment) => appointment.patient
            );

            // Find all patient records where the patient id is in the list of patients who have an appointment with the doctor
            const patientRecords = await PatientRecord.find({
                patient: { $in: patientIds },
            }).populate("patient", "username");

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

// Autofill prescription based on health status that the doctor selected
doctorRouter.put(
    "/patient-records/:patientRecordId/health-status",
    requirePermission("update_patient_records"),
    async (req, res) => {
        try {
            // Find the patient record to be updated
            const patientRecord = await PatientRecord.findById(
                req.params.patientRecordId
            );

            // Check if the doctor's ID is in the patient record
            if (!patientRecord.doctors.includes(req.user._id)) {
                return res.status(403).json({
                    message:
                        "You do not have permission to update this record.",
                });
            }

            // Get the health status from the request body
            const healthStatus = req.body.healthStatus;

            // Find the health issue in the HealthIssue collection
            const healthIssue = await HealthIssue.findOne({
                healthStatus: healthStatus,
            });

            if (!healthIssue) {
                return res.status(400).json({
                    message: "The provided health status does not exist.",
                });
            }

            // Update the healthStatus field with the health status
            patientRecord.healthStatus = healthStatus;

            // Save the updated patient record
            await patientRecord.save();

            // Return the updated health status and associated medicines
            return res.json({
                healthStatus: healthStatus,
                medicines: healthIssue.medicines,
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Add or update a health issue
doctorRouter.post(
    "/healthIssue",
    requirePermission("create_healthIssue"),
    async (req, res) => {
        try {
            const { healthStatus, medicines } = req.body;

            // Find the health issue with the given healthStatus
            let healthIssue = await HealthIssue.findOne({ healthStatus });

            if (healthIssue) {
                // If the health issue exists, update the medicines
                healthIssue.medicines = medicines;
            } else {
                // If the health issue does not exist, create a new one
                healthIssue = new HealthIssue({ healthStatus, medicines });
            }

            // Save the health issue
            await healthIssue.save();

            res.status(201).json(healthIssue);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Delete a health issue
doctorRouter.delete(
    "/healthIssue",
    requirePermission("delete_healthIssue"),
    async (req, res) => {
        try {
            const { healthStatus } = req.body;

            // Find the health issue with the given healthStatus and delete it
            const healthIssue = await HealthIssue.findOneAndDelete({
                healthStatus,
            });

            if (!healthIssue) {
                return res
                    .status(404)
                    .json({ error: "Health issue not found" });
            }

            res.status(200).json({
                message: "Health issue deleted successfully",
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Update an existing prescription
doctorRouter.put(
    "/prescription/:id",
    requirePermission("update_prescription"),
    async (req, res) => {
        try {
            const prescription = await Prescription.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!prescription) {
                return res
                    .status(404)
                    .json({ error: "Prescription not found" });
            }
            res.json(prescription);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Delete a prescription
doctorRouter.delete(
    "/prescription/:id",
    requirePermission("delete_prescription"),
    async (req, res) => {
        try {
            const prescription = await Prescription.findByIdAndDelete(
                req.params.id
            );
            if (!prescription) {
                return res
                    .status(404)
                    .json({ error: "Prescription not found" });
            }
            res.json({ message: "Prescription deleted successfully" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
);

module.exports = doctorRouter;
