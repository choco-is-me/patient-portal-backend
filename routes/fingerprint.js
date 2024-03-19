const CryptoJS = require("crypto-js");

function createFingerprint(user) {
    // Combine user-specific data and current timestamp
    const data = `${user.username}${user._id}${Date.now()}`;

    // Create a SHA256 hash of the data
    const hash = CryptoJS.SHA256(data);

    // Return the hash digest as a hex string
    return hash.toString(CryptoJS.enc.Hex);
}

module.exports = createFingerprint;
