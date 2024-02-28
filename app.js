require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { expressjwt: expressJwt } = require("express-jwt");
const router = express.Router();
const bodyParser = require("body-parser");
const cors = require("cors");
const https = require("https");
const fs = require("fs");

const connectDB = require("./connectMongo");

connectDB();

const { User, Role } = require("./models");

// Add values to the Role Schema
const doctorRole = new Role({
    name: "Doctor",
    permissions: [
        "conduct_consultation",
        "prescribe_medication",
        "view_appointments",
        "update_medical_records",
    ],
});

const nurseRole = new Role({
    name: "Nurse",
    permissions: ["manage_appointments", "patient_follow_up"],
});

const patientRole = new Role({
    name: "Patient",
    permissions: [
        "register_account",
        "login",
        "book_appointment",
        "request_doctor",
        "view_consultation",
        "view_prescription",
    ],
});

const adminRole = new Role({
    name: "Administrator",
    permissions: [
        "manage_users",
        "manage_access",
        "analyze_data",
        ...doctorRole.permissions,
        ...nurseRole.permissions,
        ...patientRole.permissions,
    ],
});

const adminPassword = process.env.ADMIN_PASSWORD;
const adminUser = new User({
    username: "Admin",
    password: "",
    role: adminRole._id,
    revokedPermissions: [], // New field
});

// Use an IIFE (Immediately Invoked Function Expression) to use async/await at the top level
(async function () {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: "Admin" });

    if (!existingAdmin) {
        adminUser.password = await bcrypt.hash(adminPassword, 10);
        try {
            await adminUser.save();
            console.log("Admin user saved successfully!");
        } catch (err) {
            console.error(err);
        }
    } else {
        console.log("Admin user already exists.");
    }
})();

Role.find({}).then(async (roles) => {
    // Add async here
    if (roles.length === 0) {
        // If no roles exist, create them
        await Promise.all([
            doctorRole.save(),
            nurseRole.save(),
            patientRole.save(),
            adminRole.save(),
        ]);
    } else {
        // If roles exist, check each one for updates
        for (let role of roles) {
            let updatedRole;
            switch (role.name) {
                case "Doctor":
                    updatedRole = doctorRole;
                    break;
                case "Nurse":
                    updatedRole = nurseRole;
                    break;
                case "Patient":
                    updatedRole = patientRole;
                    break;
                case "Administrator":
                    updatedRole = adminRole;
                    break;
            }
            // If the permissions don't match, update the role
            if (!arraysEqual(role.permissions, updatedRole.permissions)) {
                await Role.updateOne(
                    { _id: role._id },
                    { $set: { permissions: updatedRole.permissions } }
                );
            }
        }
    }
});

// Helper function to check if two arrays are equal
function arraysEqual(a, b) {
    return a.sort().toString() === b.sort().toString();
}

// Create an Express application
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Secret for JWT signing
const secret = process.env.JWT_SECRET;

// Middleware to check JWT
app.use(
    expressJwt({ secret: secret, algorithms: ["HS256"] }).unless({
        path: ["/api/patient/register", "/api/patient/login"],
    })
);

// Middleware for permission checking
function requirePermission(permission) {
    return function (req, res, next) {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(403).send("Token is not provided");
        }

        const token = authHeader.split(" ")[1]; // Extract the token from the Bearer

        jwt.verify(token, secret, async (err, decodedToken) => {
            if (err) {
                console.log(err);
                return res.status(403).send("Invalid token");
            }

            // Find the user's role
            const userRole = await Role.findById(decodedToken.role);

            // Find the user
            const user = await User.findById(decodedToken.id);

            // Check if userRole is null
            if (!userRole) {
                console.log(`Role not found with id: ${decodedToken.role}`);
                return res.status(500).send("Role not found");
            }

            // Check if the role has the required permission
            if (
                !userRole.permissions.includes(permission) ||
                user.revokedPermissions.includes(permission)
            ) {
                return res.status(403).send("Forbidden");
            }

            // If permission exists, proceed to the next middleware function
            next();
        });
    };
}

// Patient Router (Included public routes)
const patientRouter = express.Router();
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

// Doctor Router
const doctorRouter = express.Router();
doctorRouter.get(
    "/consultations",
    requirePermission("conduct_consultation"),
    (req, res) => {
        res.send("Conduct consultations");
    }
);
doctorRouter.post(
    "/prescriptions",
    requirePermission("prescribe_medication"),
    (req, res) => {
        res.send("Prescribe medications");
    }
);
doctorRouter.get(
    "/appointments",
    requirePermission("view_appointments"),
    (req, res) => {
        res.send("View appointments");
    }
);
doctorRouter.put(
    "/medical-records",
    requirePermission("update_medical_records"),
    (req, res) => {
        res.send("Update Medical Records");
    }
);

// Nurse Router
const nurseRouter = express.Router();
nurseRouter.get(
    "/appointments",
    requirePermission("manage_appointments"),
    (req, res) => {
        res.send("Manage appointments");
    }
);
nurseRouter.post(
    "/follow-ups",
    requirePermission("patient_follow_up"),
    (req, res) => {
        res.send("Patient follow-ups");
    }
);

// Admin Router
const adminRouter = express.Router();

// Get all users
adminRouter.get(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        const users = await User.find().populate("role");
        res.json(users);
    }
);

// Create a new user
adminRouter.post(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Check if username already exists
            const existingUser = await User.findOne({
                username: req.body.username,
            });
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            // Create a new user
            const newUser = new User({
                username: req.body.username,
                password: hashedPassword,
                role: req.body.role,
            });

            // Save the new user
            await newUser.save();

            res.json(newUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Update a user
adminRouter.put(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Check if username already exists
            const existingUser = await User.findOne({
                username: req.body.username,
            });
            if (
                existingUser &&
                String(existingUser._id) !== String(req.body._id)
            ) {
                return res.status(400).send("Username already exists");
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            // Update the user
            const updatedUser = await User.findByIdAndUpdate(
                req.body._id,
                {
                    username: req.body.username,
                    password: hashedPassword,
                    role: req.body.role,
                },
                { new: true }
            );

            res.json(updatedUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Delete a user
adminRouter.delete(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Delete the user
            await User.findByIdAndDelete(req.body._id);

            res.json({ message: "User deleted successfully" });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Update role (Promote or demote a user)
adminRouter.post(
    "/access",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            const user = await User.findById(req.body.userId);
            user.role = req.body.role;
            await user.save();

            res.json({ message: "Role granted successfully" });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Revoke permission
adminRouter.post(
    "/revoke",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            const user = await User.findById(req.body.userId);
            if (!user) {
                return res.status(404).send("User not found");
            }

            const permission = req.body.permission;
            const userRole = await Role.findById(user.role);
            if (!userRole.permissions.includes(permission)) {
                return res.status(400).send("Invalid permission");
            }

            if (!user.revokedPermissions.includes(permission)) {
                user.revokedPermissions.push(permission);
                await user.save();
                res.json({ message: "Permission revoked successfully" });
            } else {
                res.json({ message: "Permission already revoked" });
            }
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// View all whole role schema
adminRouter.get(
    "/access",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            // Fetch all roles
            const roles = await Role.find({}, "name permissions");

            // Return roles
            res.json(roles);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

router.use("/api/patient", patientRouter);
router.use("/api/doctor", doctorRouter);
router.use("/api/nurse", nurseRouter);
router.use("/api/admin", adminRouter);

// Use the router in your app
app.use("/api/doctor", doctorRouter);
app.use("/api/nurse", nurseRouter);
app.use("/api/patient", patientRouter);
app.use("/api/admin", adminRouter);

// start the server listening for requests
const port = process.env.PORT;

// https
//     .createServer(
//         {
//             key: fs.readFileSync("server.key"),
//             cert: fs.readFileSync("server.cert"),
//         },
//         app
//     )
//     .listen(3000, function () {
//         console.log("Server is running at https://localhost:" + port + "/");
//     });

app.listen(port, function () {
    console.log("Server is running at http://localhost:" + port + "/");
});
