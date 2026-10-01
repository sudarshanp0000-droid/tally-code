# LedgerGenie Tally API

This API is built to sit in front of a third-party Tally service provider. It does not return hardcoded demo data. Instead, it reads configuration from environment variables and forwards requests to a provider endpoint that owns the real Tally data.

## Setup

```bash
npm install
cp .env.example .env
```

Set the following values in `.env`:

```env
PORT=8080
ADMIN_API_KEY=your-long-random-secret
COA_API_TOKEN=your-long-random-read-only-token
COA_CUSTOMER_ID=your-customer-id
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

For a provider that uses a query-string token, set `TALLY_PROVIDER_AUTH_TOKEN` to its rotated token, set `TALLY_PROVIDER_AUTH_QUERY_PARAM=AuthorizationToken`, and set `TALLY_PROVIDER_CUSTOMER_ID_PARAM` to an empty value if the provider does not accept a `customer_id` parameter. The provider base URL should be the path before the endpoint, for example `https://provider.example.com/tally/services/apexrest`, with `TALLY_PROVIDER_COA_PATH=/getChartOfAccounts`.

## Run

```bash
node server.js
```

## Admin token generation

```bash
curl -X POST http://localhost:8080/api/v1/admin/tokens \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{"customer_id":"CUST-1042","scope":"coa:read"}'
```

This creates a token that your front-end or partner service can use to call the protected routes.

On Vercel, use `COA_API_TOKEN` and `COA_CUSTOMER_ID` for the read-only COA route instead of relying on tokens created in the local JSON database. Set `COA_API_TOKEN` to a long random secret and provide that token to the consultancy securely. The Vercel temporary filesystem is not persistent, so tokens created through the admin route are not durable there.

## Protected routes

### Chart of accounts

```bash
GET /api/v1/coa
Authorization: Bearer YOUR_TOKEN
```

The API calls the configured provider at `/chart-of-accounts` and streams the normalized accounts back to your website.

Public URL format: `https://<your-vercel-domain>/api/v1/coa?AuthorizationToken=<COA_API_TOKEN>`. Prefer the `Authorization: Bearer <token>` header where the client supports it; URL tokens can be recorded in request logs and browser history.

### Post tally records

```bash
POST /api/v1/tally/post
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "idempotency_key": "voucher_001",
  "records": [
    { "account_name": "Sales Revenue", "parent_group": "Sales Accounts" }
  ]
}
```

This forwards the write request to the provider and returns the provider response with idempotency protection locally.

## Notes

- All static or mock chart-of-account data has been removed.
- Comments and demo placeholders were cleaned out of the runtime code.
- The app is ready to connect to a real Tally provider through environment-based configuration.
