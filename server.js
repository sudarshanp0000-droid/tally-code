require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { requestLogger } = require("./src/middleware/logger");

const adminRoutes = require("./src/routes/admin");
const coaRoutes = require("./src/routes/coa");
const postRoutes = require("./src/routes/post");

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin && process.env.NODE_ENV !== "production") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
morgan.token("safe-url", (req) => {
  const url = new URL(req.originalUrl, "http://localhost");
  for (const name of url.searchParams.keys()) {
    if (name.toLowerCase() === "authorizationtoken") {
      url.searchParams.set(name, "[REDACTED]");
    }
  }
  return `${url.pathname}${url.search}`;
});
app.use(morgan(":method :safe-url :status :res[content-length] - :response-time ms"));
app.use(requestLogger);

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, "public")));

app.get(["/", "/dashboard"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coaRoutes);
app.use("/api/v1", postRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not_found", path: req.originalUrl });
  }

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(
    JSON.stringify({
      request_id: req.request_id,
      error: err.message,
      stack: err.stack,
    })
  );

  res.status(500).json({ error: "internal_error", request_id: req.request_id });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`LedgerGenie Tally API listening on port ${PORT}`);
});

module.exports = app;
