const app = require("./app");
const routes = require("./routes/router");
const https = require("https");
const fs = require("fs");

app.use("/", routes);
app.use("/api/", routes);

// start the server listening for requests
const port = process.env.PORT;

// read the key and certificate files
const options = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};

https.createServer(options, app).listen(port, function () {
    console.log("Server is running at https://localhost:" + port + "/");
});
