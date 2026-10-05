# Tally API Flow

The Express API serves a browser dashboard and forwards Tally requests to a configured third-party provider.

## Public access

Caller authentication is not required for any route. The dashboard at `/` and `/dashboard` requests `/api/v1/coa` without a token or credential. The API uses the server-side `COA_CUSTOMER_ID` for chart-of-accounts and write requests.

This makes the configured customer's accounts publicly readable and allows unauthenticated Tally writes and token administration. Provider API keys and tokens remain server-side; they are used only for requests from this API to the external Tally provider.

## Routes

- `GET /health` returns the service health status.
- `GET /api/v1/coa` and `GET /api/v1/getChartOfAccounts` fetch and normalize chart-of-accounts data.
- `POST /api/v1/tally/post` forwards records to the provider.
- `POST /api/v1/admin/tokens` creates a token record.
- `POST /api/v1/admin/tokens/revoke` revokes the token in the request body.
- `GET /api/v1/admin/tokens/:customer_id` returns token metadata for that customer.

## Read flow

1. The browser requests the dashboard or calls a read route directly.
2. The API reads the configured `COA_CUSTOMER_ID`.
3. The API calls the configured Tally provider with any provider credentials held in the server environment.
4. The API normalizes the provider response, including the Tally `{ "DATA": { "LEDGERDET": [...] } }` format, logs the request, and returns JSON.
5. The dashboard presents ledger name, group, opening balance, GSTIN, location, and bill-wise status. Users can search/filter ledgers and expand a row to view all available fields.

## Write flow

1. A client submits a JSON body with a non-empty `idempotency_key` and a non-empty `records` array.
2. The API uses `COA_CUSTOMER_ID` as the target customer.
3. The API returns a cached response for a repeated idempotency key or forwards the records to the provider.
4. The API logs the operation and returns the provider result.

Caller authentication is disabled, but request-shape checks, rate limits, provider error handling, and write idempotency remain enabled.

## Operational notes

- Configure `COA_CUSTOMER_ID`, `TALLY_PROVIDER_BASE_URL`, and provider credentials (when required) in the server environment.
- Configure `ALLOWED_ORIGINS` when a separate browser origin needs cross-origin API access.
- `src/db.js` stores token metadata and access logs locally; the public token-management routes do not control API access.
- Only deploy this public configuration if exposing account data and allowing public writes is intentional.
