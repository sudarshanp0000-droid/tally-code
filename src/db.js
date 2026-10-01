/**
 * Minimal token store, backed by a local JSON file.
 *
 * This is intentionally simple so you can run and test the API with zero
 * external infrastructure. In production, replace this module with a real
 * table (Postgres/MySQL/Mongo) — the function signatures below are the only
 * contract the rest of the app depends on, so swapping the implementation
 * later does not require touching any route file.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const dataDir = process.env.VERCEL === "1"
  ? path.join(os.tmpdir(), "ledgergenie-tally-api")
  : path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, "db.json"));
const db = low(adapter);

db.defaults({ tokens: [], accessLogs: [] }).write();

/**
 * @param {string} tokenHash - sha256 hash of the raw token (never store raw tokens)
 * @param {object} fields - { customer_id, scope, created_by }
 */
function createToken(tokenHash, fields) {
  const record = {
    id: require("uuid").v4(),
    token_hash: tokenHash,
    customer_id: fields.customer_id,
    scope: fields.scope || "coa:read",
    revoked: false,
    created_by: fields.created_by || "admin",
    created_at: new Date().toISOString(),
    revoked_at: null,
    last_used_at: null,
  };
  db.get("tokens").push(record).write();
  return record;
}

function findByHash(tokenHash) {
  return db.get("tokens").find({ token_hash: tokenHash }).value();
}

function touchLastUsed(tokenHash) {
  db.get("tokens")
    .find({ token_hash: tokenHash })
    .assign({ last_used_at: new Date().toISOString() })
    .write();
}

function revokeToken(tokenHash) {
  const rec = db.get("tokens").find({ token_hash: tokenHash });
  if (!rec.value()) return null;
  rec.assign({ revoked: true, revoked_at: new Date().toISOString() }).write();
  return rec.value();
}

function logAccess(entry) {
  db.get("accessLogs")
    .push({ ...entry, at: new Date().toISOString() })
    .write();
  // Keep the log file from growing forever in this simple demo store.
  const logs = db.get("accessLogs").value();
  if (logs.length > 5000) {
    db.set("accessLogs", logs.slice(-2000)).write();
  }
}

function listTokensForCustomer(customer_id) {
  return db
    .get("tokens")
    .filter({ customer_id })
    .value()
    .map(({ token_hash, ...safe }) => safe); // never return hashes either
}

module.exports = {
  createToken,
  findByHash,
  touchLastUsed,
  revokeToken,
  logAccess,
  listTokensForCustomer,
};
