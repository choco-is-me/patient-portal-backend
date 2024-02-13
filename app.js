const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { expressjwt: expressJwt } = require("express-jwt");
const router = express.Router();
require("dotenv").config();

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

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

Role.find({}).then((roles) => {
    if (roles.length === 0) {
        doctorRole.save();
        nurseRole.save();
        patientRole.save();
        adminRole.save();
    }
});

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
    async (req, res) => {
        try {
            // ... route logic ...
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);
patientRouter.post(
    "/request-doctor",
    requireRole("request_doctor"),
    (req, res) => {
        // ... route logic ...
    }
);
patientRouter.get(
    "/consultations",
    requireRole("view_consultation"),
    (req, res) => {
        // ... route logic ...
    }
);
patientRouter.get(
    "/prescriptions",
    requireRole("view_prescription"),
    (req, res) => {
        // ... route logic ...
    }
);
router.use("/api/patient", patientRouter);

// Doctor Router
const doctorRouter = express.Router();
doctorRouter.get(
    "/consultations",
    requireRole("conduct_consultation"),
    (req, res) => {
        // ... route logic ...
    }
);
doctorRouter.post(
    "/prescriptions",
    requireRole("prescribe_medication"),
    (req, res) => {
        // ... route logic ...
    }
);
doctorRouter.get(
    "/appointments",
    requireRole("view_appointments"),
    (req, res) => {
        // ... route logic ...
    }
);
doctorRouter.put(
    "/medical-records",
    requireRole("update_medical_records"),
    (req, res) => {
        // ... route logic ...
    }
);
router.use("/api/doctor", doctorRouter);

// Nurse Router
const nurseRouter = express.Router();
nurseRouter.get(
    "/appointments",
    requireRole("manage_appointments"),
    (req, res) => {
        // ... route logic ...
    }
);
nurseRouter.post(
    "/follow-ups",
    requireRole("patient_follow_up"),
    (req, res) => {
        // ... route logic ...
    }
);
router.use("/api/nurse", nurseRouter);

// Administrator Router
const adminRouter = express.Router();
adminRouter.get("/users", requireRole("manage_users"), (req, res) => {
    try {
        // ... route logic ...
    } catch (error) {
        res.status(500).send(error.message);
    }
});
adminRouter.post("/users", requireRole("manage_users"), async (req, res) => {
    try {
        // ... route logic ...
    } catch (error) {
        res.status(500).send(error.message);
    }
});
adminRouter.put("/users", requireRole("manage_users"), async (req, res) => {
    try {
        // ... route logic ...
    } catch (error) {
        res.status(500).send(error.message);
    }
});
adminRouter.delete("/users", requireRole("manage_users"), async (req, res) => {
    try {
        // ... route logic ...
    } catch (error) {
        res.status(500).send(error.message);
    }
});
adminRouter.get("/access", requireRole("manage_access"), (req, res) => {
    // ... route logic ...
});
adminRouter.post("/access", requireRole("manage_access"), (req, res) => {
    // ... route logic ...
});
adminRouter.put("/access", requireRole("manage_access"), (req, res) => {
    // ... route logic ...
});
adminRouter.delete("/access", requireRole("manage_access"), (req, res) => {
    // ... route logic ...
});
adminRouter.get("/data", requireRole("analyze_data"), (req, res) => {
    // ... route logic ...
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
