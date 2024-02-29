// Nurse Router
const nurseRouter = require("express").Router();
const requirePermission = require("./permission");

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

module.exports = nurseRouter;
