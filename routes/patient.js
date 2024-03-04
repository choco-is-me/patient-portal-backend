// Patient Router
const mongoose = require("mongoose");
const patientRouter = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const User = require("../models/UserModel");
const Role = require("../models/RoleModel");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const requirePermission = require("./permission");

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

        // Create a new user
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword,
            role: patientRole._id, // Use the _id of the fetched Role document
            revokedPermissions: [],
        });

        // Save the new user
        await newUser.save();

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
            // On successful login, create JWT
            const token = jwt.sign(
                {
                    id: user._id.toString(), // Include user's _id in the payload
                    username: user.username,
                    role: user.role._id.toString(),
                    revokedPermissions: user.revokedPermissions,
                },
                secret,
                { expiresIn: "1h" }
            );
            res.status(200).send({ token });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Book an appointment
patientRouter.post(
    "/appointments",
    requirePermission("book_appointment"),
    async (req, res) => {
        const { patientId, doctorId, date, time, description } = req.body;

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

        try {
            const newAppointment = new Appointment({
                patient: patientId,
                doctor: doctorId,
                date,
                time,
                description,
            });

            const savedAppointment = await newAppointment.save();

            res.json(savedAppointment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all appointments
patientRouter.get(
    "/:patientId/appointments",
    requirePermission("view_appointments"),
    async (req, res) => {
        const patientId = req.params.patientId;

        // Check if patientId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({ error: "Invalid patientId." });
        }

        // Check if the patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(400).json({ error: "Patient does not exist" });
        }

        try {
            const appointments = await Appointment.find({
                patient: patientId,
            }).populate("doctor");
            res.json(appointments);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get appointment by id
patientRouter.get(
    "/appointments/:appointmentId",
    requirePermission("view_appointment"),
    async (req, res) => {
        const appointmentId = req.params.appointmentId;

        // Check if appointmentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ error: "Invalid appointmentId." });
        }

        try {
            const appointment = await Appointment.findById(
                appointmentId
            ).populate("patient doctor");
            if (!appointment) {
                return res
                    .status(404)
                    .json({ error: "Appointment not found." });
            }
            res.json(appointment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Update an appointment
patientRouter.put(
    "/appointments/:appointmentId",
    requirePermission("update_appointment"),
    async (req, res) => {
        const appointmentId = req.params.appointmentId;

        // Check if appointmentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ error: "Invalid appointmentId." });
        }

        const { date, time, description, status } = req.body;

        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res
                    .status(404)
                    .json({ error: "Appointment not found." });
            }

            if (date) appointment.date = date;
            if (time) appointment.time = time;
            if (description) appointment.description = description;
            if (status) appointment.status = status;

            const updatedAppointment = await appointment.save();

            res.json(updatedAppointment);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Delete an appointment
patientRouter.delete(
    "/appointments/:appointmentId",
    requirePermission("delete_appointment"),
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

            await appointment.remove();

            res.json({ message: "Appointment deleted successfully." });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all appointments from a doctor
patientRouter.get(
    "/appointments/:doctorId/appointments",
    requirePermission("view_appointments"),
    async (req, res) => {
        const doctorId = req.params.doctorId;

        // Check if doctorId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ error: "Invalid doctorId." });
        }

        // Check if the doctor exists
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return res.status(400).json({ error: "Doctor does not exist" });
        }

        try {
            const appointments = await Appointment.find({
                doctor: doctorId,
            }).populate("patient");
            res.json(appointments);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all prescriptions of a patient
patientRouter.get(
    "/prescriptions/:patientId",
    requirePermission("view_prescription"),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.patientId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const prescriptions = await Prescription.find({
                patient: req.params.patientId,
            });
            res.json(prescriptions);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
);

// Get a prescription by id
patientRouter.get(
    "/prescriptions/:prescriptionId",
    requirePermission("view_prescription"),
    async (req, res) => {
        try {
            const prescription = await Prescription.findById(
                req.params.prescriptionId
            );
            if (prescription == null) {
                return res
                    .status(404)
                    .json({ message: "Cannot find prescription" });
            }
            const user = await User.findById(prescription.patient);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(prescription);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }
);

module.exports = patientRouter;
