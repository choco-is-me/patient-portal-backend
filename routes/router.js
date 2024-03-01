const routes = require("express").Router();
const patient = require("./patient");
const nurse = require("./nurse");
const doctor = require("./doctor");
const admin = require("./admin");

routes.get("/", async function (req, res) {
    res.send("Success!");
});

routes.get("/favicon.ico", (req, res) => res.status(204).end());

routes.use("/api/patient", patient);
routes.use("/api/nurse", nurse);
routes.use("/api/doctor", doctor);
routes.use("/api/admin", admin);

module.exports = routes;
