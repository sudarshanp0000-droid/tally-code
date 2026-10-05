# LedgerGenie Tally API

This API forwards requests to a configured third-party Tally service provider and serves a browser dashboard for chart-of-accounts data.

## Setup

```bash
npm install
cp .env.example .env
```

Configure the service in `.env`:

```env
PORT=8080
TALLY_PROVIDER_BASE_URL=https://your-tally-provider.example.com/api
TALLY_PROVIDER_COA_PATH=/chart-of-accounts
TALLY_PROVIDER_API_KEY=
TALLY_PROVIDER_AUTH_TOKEN=
TALLY_PROVIDER_AUTH_QUERY_PARAM=
TALLY_PROVIDER_CUSTOMER_ID_PARAM=customer_id
TALLY_PROVIDER_TIMEOUT_MS=15000
ALLOWED_ORIGINS=http://localhost:3000,https://your-website.com
NODE_ENV=development
```

No caller API token, bearer token, or admin key is required. The CoA read route requests the provider's configured/default company without requiring a customer ID and displays the company name returned in the ledger data. Provider credentials, if needed, stay in the server environment and are never sent by the browser. The write route still requires `COA_CUSTOMER_ID` to select its target customer.

For a provider that uses a query-string token, set `TALLY_PROVIDER_AUTH_TOKEN` to its credential and set `TALLY_PROVIDER_AUTH_QUERY_PARAM=AuthorizationToken`. Set `TALLY_PROVIDER_CUSTOMER_ID_PARAM` to an empty value if the provider does not accept a `customer_id` parameter. The provider base URL should be the path before the endpoint, for example `https://provider.example.com/tally/services/apexrest`, with `TALLY_PROVIDER_COA_PATH=/getChartOfAccounts`.

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
- `GET /api/v1/coa` or `/api/v1/getChartOfAccounts` — reads the provider's chart of accounts and derives the company name from the returned ledgers.
- `POST /api/v1/tally/post` — sends records to the provider. The JSON body must include a non-empty `idempotency_key` and a non-empty `records` array.
- `POST /api/v1/admin/tokens` — creates a token record.
- `POST /api/v1/admin/tokens/revoke` — revokes the token supplied in the JSON body.
- `GET /api/v1/admin/tokens/:customer_id` — lists token metadata for the customer.

All routes are accessible without caller authentication. Existing request-shape checks, rate limits, and write idempotency remain enabled.

> **Important:** This configuration makes Tally account data public and allows anyone to submit Tally writes and use the token-management routes. Deploy it only when that public access is intentional. `COA_CUSTOMER_ID`, when configured, selects the write target; it is not a caller identity.
