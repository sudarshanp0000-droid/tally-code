const { randomUUID } = require("crypto");

function requestLogger(req, res, next) {
  req.request_id = randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const url = new URL(req.originalUrl, "http://localhost");
    for (const name of url.searchParams.keys()) {
      if (name.toLowerCase() === "authorizationtoken") {
        url.searchParams.set(name, "[REDACTED]");
      }
    }

    console.log(
      JSON.stringify({
        request_id: req.request_id,
        method: req.method,
        path: `${url.pathname}${url.search}`,
        status: res.statusCode,
        duration_ms: durationMs,
        customer_id: req.tokenRecord ? req.tokenRecord.customer_id : undefined,
      })
    );
  });

  next();
}

module.exports = { requestLogger };
