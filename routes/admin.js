// Admin Router
const adminRouter = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const Role = require("../models/RoleModel");
const requirePermission = require("./permission");

// Get all users
adminRouter.get(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        const users = await User.find().populate("role");
        res.json(users);
    }
);

// Create a new user
adminRouter.post(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Check if username already exists
            const existingUser = await User.findOne({
                username: req.body.username,
            });
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            // Create a new user
            const newUser = new User({
                username: req.body.username,
                password: hashedPassword,
                role: req.body.role,
            });

            // Save the new user
            await newUser.save();

            res.json(newUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Update a user
adminRouter.put(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Check if username already exists
            const existingUser = await User.findOne({
                username: req.body.username,
            });
            if (
                existingUser &&
                String(existingUser._id) !== String(req.body._id)
            ) {
                return res.status(400).send("Username already exists");
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            // Update the user
            const updatedUser = await User.findByIdAndUpdate(
                req.body._id,
                {
                    username: req.body.username,
                    password: hashedPassword,
                    role: req.body.role,
                },
                { new: true }
            );

            res.json(updatedUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Delete a user
adminRouter.delete(
    "/users",
    requirePermission("manage_users"),
    async (req, res) => {
        try {
            // Delete the user
            await User.findByIdAndDelete(req.body._id);

            res.json({ message: "User deleted successfully" });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// View all whole role schema
adminRouter.get(
    "/access",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            // Fetch all roles
            const roles = await Role.find({}, "name permissions");

            // Return roles
            res.json(roles);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Update a user role
adminRouter.post(
    "/access",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            const user = await User.findById(req.body.userId);
            user.role = req.body.role;
            await user.save();

            res.json({ message: "Role granted successfully" });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Revoke permission
adminRouter.post(
    "/revoke",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            const user = await User.findById(req.body.userId);
            if (!user) {
                return res.status(404).send("User not found");
            }

            const permission = req.body.permission;
            const userRole = await Role.findById(user.role);
            if (!userRole.permissions.includes(permission)) {
                return res.status(400).send("Invalid permission");
            }

            if (!user.revokedPermissions.includes(permission)) {
                user.revokedPermissions.push(permission);
                await user.save();
                res.json({ message: "Permission revoked successfully" });
            } else {
                res.json({ message: "Permission already revoked" });
            }
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

// Restore permission
adminRouter.post(
    "/restore",
    requirePermission("manage_access"),
    async (req, res) => {
        try {
            const user = await User.findById(req.body.userId);
            if (!user) {
                return res.status(404).send("User not found");
            }

            const permission = req.body.permission;
            const index = user.revokedPermissions.indexOf(permission);
            if (index === -1) {
                return res.status(400).send("Permission not revoked");
            }

            user.revokedPermissions.splice(index, 1);
            await user.save();
            res.json({ message: "Permission restored successfully" });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
);

module.exports = adminRouter;
