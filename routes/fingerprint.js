const crypto = require("crypto");

function createFingerprint(user) {
    // Combine user-specific data and current timestamp
    const data = `${user.username}${user._id}${Date.now()}`;

    // Create a SHA256 hash of the data
    const hash = crypto.createHash("sha256");
    hash.update(data);

    // Return the hash digest as a hex string
    return hash.digest("hex");
}

module.exports = createFingerprint;
