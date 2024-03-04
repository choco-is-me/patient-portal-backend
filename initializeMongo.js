const bcrypt = require("bcryptjs");
const adminPassword = process.env.ADMIN_PASSWORD;
const User = require("./models/UserModel");
const Role = require("./models/RoleModel");
const HealthIssue = require("./models/HealthIssue");

// Define roles
const patientRole = new Role({
    name: "Patient",
    permissions: [
        "register_account",
        "login",
        "book_appointment",
        "request_doctor",
        "view_consultation",
        "view_prescription",
    ],
});

const doctorRole = new Role({
    name: "Doctor",
    permissions: [
        "conduct_consultation",
        "prescribe_medication",
        "view_appointments",
        "update_medical_records",
    ],
});

const adminRole = new Role({
    name: "Administrator",
    permissions: [
        "manage_users",
        "manage_access",
        "analyze_data",
        ...doctorRole.permissions,
        ...patientRole.permissions,
    ],
});

// Define user
const adminUser = new User({
    username: "Admin",
    password: "",
    role: adminRole._id,
    revokedPermissions: [], // New field
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

// Helper function to check if two arrays are equal
function arraysEqual(a, b) {
    return a.sort().toString() === b.sort().toString();
}

// Function to initialize MongoDB with roles, admin user, and health issues
const initializeMongo = () => {
    // Check if roles exist then create them. If they exist, update them if necessary.
    Role.find({}).then(async (roles) => {
        try {
            if (roles.length === 0) {
                // If no roles exist, create them
                let promises = [
                    doctorRole.save(),
                    patientRole.save(),
                    adminRole.save(),
                ];
                await Promise.allSettled(promises);
            } else {
                // If roles exist, check each one for updates
                let updates = [];
                for (let role of roles) {
                    let updatedRole;
                    switch (role.name) {
                        case "Doctor":
                            updatedRole = doctorRole;
                            break;
                        case "Patient":
                            updatedRole = patientRole;
                            break;
                        case "Administrator":
                            updatedRole = adminRole;
                            break;
                    }
                    // If the permissions don't match, prepare the update operation
                    if (
                        !arraysEqual(role.permissions, updatedRole.permissions)
                    ) {
                        updates.push({
                            updateOne: {
                                filter: { _id: role._id },
                                update: {
                                    $set: {
                                        permissions: updatedRole.permissions,
                                    },
                                },
                            },
                        });
                    }
                }
                // Execute all update operations
                if (updates.length > 0) {
                    await Role.bulkWrite(updates);
                }
            }
        } catch (error) {
            console.error("An error occurred:", error);
            throw error;
        }
    });

    // Use an IIFE (Immediately Invoked Function Expression) to use async/await at the top level
    // This is necessary because top-level await is not supported in Node.js yet
    (async function () {
        try {
            // Check if admin user already exists
            const existingAdmin = await User.findOne({ username: "Admin" });

            if (!existingAdmin) {
                adminUser.password = await bcrypt.hash(adminPassword, 10);
                await adminUser.save();
                console.log("Admin user saved successfully!");
            } else {
                console.log("Admin user already exists.");
            }
        } catch (err) {
            console.error(
                "An error occurred while creating the admin user:",
                err
            );
        }
    })();

    // Same as above, use an IIFE to use async/await at the top level
    (async function () {
        try {
            await HealthIssue.insertMany(healthIssues);
            console.log("All health issues added successfully");
        } catch (err) {
            console.error(err);
        }
    })();
};

module.exports = initializeMongo;
