const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { expressjwt: expressJwt } = require("express-jwt");
const router = express.Router();
require("dotenv").config();

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const adminPassword = process.env.ADMIN_PASSWORD;

// Define User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
});

// Define Role Schema
const RoleSchema = new mongoose.Schema({
    name: String,
    permissions: [String],
});

// Create Models
const User = mongoose.model("User", UserSchema);
const Role = mongoose.model("Role", RoleSchema);

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

const adminUser = new User({
    username: "Admin",
    password: "", // We'll set this later
    role: adminRole._id,
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
        ]); // Add await here
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
                    // Add await here
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

// Update the User Schema to include role
UserSchema.add({ role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" } });

mongoose.connect(
    `mongodb+srv://${dbUser}:${dbPass}@patientportaldata.uu1v0ci.mongodb.net/?retryWrites=true&w=majority`
);

// Create an Express application
const app = express();
const port = 3000;
app.use(express.json());

// Secret for JWT signing
const secret = process.env.JWT_SECRET;

// Middleware to check JWT
app.use(
    expressJwt({ secret: secret, algorithms: ["HS256"] }).unless({
        path: ["/api/patient/register", "/api/patient/login"],
    })
);

// Middleware for role checking
function requireRole(role) {
    return function (req, res, next) {
        if (!req.user.role.permissions.includes(role)) {
            res.status(403).send("Forbidden");
        } else {
            next();
        }
    };
}

// Patient Router
const patientRouter = express.Router();
patientRouter.post("/register", async (req, res) => {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create a new user
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword,
            role: patientRole._id, // Assuming the role is patient for this register route
        });

        // Save the new user
        await newUser.save();

        // On successful registration, create JWT
        const token = jwt.sign(
            { username: newUser.username, role: patientRole.name },
            secret
        );
        res.json({ token: token });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
patientRouter.post("/login", async (req, res) => {
    try {
        // Find the user
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            res.status(401).send("User not found");
        } else if (!(await bcrypt.compare(req.body.password, user.password))) {
            res.status(401).send("Incorrect password");
        } else {
            // On successful login, create JWT
            const token = jwt.sign(
                { username: user.username, role: user.role.name },
                secret
            );
            res.json({ token: token });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

patientRouter.post(
    "/appointments",
    requireRole("book_appointment"),
    (req, res) => {
        res.send("Book an appointment");
    }
);
patientRouter.post(
    "/request-doctor",
    requireRole("request_doctor"),
    (req, res) => {
        res.send("Request a doctor");
    }
);
patientRouter.get(
    "/consultations",
    requireRole("view_consultation"),
    (req, res) => {
        res.send("View consultations");
    }
);
patientRouter.get(
    "/prescriptions",
    requireRole("view_prescription"),
    (req, res) => {
        res.send("View prescriptions");
    }
);
router.use("/api/patient", patientRouter);

// Doctor Router
const doctorRouter = express.Router();
doctorRouter.get(
    "/consultations",
    requireRole("conduct_consultation"),
    (req, res) => {
        res.send("Conduct consultations");
    }
);
doctorRouter.post(
    "/prescriptions",
    requireRole("prescribe_medication"),
    (req, res) => {
        res.send("Prescribe medications");
    }
);
doctorRouter.get(
    "/appointments",
    requireRole("view_appointments"),
    (req, res) => {
        res.send("View appointments");
    }
);
doctorRouter.put(
    "/medical-records",
    requireRole("update_medical_records"),
    (req, res) => {
        res.send("Update medical records");
    }
);
router.use("/api/doctor", doctorRouter);

// Nurse Router
const nurseRouter = express.Router();
nurseRouter.get(
    "/appointments",
    requireRole("manage_appointments"),
    (req, res) => {
        res.send("Manage appointments");
    }
);
nurseRouter.post(
    "/follow-ups",
    requireRole("patient_follow_up"),
    (req, res) => {
        res.send("Patient follow-ups");
    }
);
router.use("/api/nurse", nurseRouter);

// Admin Router
const adminRouter = express.Router();

// Get all users
adminRouter.get("/users", requireRole("manage_users"), async (req, res) => {
    const users = await User.find().populate("role");
    res.json(users);
});

// Create a new user
adminRouter.post("/users", requireRole("manage_users"), async (req, res) => {
    try {
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
});

// Update a user
adminRouter.put("/users", requireRole("manage_users"), async (req, res) => {
    try {
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
});

// Delete a user
adminRouter.delete("/users", requireRole("manage_users"), async (req, res) => {
    try {
        // Delete the user
        await User.findByIdAndDelete(req.body._id);

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Grant access
adminRouter.post("/access", requireRole("manage_access"), async (req, res) => {
    try {
        // Grant access to a user
        const user = await User.findById(req.body.userId);
        user.role = req.body.role;
        await user.save();

        res.json({ message: "Access granted successfully" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Revoke access
adminRouter.put("/access", requireRole("manage_access"), async (req, res) => {
    try {
        // Revoke access from a user
        const user = await User.findById(req.body.userId);
        user.role = patientRole._id;
        await user.save();

        res.json({ message: "Access revoked successfully" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// View access
adminRouter.get("/access", requireRole("manage_access"), async (req, res) => {
    try {
        // Get all roles
        const roles = await Role.find();

        // Get all permissions
        const permissions = await Permission.find();

        // Create an object to store the access information
        const access = {};

        // Iterate over the roles
        for (const role of roles) {
            // Add the role name to the access object
            access[role.name] = {};

            // Iterate over the permissions
            for (const permission of permissions) {
                // Check if the role has the permission
                if (role.permissions.includes(permission.name)) {
                    // Add the permission to the access object
                    access[role.name][permission.name] = true;
                } else {
                    // Add the permission to the access object with a value of false
                    access[role.name][permission.name] = false;
                }
            }
        }

        // Send the access object to the client
        res.json(access);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.use("/api/admin", adminRouter);

// Use the router in your app
app.use("/api/doctor", doctorRouter);
app.use("/api/nurse", nurseRouter);
app.use("/api/patient", patientRouter);
app.use("/api/admin", adminRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
