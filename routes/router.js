const routes = require("express").Router();
const patient = require("./patient");
const doctor = require("./doctor");
const admin = require("./admin");
const Role = require("../models/RoleModel");

routes.get("/", async function (req, res) {
    res.send("Success!");
});

routes.get("/favicon.ico", (req, res) => res.status(204).end());

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
