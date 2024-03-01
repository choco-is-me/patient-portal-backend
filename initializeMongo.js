const bcrypt = require("bcryptjs");
const adminPassword = process.env.ADMIN_PASSWORD;
const { User } = require("./models/UserModel");
const { Role } = require("./models/RoleModel");

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

const nurseRole = new Role({
    name: "Nurse",
    permissions: ["manage_appointments", "patient_follow_up"],
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
        ...nurseRole.permissions,
        ...patientRole.permissions,
    ],
});

const adminUser = new User({
    username: "Admin",
    password: "",
    role: adminRole._id,
    revokedPermissions: [], // New field
});

// Helper function to check if two arrays are equal
function arraysEqual(a, b) {
    return a.sort().toString() === b.sort().toString();
}

const initializeMongo = () => {
    Role.find({}).then(async (roles) => {
        try {
            if (roles.length === 0) {
                // If no roles exist, create them
                let promises = [
                    doctorRole.save(),
                    nurseRole.save(),
                    patientRole.save(),
                    adminRole.save(),
                ];
                await Promise.all(promises);
            } else {
                // If roles exist, check each one for updates
                for (let role of roles) {
                    let updatedRole;
                    switch (role.name) {
                        case "Doctor":
                            updatedRole = doctorRole;
                            break;
                        case "Nurse":
                            updatedRole = nurseRole;
                            break;
                        case "Patient":
                            updatedRole = patientRole;
                            break;
                        case "Administrator":
                            updatedRole = adminRole;
                            break;
                    }
                    // If the permissions don't match, update the role
                    if (
                        !arraysEqual(role.permissions, updatedRole.permissions)
                    ) {
                        await Role.updateOne(
                            { _id: role._id },
                            { $set: { permissions: updatedRole.permissions } }
                        );
                    }
                }
            }
        } catch (error) {
            console.error("An error occurred:", error);
            throw error; // This will prevent Unhandled Promise Rejection
        }
    });

    // Use an IIFE (Immediately Invoked Function Expression) to use async/await at the top level
    (async function () {
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ username: "Admin" });

        if (!existingAdmin) {
            adminUser.password = await bcrypt.hash(adminPassword, 10);
            try {
                await adminUser.save();
                console.log("Admin user saved successfully!");
            } catch (err) {
                console.error(err);
            }
        } else {
            console.log("Admin user already exists.");
        }
    })();
};

module.exports = initializeMongo;
