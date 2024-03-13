const app = require("../app");
const route = require("../routes/doctor");
const secret = process.env.JWT_SECRET;
const { expressjwt: expressJwt } = require("express-jwt");

// Middleware to check JWT
app.use(
    expressJwt({ secret: secret, algorithms: ["HS256"] }).unless({
        path: [
            "/favicon.ico",
            "/",
            "/api/patient/register",
            "/api/patient/login",
            "/roles",
        ],
    })
);

app.use("/api/doctor", route);

module.exports = app;
