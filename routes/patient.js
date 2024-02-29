// Patient Router (Included public routes)
const patientRouter = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const { User } = require("../models/UserModel");
const { Role } = require("../models/RoleModel");
const requirePermission = require("./permission");

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

patientRouter.post(
    "/appointments",
    requirePermission("book_appointment"),
    (req, res) => {
        res.send("Book an appointment");
    }
);
patientRouter.post(
    "/request-doctor",
    requirePermission("request_doctor"),
    (req, res) => {
        res.send("Request a doctor");
    }
);
patientRouter.get(
    "/consultations",
    requirePermission("view_consultation"),
    (req, res) => {
        res.send("View consultations");
    }
);
patientRouter.get(
    "/prescriptions",
    requirePermission("view_prescription"),
    (req, res) => {
        res.send("View prescriptions");
    }
);

module.exports = patientRouter;
