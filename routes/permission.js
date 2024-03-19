// Middleware for permission checking
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const User = require("../models/UserModel");
const Role = require("../models/RoleModel");

function requirePermission(permission) {
    return function (req, res, next) {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(403).send("Token is not provided");
        }

        const token = authHeader.split(" ")[1]; // Extract the token from the Bearer

        jwt.verify(token, secret, async (err, decodedToken) => {
            if (err) {
                console.log(err);
                return res.status(403).send("Invalid token");
            }

            // Find the user's role
            const userRole = await Role.findById(decodedToken.role);

            // Find the user
            const user = await User.findById(decodedToken.id);

            req.user = user;

            // Check if userRole is null
            if (!userRole) {
                console.log(`Role not found with id: ${decodedToken.role}`);
                return res.status(500).send("Role not found");
            }

            // Check if the role has the required permission
            if (
                !userRole.permissions.includes(permission) ||
                user.revokedPermissions.includes(permission)
            ) {
                return res.status(403).send("Forbidden");
            }

            // Check the fingerprint
            const fingerprintFromToken = decodedToken.fingerprint; // Extract the fingerprint from the token
            const fingerprintFromCookie = req.cookies.fingerprint; // Extract the fingerprint from the cookie
            console.log("Token", fingerprintFromToken);
            console.log("Cookie", fingerprintFromCookie);
            if (fingerprintFromToken !== fingerprintFromCookie) {
                return res.status(403).send("Invalid fingerprint");
            }

            // If permission exists, proceed to the next middleware function
            next();
        });
    };
}

module.exports = requirePermission;
