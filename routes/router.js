const routes = require("express").Router();
const patient = require("./patient");
const doctor = require("./doctor");
const admin = require("./admin");
const Role = require("../models/RoleModel");
const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const createFingerprint = require("./fingerprint");

routes.get("/", async function (req, res) {
    res.send("Success!");
});

routes.get("/favicon.ico", (req, res) => res.status(204).end());

routes.post("/refresh-token", async (req, res) => {
    try {
        const refreshToken = req.body.refreshToken;
        if (!refreshToken) {
            res.status(401).send("Refresh token not provided");
        } else {
            const decoded = jwt.verify(refreshToken, secret);
            if (!decoded) {
                res.status(401).send("Invalid refresh token");
            } else {
                const user = await User.findById(decoded.id);
                if (!user) {
                    res.status(401).send("User not found");
                } else if (createFingerprint(user) !== decoded.fingerprint) {
                    res.status(401).send("Fingerprint mismatch");
                } else {
                    const newToken = jwt.sign(
                        {
                            id: user._id.toString(),
                            username: user.username,
                            role: user.role._id.toString(),
                            revokedPermissions: user.revokedPermissions,
                            fingerprint: createFingerprint(user),
                        },
                        secret,
                        { expiresIn: "1h" }
                    );
                    res.status(200).send({ token: newToken });
                }
            }
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

routes.get("/roles", async (req, res) => {
    try {
        const roles = await Role.find({}, { name: 1, _id: 1 });
        res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

routes.use("/api/patient", patient);
routes.use("/api/doctor", doctor);
routes.use("/api/admin", admin);

module.exports = routes;
