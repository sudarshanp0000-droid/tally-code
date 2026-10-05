const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { getChartOfAccounts } = require("../services/tallyProvider");

const router = express.Router();
const coaLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.get(["/getChartOfAccounts", "/coa"], coaLimiter, async (req, res) => {
  const customer_id = process.env.COA_CUSTOMER_ID;

  if (!customer_id) {
    return res.status(503).json({ error: "coa_customer_id_not_configured" });
  }

  try {
    const accounts = await getChartOfAccounts(customer_id);

    db.logAccess({
      request_id: req.request_id,
      customer_id,
      endpoint: "getChartOfAccounts",
      ip: req.ip,
      result_count: accounts.length,
    });

    return res.json({
      customer_id,
      generated_at: new Date().toISOString(),
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    db.logAccess({
      request_id: req.request_id,
      customer_id,
      endpoint: "getChartOfAccounts",
      ip: req.ip,
      result_count: 0,
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
