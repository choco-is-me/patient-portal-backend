const app = require("../app");
const route = require("../routes/nurse");
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
        ],
    })
);

app.use("/api/nurse", route);

module.exports = app;
