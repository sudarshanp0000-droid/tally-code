const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { getChartOfAccounts } = require("../services/tallyProvider");

const router = express.Router();
const coaLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.get(["/getChartOfAccounts", "/coa"], coaLimiter, async (req, res) => {
  try {
    const accounts = await getChartOfAccounts();
    const company_name = accounts.find((account) => account.CMPNAME)?.CMPNAME;

    db.logAccess({
      request_id: req.request_id,
      company_name,
      endpoint: "getChartOfAccounts",
      ip: req.ip,
      result_count: accounts.length,
    });

    return res.json({
      ...(company_name ? { company_name } : {}),
      generated_at: new Date().toISOString(),
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    db.logAccess({
      request_id: req.request_id,
      endpoint: "getChartOfAccounts",
      ip: req.ip,
      result_count: 0,
      status: "error",
      error: error.message,
    });

    return res.status(error.statusCode || 500).json({
      error: "tally_provider_error",
      message: error.message,
    });
  }
});

module.exports = router;
