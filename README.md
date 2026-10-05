# LedgerGenie Tally API

This API forwards requests to a configured third-party Tally service provider and serves a browser dashboard for chart-of-accounts data.

## Setup

```bash
npm install
cp .env.example .env
```

No provider URL, API key, token, or customer ID is needed. Optional HTTP settings:

```env
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,https://your-website.com
NODE_ENV=development
```

No Tally provider URL, customer ID, caller API token, bearer token, or admin key is required. `POST /api/v1/tally/post` accepts any JSON value and returns it. `GET /api/v1/coa` and `GET /api/v1/getChartOfAccounts` return the most recently posted JSON value. Data is kept in memory only; it is cleared when the server restarts, and Vercel instances do not share memory.

## Run

```bash
node server.js
```

Open `/` or `/dashboard` in a browser and select **Load data**. The ledger table shows group, opening balance, GSTIN, location, and bill-wise status, with searchable/group-filtered rows and expandable details. The API also accepts the provider response shape `{ "DATA": { "LEDGERDET": [...] } }`. The public read endpoint is directly accessible at:

```text
GET /api/v1/coa
GET /api/v1/getChartOfAccounts
```

## API routes

- `GET /health` — public health check.
- `GET /api/v1/coa` or `/api/v1/getChartOfAccounts` — returns the most recently posted JSON value, or `null` before anything is posted.
- `POST /api/v1/tally/post` — stores any valid JSON value in memory and returns it unchanged.
- `POST /api/v1/admin/tokens` — creates a token record.
- `POST /api/v1/admin/tokens/revoke` — revokes the token supplied in the JSON body.
- `GET /api/v1/admin/tokens/:customer_id` — lists token metadata for the customer.

The data GET and POST routes require no caller authentication, provider configuration, customer ID, payload schema, rate limit, or idempotency key. The POST body must be syntactically valid JSON and is limited to 1 MB by the JSON parser.

Example:

```bash
curl -X POST http://localhost:8080/api/v1/tally/post \
  -H "Content-Type: application/json" \
  -d '{"DATA":{"LEDGERDET":[{"LEDNAME":"Cash","LEDGRP":"Cash-in-Hand","OP_BAL":"17,029.49"}]}}'

curl http://localhost:8080/api/v1/coa
```

> **Important:** These public routes expose posted data to anyone and allow anyone to replace it. This is an in-memory JSON store, not a live Tally integration or durable database; Vercel may route separate requests to different instances.
