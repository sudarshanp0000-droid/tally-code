const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { postTallyRecords } = require("../services/tallyProvider");

const router = express.Router();
const postLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const idempotencyCache = new Map();

router.post("/tally/post", postLimiter, async (req, res) => {
  const customer_id = process.env.COA_CUSTOMER_ID;
  const { idempotency_key, records } = req.body || {};

  if (!customer_id) {
    return res.status(503).json({ error: "coa_customer_id_not_configured" });
  }

  if (!idempotency_key) {
    return res.status(400).json({ error: "idempotency_key is required for all write operations" });
  }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "records must be a non-empty array" });
  }

  const cacheKey = `${customer_id}:${idempotency_key}`;
  if (idempotencyCache.has(cacheKey)) {
    return res.status(200).json({
      ...idempotencyCache.get(cacheKey),
      replay: true,
    });
  }

  try {
    const providerResult = await postTallyRecords({
      customer_id,
      idempotency_key,
      records,
      request_id: req.request_id,
    });

    const result = {
      status: providerResult?.status || "accepted",
      customer_id,
      request_id: req.request_id,
      processed:
        providerResult?.processed ||
        records.map((record, index) => ({
          index,
          account_name: record.account_name || record.accountName || "Unknown account",
          status: "queued_for_tally",
        })),
      ...(providerResult && typeof providerResult === "object" ? providerResult : {}),
    };

    idempotencyCache.set(cacheKey, result);

    db.logAccess({
      request_id: req.request_id,
      customer_id,
      endpoint: "tally/post",
      ip: req.ip,
      idempotency_key,
      record_count: records.length,
    });

    return res.status(providerResult?.statusCode || 202).json(result);
  } catch (error) {
    db.logAccess({
      request_id: req.request_id,
      customer_id,
      endpoint: "tally/post",
      ip: req.ip,
      idempotency_key,
      record_count: records.length,
      status: "error",
      error: error.message,
    });

    return res.status(error.statusCode || 500).json({
      error: "tally_provider_error",
      message: error.message,
      customer_id,
    });
  }
});

module.exports = router;
