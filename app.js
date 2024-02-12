const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const router = express.Router();
require("dotenv").config();

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

mongoose.connect(
    `mongodb+srv://${dbUser}:${dbPass}@patientportaldata.uu1v0ci.mongodb.net/?retryWrites=true&w=majority`
);

// Define User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
});

// Create Models
const User = mongoose.model("User", UserSchema);

// Create an Express application
const app = express();
const port = 3000;

// Secret for JWT signing
const secret = "your-secret-key";

// Middleware to check JWT
app.use(
    expressJwt({ secret: secret, algorithms: ["HS256"] }).unless({
        path: ["/api/patient/register", "/api/patient/login"],
    })
);

// Middleware for role checking
function requireRole(role) {
    return function (req, res, next) {
        if (req.user.role !== role) {
            res.status(403).send("Forbidden");
        } else {
            next();
        }
    };
}

// Patient Router
const patientRouter = express.Router();
patientRouter.post("/register", async (req, res) => {
    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create a new user
    const newUser = new User({
        username: req.body.username,
        password: hashedPassword,
        role: "patient", // assuming the role is patient for this register route
    });

    // Save the new user
    newUser.save((err, user) => {
        if (err) {
            res.status(500).send(err);
        } else {
            // On successful registration, create JWT
            const token = jwt.sign(
                { username: newUser.username, role: newUser.role },
                secret
            );
            res.json({ token: token });
        }
    });
});
patientRouter.post("/login", (req, res) => {
    // Find the user
    User.findOne({ username: req.body.username }, async (err, user) => {
        if (err) {
            res.status(500).send(err);
        } else if (!user) {
            res.status(401).send("User not found");
        } else if (!(await bcrypt.compare(req.body.password, user.password))) {
            res.status(401).send("Incorrect password");
        } else {
            // On successful login, create JWT
            const token = jwt.sign(
                { username: user.username, role: user.role },
                secret
            );
            res.json({ token: token });
        }
    });
});
patientRouter.post("/appointments", requireRole("patient"), (req, res) => {
    // ... route logic ...
});
patientRouter.post("/request-doctor", requireRole("patient"), (req, res) => {
    // ... route logic ...
});
patientRouter.get("/consultations", requireRole("patient"), (req, res) => {
    // ... route logic ...
});
patientRouter.get("/prescriptions", requireRole("patient"), (req, res) => {
    // ... route logic ...
});
router.use("/api/patient", patientRouter);

// Doctor Router
const doctorRouter = express.Router();
doctorRouter.get("/consultations", requireRole("doctor"), (req, res) => {
    // ... route logic ...
});
doctorRouter.post("/prescriptions", requireRole("doctor"), (req, res) => {
    // ... route logic ...
});
doctorRouter.get("/appointments", requireRole("doctor"), (req, res) => {
    // ... route logic ...
});
doctorRouter.put("/medical-records", requireRole("doctor"), (req, res) => {
    // ... route logic ...
});
router.use("/api/doctor", doctorRouter);

// Nurse Router
const nurseRouter = express.Router();
nurseRouter.get("/appointments", requireRole("nurse"), (req, res) => {
    // ... route logic ...
});
nurseRouter.post("/follow-ups", requireRole("nurse"), (req, res) => {
    // ... route logic ...
});
router.use("/api/nurse", nurseRouter);

// Administrator Router
const adminRouter = express.Router();
adminRouter.get("/users", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.post("/users", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.put("/users", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.delete("/users", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.get("/access", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.post("/access", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.put("/access", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.delete("/access", requireRole("admin"), (req, res) => {
    // ... route logic ...
});
adminRouter.get("/data", requireRole("admin"), (req, res) => {
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
