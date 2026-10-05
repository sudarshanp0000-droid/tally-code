const express = require("express");
const { getData } = require("../dataStore");

const router = express.Router();

router.get(["/getChartOfAccounts", "/coa"], (req, res) => {
  return res.json(getData());
});

module.exports = router;
