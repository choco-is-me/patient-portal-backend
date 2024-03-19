const bcrypt = require("bcryptjs");
const adminPassword = process.env.ADMIN_PASSWORD;
const User = require("./models/UserModel");
const Role = require("./models/RoleModel");
const HealthIssue = require("./models/HealthIssue");

// Define roles
const patientRole = new Role({
    name: "Patient",
    permissions: [
        "view_own_records",
        "view_doctors",
        "book_appointment",
        "view_appointments",
        "update_appointment",
        "cancel_appointment_on_pending",
        "view_prescription",
    ],
});

const doctorRole = new Role({
    name: "Doctor",
    permissions: [
        "view_appointments",
        "delete_appointments",
        "change_appointment_status",
        "view_patient_records",
        "view_healthIssues",
        "update_patient_records",
        "create_healthIssue",
        "delete_healthIssue",
        "view_prescriptions",
        "create_prescription",
        "update_prescription",
        "delete_prescription",
    ],
});

const adminRole = new Role({
    name: "Administrator",
    permissions: [
        "manage_users",
        "manage_access",
        ...doctorRole.permissions,
        ...patientRole.permissions,
    ],
});

// Define health issues
let healthIssues = [
    {
        healthStatus: "Flu",
        medicines: [
            {
                name: "Tamiflu",
                dosage: "75mg",
                frequency: "Twice a day",
                duration: "5 days",
            },
            {
                name: "Relenza",
                dosage: "10mg",
                frequency: "Twice a day",
                duration: "5 days",
            },
        ],
    },
    {
        healthStatus: "Fever",
        medicines: [
            {
                name: "Tylenol",
                dosage: "500mg",
                frequency: "Every 4 hours",
                duration: "Until fever subsides",
            },
            {
                name: "Advil",
                dosage: "200mg",
                frequency: "Every 4-6 hours",
                duration: "Until fever subsides",
            },
        ],
    },
];

// Function to initialize MongoDB with roles, admin user, and health issues
const initializeMongo = () => {
    let roles = [doctorRole, patientRole, adminRole];
    // Use an IIFE (Immediately Invoked Function Expression) to use async/await at the top level
    // This is necessary because top-level await is not supported in Node.js yet
    try {
        // Use an IIFE to use async/await at the top level
        (async function () {
            try {
                let savedRoles = await Promise.all(
                    roles.map((role) => {
                        // Create a new object from the role object without the _id field
                        let { _id, ...roleWithoutId } = role.toObject();
                        return Role.findOneAndUpdate(
                            { name: role.name },
                            { $set: roleWithoutId },
                            { upsert: true, new: true }
                        ).exec(); // Add exec() to return a true Promise
                    })
                );

                console.log("All roles added or updated successfully!");

                // Find the adminRole from the savedRoles
                let adminRole = savedRoles.find(
                    (role) => role.name === "Administrator"
                );

                // Hash the password
                const hashedPassword = await bcrypt.hash(adminPassword, 10);

                // Update the admin user, or create it if it doesn't exist
                await User.findOneAndUpdate(
                    { username: { $in: ["Admin", "Choco"] } }, // Server will check for these usernames so that it won't create a new admin user if it already exists
                    {
                        $set: {
                            username: "Choco", // Current username you want
                            password: hashedPassword,
                            role: adminRole._id,
                            revokedPermissions: [],
                        },
                    },
                    { upsert: true }
                );

                console.log("Admin user saved successfully!");
            } catch (err) {
                console.error(err);
            }
        })();
    } catch (err) {
        console.error("An error occurred during setup:", err);
    }

    // Same as above, use an IIFE to use async/await at the top level
    (async function () {
        try {
            for (let issue of healthIssues) {
                // Check if the health issue already exists in the database
                let existingIssue = await HealthIssue.findOne({
                    healthStatus: issue.healthStatus,
                });

                // If it doesn't exist, insert it
                if (!existingIssue) {
                    await HealthIssue.create(issue);
                }
            }
            console.log("All health issues added successfully!");
        } catch (err) {
            console.error(err);
        }
    })();
};

module.exports = initializeMongo;
