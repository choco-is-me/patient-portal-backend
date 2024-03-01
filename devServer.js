const app = require("./app");
const routes = require("./routes/router");
const adminRouter = require("./routes/admin");
const doctorRouter = require("./routes/doctor");
const nurseRouter = require("./routes/nurse");
const patientRouter = require("./routes/patient");

app.use("/", routes);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/nurse", nurseRouter);
app.use("/api/patient", patientRouter);

// start the server listening for requests
const port = process.env.PORT;

app.listen(port, function () {
    console.log("Server is running at http://localhost:" + port + "/");
});
