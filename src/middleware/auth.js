const { timingSafeEqual } = require("crypto");
const { hashToken } = require("../utils/tokenGen");
const db = require("../db");

function requireToken(requiredScope) {
  return (req, res, next) => {
    const headerToken = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const rawToken = headerToken || req.query.AuthorizationToken;

    if (!rawToken) {
      return res.status(401).json({
        error: "missing_token",
        message: "Provide a token via Authorization: Bearer <token> or ?AuthorizationToken=",
      });
    }

    const configuredCoaToken = process.env.COA_API_TOKEN || "";
    const providedToken = Buffer.from(rawToken);
    const expectedCoaToken = Buffer.from(configuredCoaToken);
    if (
      requiredScope === "coa:read" &&
      configuredCoaToken &&
      providedToken.length === expectedCoaToken.length &&
      timingSafeEqual(providedToken, expectedCoaToken)
    ) {
      const customerId = process.env.COA_CUSTOMER_ID;
      if (!customerId) {
        return res.status(503).json({ error: "coa_customer_id_not_configured" });
      }

      req.tokenRecord = { customer_id: customerId, scope: "coa:read", env_backed: true };
      return next();
    }

    const tokenHash = hashToken(rawToken);
    const record = db.findByHash(tokenHash);

    if (!record) {
      return res.status(401).json({ error: "invalid_token" });
    }

    if (record.revoked) {
      return res.status(401).json({ error: "revoked_token" });
    }

    if (requiredScope && record.scope !== requiredScope && record.scope !== "full:access") {
      return res.status(403).json({
        error: "insufficient_scope",
        message: `This token has scope '${record.scope}', but '${requiredScope}' is required.`,
      });
    }

    if (!record.env_backed) db.touchLastUsed(tokenHash);
    req.tokenRecord = record;
    next();
  };
}

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}

module.exports = { requireToken, requireAdminKey };
