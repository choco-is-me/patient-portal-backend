// Doctor Router
const doctorRouter = require("express").Router();
const requirePermission = require("./permission");

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

module.exports = doctorRouter;
