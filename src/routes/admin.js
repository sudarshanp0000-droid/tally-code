const express = require("express");
const rateLimit = require("express-rate-limit");
const { generateRawToken, hashToken } = require("../utils/tokenGen");
const { requireAdminKey } = require("../middleware/auth");
const db = require("../db");

const router = express.Router();
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.use(adminLimiter);
router.use(requireAdminKey);

router.post("/tokens", (req, res) => {
  const { customer_id, scope } = req.body || {};

  if (!customer_id) {
    return res.status(400).json({ error: "customer_id is required" });
  }

  const allowedScopes = ["coa:read", "tally:write", "full:access"];
  const finalScope = scope || "coa:read";

  if (!allowedScopes.includes(finalScope)) {
    return res.status(400).json({ error: "invalid_scope", allowed: allowedScopes });
  }

  const rawToken = generateRawToken();
  const record = db.createToken(hashToken(rawToken), {
    customer_id,
    scope: finalScope,
    created_by: "admin",
  });

  return res.status(201).json({
    message: "Store this token now — it will not be shown again.",
    token: rawToken,
    customer_id: record.customer_id,
    scope: record.scope,
    created_at: record.created_at,
  });
});

router.post("/tokens/revoke", (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  const revoked = db.revokeToken(hashToken(token));

  if (!revoked) {
    return res.status(404).json({ error: "token_not_found" });
  }

  return res.json({ status: "revoked", customer_id: revoked.customer_id });
});

router.get("/tokens/:customer_id", (req, res) => {
  const tokens = db.listTokensForCustomer(req.params.customer_id);
  return res.json({ customer_id: req.params.customer_id, tokens });
});

module.exports = router;
