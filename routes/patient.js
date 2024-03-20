// Patient Router
const mongoose = require("mongoose");
const patientRouter = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const User = require("../models/UserModel");
const Role = require("../models/RoleModel");
const Appointment = require("../models/Appointment");
const PatientRecord = require("../models/PatientRecord");
const Prescription = require("../models/Prescription");
const requirePermission = require("./permission");
const createFingerprint = require("./fingerprint");

// Register
patientRouter.post("/register", async (req, res) => {
    try {
        // Check if username already exists
        const existingUser = await User.findOne({
            username: req.body.username,
        });
        if (existingUser) {
            return res.status(400).send("Username already exists");
        }

        // Fetch the Patient role from the database
        const patientRole = await Role.findOne({ name: "Patient" });
        if (!patientRole) {
            return res.status(500).send("Patient role not found");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create a new user with additional information
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword,
            role: patientRole._id, // Use the _id of the fetched Role document
            revokedPermissions: [],
            dateOfBirth: req.body.dateOfBirth,
            homeAddress: req.body.homeAddress,
            phoneNumber: req.body.phoneNumber,
        });

        // Save the new user
        await newUser.save();

        // Save additional information to PatientRecord notes
        const patientRecord = new PatientRecord({
            patient: newUser._id,
            doctor: null, // You can set the doctor later
            appointment: null, // You can set the appointment later
            date: new Date(),
            healthIssues: [],
            notes: `Date of Birth: ${req.body.dateOfBirth}, Home Address: ${req.body.homeAddress}, Phone Number: ${req.body.phoneNumber}`,
        });

        await patientRecord.save();

        res.status(200).send("User registered successfully. Please log in.");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Login
patientRouter.post("/login", async (req, res) => {
    try {
        // Find the user
        const user = await User.findOne({
            username: req.body.username,
        }).populate("role");
        if (!user) {
            res.status(401).send("User not found");
        } else if (!(await bcrypt.compare(req.body.password, user.password))) {
            res.status(401).send("Incorrect password");
        } else {
            // Generate fingerprint once
            const fingerprint = createFingerprint(user);

            // On successful login, create JWT with the generated fingerprint
            const token = jwt.sign(
                {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role.name, // Changed this line
                    revokedPermissions: user.revokedPermissions,
                    fingerprint: fingerprint,
                },
                secret,
                { expiresIn: "1h" }
            );
            // Set cookie with the same fingerprint
            res.cookie("fingerprint", fingerprint, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
            });
            res.status(200).send({ token });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get the patient's own medical records
patientRouter.get(
    "/myRecords",
    requirePermission("view_own_records"),
    async (req, res) => {
        try {
            // Find the patient's records using the patient's id
            const records = await PatientRecord.find({ patient: req.user._id });

            // If no records are found, return a 404 status
            if (!records) {
                return res.status(404).json({ message: "No records found" });
            }

            // Find the patient's username using the patient's id
            const user = await User.findById(req.user._id);

            // Convert the records to a plain JavaScript object
            const recordsPlainObject = records.map((record) =>
                record.toObject()
            );

            // Add the patient's username to the response
            res.json({ username: user.username, records: recordsPlainObject });
        } catch (error) {
            // If there's an error, return a 500 status
            res.status(500).json({ message: "Server error" });
        }
    }
);

// Get all doctors
patientRouter.get(
    "/doctors",
    requirePermission("view_doctors"),
    async (req, res) => {
        // Find the 'Doctor' role
        const doctorRole = await Role.findOne({ name: "Doctor" });

        if (!doctorRole) {
            return res.status(404).json({ message: "No doctor found" });
        }

        // Find all users with the 'Doctor' role
        const doctors = await User.find({ role: doctorRole._id }).select(
            "username"
        );

        // Convert the doctors to a plain JavaScript object
        const doctorsPlainObject = doctors.map((doctor) => doctor.toObject());

        // Return the list of doctors
        res.json(doctorsPlainObject);
    }
);

// Book an appointment
patientRouter.post(
    "/appointments/:doctorId",
    requirePermission("book_appointment"),
    async (req, res) => {
        const { date, time, description } = req.body;
        const patientId = req.user._id; // Get patientId from logged-in user
        const doctorId = req.params.doctorId; // Get doctorId from URL parameter

        // Check if the patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(400).json({ error: "Patient does not exist" });
        }

        // Check if the doctor exists
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return res.status(400).json({ error: "Doctor does not exist" });
        }

        // Find or create the patient record
        let patientRecord = await PatientRecord.findOne({ patient: patientId });
        if (!patientRecord) {
            patientRecord = new PatientRecord({
                patient: patientId,
                doctors: [],
                appointments: [],
                healthIssues: [],
                notes: "",
            });
            await patientRecord.save();
        }

        try {
            const newAppointment = new Appointment({
                patient: patientId,
                doctor: doctorId,
                date,
                time,
                description,
            });

            const savedAppointment = await newAppointment.save();

            // Add the doctor's ID and the appointment ID to the patient record
            patientRecord.doctors.push(doctorId);
            patientRecord.appointments.push(savedAppointment._id);

            // Save the updated patient record
            await patientRecord.save();

            res.json(savedAppointment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all appointments of the logged in patient
patientRouter.get(
    "/appointments",
    requirePermission("view_appointments_for_patient"),
    async (req, res) => {
        const patientId = req.user._id; // Get patientId from logged-in user

        // Check if patientId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({ error: "Invalid patient ID" });
        }

        // Check if the patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(400).json({ error: "Patient does not exist" });
        }

        try {
            const appointments = await Appointment.find({
                patient: patientId,
            })
                .populate("patient", "username")
                .populate("doctor", "username");

            // Convert the appointments to a plain JavaScript object
            const appointmentsPlainObject = appointments.map((appointment) =>
                appointment.toObject()
            );

            res.json(appointmentsPlainObject);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Update an appointment on Pending status
patientRouter.put(
    "/appointments/:appointmentId",
    requirePermission("update_appointment"),
    async (req, res) => {
        const appointmentId = req.params.appointmentId;

        // Check if appointmentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ error: "Invalid appointmentId." });
        }

        const { date, time, description } = req.body; // Removed status

        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res
                    .status(404)
                    .json({ error: "Appointment not found." });
            }

            // Check if the logged in patient is the one who booked the appointment
            if (appointment.patient.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    error: "You do not have permission to update this appointment.",
                });
            }

            // Check if the appointment status is Pending
            if (appointment.status !== "Pending") {
                return res.status(400).json({
                    error: "Only appointments with status 'Pending' can be updated.",
                });
            }

            if (date) appointment.date = date;
            if (time) appointment.time = time;
            if (description) appointment.description = description;

            const updatedAppointment = await appointment.save();

            res.json(updatedAppointment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Cancel an appointment on Pending status
patientRouter.delete(
    "/appointments/:appointmentId",
    requirePermission("cancel_appointment_on_pending"),
    async (req, res) => {
        const appointmentId = req.params.appointmentId;

        // Check if appointmentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ error: "Invalid appointmentId." });
        }

        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res
                    .status(404)
                    .json({ error: "Appointment not found." });
            }

            // Check if the logged in patient is the one who booked the appointment
            if (appointment.patient.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    error: "You do not have permission to delete this appointment.",
                });
            }

            // Check if the appointment status is Pending
            if (appointment.status !== "Pending") {
                return res.status(400).json({
                    error: "Only appointments with status 'Pending' can be deleted.",
                });
            }

            // Use deleteOne instead of remove
            await Appointment.deleteOne({ _id: appointmentId });

            res.json({ message: "Appointment deleted successfully." });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all prescriptions of the logged-in patient
patientRouter.get(
    "/prescriptions",
    requirePermission("view_prescription"),
    async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const prescriptions = await Prescription.find({
                patient: req.user._id,
            });
            res.json(prescriptions);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

module.exports = patientRouter;
