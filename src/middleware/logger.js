const { v4: uuidv4 } = require("uuid");

function requestLogger(req, res, next) {
  req.request_id = uuidv4();
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        request_id: req.request_id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: durationMs,
        customer_id: req.tokenRecord ? req.tokenRecord.customer_id : undefined,
      })
    );
  });

  next();
}

module.exports = { requestLogger };
