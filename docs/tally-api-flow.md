# Tally API Build Flow

This document explains the current working flow of the LedgerGenie Tally API. It covers the pieces we built and how they work together for a website or client app that needs to read Tally chart-of-accounts data and post updates through a trusted third-party Tally provider.

---

## 1. Purpose of the API

The API acts as a secure middle layer between:

- our website or internal app
- the LedgerGenie backend
- a third-party Tally service provider

It allows us to:

- generate secure tokens for customers or partners
- validate those tokens before access
- log every request for accountability
- read chart-of-accounts data from Tally
- push tally write requests to the provider
- return clean, normalized response data to the frontend website

This means the website does not directly talk to the Tally provider. Instead, it calls our API, which authenticates, validates, logs, and forwards the request in a controlled way.

---

## 2. High-level architecture

The API is built with Express.js and is structured as follows:

- `server.js` starts the app and registers the routes
- `src/routes/admin.js` handles admin actions like token generation and revocation
- `src/routes/coa.js` exposes the CoA read endpoint
- `src/routes/post.js` exposes the write-back endpoint to the Tally provider
- `src/middleware/auth.js` checks token validity and scope
- `src/middleware/logger.js` adds request IDs and logs request metadata
- `src/db.js` stores tokens and access logs in a local JSON file
- `src/services/tallyProvider.js` calls the external Tally provider API
- `src/utils/tokenGen.js` creates and hashes tokens

---

## 3. App bootstrap and security

When the server starts in `server.js`, it does the following:

1. loads environment variables using `dotenv`
2. applies security middleware like Helmet
3. sets JSON body limits
4. enables request logging
5. defines health route
6. exposes API routes under `/api/v1`
7. handles 404 and central error responses

Some basic protections are already in place:

- Helmet for HTTP security headers
- JSON body size limit
- CORS setup based on `ALLOWED_ORIGINS`
- rate limiting on sensitive routes
- request ID generation for tracking every API call

This makes the API more production-ready than a plain raw route setup.

---

## 4. Admin flow: creating and managing tokens

The admin routes live in `src/routes/admin.js`.

### 4.1 Create token

Endpoint:

- `POST /api/v1/admin/tokens`

Required header:

- `x-admin-key`

Body:

```json
{
  "customer_id": "CUST-1042",
  "scope": "coa:read"
}
```

Flow:

1. Admin calls the route with a secret admin key.
2. The server validates `customer_id` and scope.
3. It generates a unique token using `generateRawToken()`.
4. It hashes the token before saving it to storage.
5. It stores the hash, customer ID, scope, and timestamps in the local DB.
6. It returns the raw token once to the admin, so it can be shared with the client or partner.

Important rule:

- the raw token is shown only once
- the actual database stores only the hash, not the raw token

### 4.2 Revoke token

Endpoint:

- `POST /api/v1/admin/tokens/revoke`

Flow:

1. Admin submits the token value.
2. The API hashes it.
3. It finds the matching token record.
4. It marks the token as revoked.
5. It responds with a revoked status.

### 4.3 List customer tokens

Endpoint:

- `GET /api/v1/admin/tokens/:customer_id`

Flow:

1. Admin requests customer token metadata.
2. The server reads token records for that customer.
3. It returns only safe metadata, not the raw token values.

This keeps token management secure and controlled.

---

## 5. Token validation and authorization

The auth middleware is in `src/middleware/auth.js`.

### 5.1 How token validation works

For each protected request, the API checks:

- token from `Authorization: Bearer ...` header, or
- token from `?AuthorizationToken=` query param

Then it:

1. hashes the token
2. looks it up in the DB
3. checks if the token exists
4. checks if the token is revoked
5. checks if it has enough permission for the route

Example scopes:

- `coa:read`
- `tally:write`
- `full:access`

If a token does not have the required scope, the API responds with `403 insufficient_scope`.

This ensures that only the correct customer or service can access a specific route.

---

## 6. Logging system

The logging middleware is in `src/middleware/logger.js`.

For every request, the system creates:

- a unique `request_id`
- start time
- response tracking

When the request finishes, it logs:

- method
- path
- status code
- duration in ms
- customer_id if available

This is also stored in the access log table in `src/db.js`.

The DB tracks entries like:

- request ID
- customer ID
- endpoint
- IP address
- record count
- status
- error message if any

This gives us auditability for every Tally read/write action.

---

## 7. Local database layer

The app uses `src/db.js` with `lowdb` and a local JSON file. It manages two main collections:

- `tokens`
- `accessLogs`

### Token record content

Each token entry contains:

- unique ID
- hashed token
- customer ID
- scope
- revoked flag
- created_by
- created_at
- revoked_at
- last_used_at

### Access log content

Each access log entry contains:

- request ID
- customer ID
- endpoint
- IP
- record count
- status
- error details
- timestamp

This keeps the app simple while still giving us enough data to audit operations.

---

## 8. Tally Chart of Accounts flow

This is the main read operation used by the website.

Endpoint:

- `GET /api/v1/coa`
- `GET /api/v1/getChartOfAccounts`

Protected by:

- `requireToken("coa:read")`

### Flow

1. The website sends a GET request with a valid token.
2. The API validates the token and scope.
3. It reads the customer ID from the token record.
4. It calls the third-party Tally provider through `src/services/tallyProvider.js`.
5. The provider call is made to a configured endpoint like `/chart-of-accounts`.
6. The API normalizes the provider response into a standard internal format.
7. It logs the request.
8. It returns a JSON response like:

```json
{
  "customer_id": "CUST-1042",
  "generated_at": "2026-09-23T12:00:00.000Z",
  "count": 10,
  "accounts": [
    {
      "account_number": "1000",
      "account_name": "Cash in Hand",
      "account_type": "Asset",
      "account_category": "Bank Accounts",
      "is_active": true,
      "parent_account": null
    }
  ]
}
```

This gives the website clean data that it can display in a chart-of-accounts screen without the frontend needing to know the Tally provider details.

---

## 9. Tally write-back flow

The write endpoint is in `src/routes/post.js`.

Endpoint:

- `POST /api/v1/tally/post`

Requires token scope:

- `tally:write` or `full:access`

### Request body

```json
{
  "idempotency_key": "voucher_001",
  "records": [
    {
      "account_name": "Sales Revenue",
      "parent_group": "Sales Accounts"
    }
  ]
}
```

### Flow

1. Client sends a request with a valid write token.
2. The API validates the token and scope.
3. It checks `idempotency_key` is present.
4. It validates that `records` is a non-empty array.
5. It checks the local in-memory idempotency cache.
6. If same request key is replayed, it returns the original result.
7. Otherwise, it forwards the payload to the external Tally provider.
8. The provider processes the write request.
9. The API logs the operation.
10. It returns the provider response to the client.

This avoids duplicate posting when a network response is retried or a client resubmits the same payload.

---

## 10. Provider integration layer

The provider integration lives in `src/services/tallyProvider.js`.

This layer does the following:

- reads environment variables for the external provider URL and credentials
- builds headers with API key or auth token
- makes the request to the remote Tally provider
- parses JSON responses
- throws meaningful errors if the provider is unreachable or not configured
- normalizes CoA responses into the format expected by the app

This keeps the rest of the app from knowing any provider-specific details.

---

## 11. Full end-to-end website flow

This is the real flow we built now:

### Read flow

1. Website requests chart-of-accounts from our API.
2. The API checks the bearer token.
3. The system validates the customer and scope.
4. The API calls the external Tally provider.
5. The provider returns account records.
6. The API normalizes the response and returns clean JSON.
7. The website displays the accounts to the user.

### Write flow

1. User submits ledger or tally data from the website.
2. The website calls `/api/v1/tally/post` with a valid token.
3. The API validates token scope and checks idempotency.
4. The API forwards the data to the Tally provider.
5. The provider processes the request.
6. The API returns processing status and logs the call.
7. The website shows success or failure to the user.

---

## 12. Current status of the project

We have built a workable backend flow for:

- admin token generation
- token validation and authorization
- logging and audit tracking
- chart-of-accounts read from a Tally provider
- write-back data posting with idempotency
- secure request handling and environment-based configuration

This is ready to be connected to the real third-party Tally service, and the frontend website can consume the data without dealing with provider credentials or provider-specific logic directly.

---

## 13. Summary

The API is not just a dummy stub anymore. It is structured as a proper secure backend layer where:

- admin creates tokens
- token middleware verifies access
- logs capture execution history
- CoA endpoints fetch real Tally data
- post endpoints push real data to the Tally provider
- the website receives clean JSON responses to display

That is the complete flow that is currently implemented in this project.
