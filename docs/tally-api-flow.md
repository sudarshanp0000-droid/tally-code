# Tally API Flow

The Express API serves a browser dashboard and forwards Tally requests to a configured third-party provider.

## Public access

Caller authentication, a Tally provider URL, and a customer ID are not required for the data routes. `POST /api/v1/tally/post` stores any valid JSON value in memory; `GET /api/v1/coa` and `GET /api/v1/getChartOfAccounts` return the latest stored value. Data is cleared on restart, and Vercel instances do not share memory.

These routes are public: anyone can read or replace the stored value. This is a simple JSON relay/store, not a live Tally integration.

## Routes

- `GET /health` returns the service health status.
- `GET /api/v1/coa` and `GET /api/v1/getChartOfAccounts` return the latest stored JSON value.
- `POST /api/v1/tally/post` accepts and stores any valid JSON value.
- `POST /api/v1/admin/tokens` creates a token record.
- `POST /api/v1/admin/tokens/revoke` revokes the token in the request body.
- `GET /api/v1/admin/tokens/:customer_id` returns token metadata for that customer.

## Read flow

1. A client posts valid JSON to `/api/v1/tally/post`.
2. The API stores the value in process memory and returns it unchanged.
3. The browser requests `/api/v1/coa` and displays ledger rows when the stored JSON contains a ledger list.

## Write flow

1. A client submits any syntactically valid JSON value.
2. The API stores it in process memory and returns it unchanged.

No payload schema, caller token, provider URL, or customer ID is required for these routes. The JSON parser still requires syntactically valid JSON.

## Operational notes

- Configure `ALLOWED_ORIGINS` when a separate browser origin needs cross-origin API access.
- `src/db.js` stores token metadata and access logs locally; the public token-management routes do not control API access.
- Memory is not shared across Vercel instances and is cleared on restart; use a durable database if data must persist or be shared between instances.
- Only deploy this public configuration if allowing anyone to read and overwrite the stored value is intentional.
