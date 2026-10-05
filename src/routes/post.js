const express = require("express");
const { setData } = require("../dataStore");

const router = express.Router();

router.post("/tally/post", (req, res) => {
  setData(req.body);
  return res.json(req.body);
});

module.exports = router;
