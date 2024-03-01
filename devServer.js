const app = require("./app");
const routes = require("./routes/router");

app.use("/", routes);
app.use("/api/admin", routes);
app.use("/api/doctor", routes);
app.use("/api/nurse", routes);
app.use("/api/patient", routes);

// start the server listening for requests
const port = process.env.PORT;

app.listen(port, function () {
    console.log("Server is running at http://localhost:" + port + "/");
});
