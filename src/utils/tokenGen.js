const crypto = require("crypto");

function generateRawToken() {
  return "lg_" + crypto.randomBytes(32).toString("base64url");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

module.exports = { generateRawToken, hashToken };
