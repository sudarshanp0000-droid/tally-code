const DEFAULT_TIMEOUT_MS = Number(process.env.TALLY_PROVIDER_TIMEOUT_MS || 15000);

function getProviderConfig() {
  const baseUrl = (process.env.TALLY_PROVIDER_BASE_URL || process.env.TALLY_PROVIDER_URL || "").replace(/\/+$/, "");

  return {
    baseUrl,
    apiKey: process.env.TALLY_PROVIDER_API_KEY || process.env.TALLY_PROVIDER_KEY || "",
    authToken: process.env.TALLY_PROVIDER_AUTH_TOKEN || process.env.TALLY_PROVIDER_TOKEN || "",
  };
}

function getRequestHeaders(config) {
  const headers = {
    Accept: "application/json",
  };

  if (config.apiKey) {
    headers["x-api-key"] = config.apiKey;
  }

  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  return headers;
}

async function requestProvider({ path, method = "GET", body, customerId, params = {} }) {
  const config = getProviderConfig();

  if (!config.baseUrl) {
    const error = new Error("TALLY_PROVIDER_BASE_URL is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(path.startsWith("http") ? path : `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  if (customerId) {
    url.searchParams.set("customer_id", customerId);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method,
    headers: {
      ...getRequestHeaders(config),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const error = new Error(
      (payload && typeof payload === "object" && (payload.message || payload.error)) ||
        `Tally provider request failed with status ${response.status}`
    );
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function normalizeAccounts(payload) {
  const accounts = Array.isArray(payload?.accounts)
    ? payload.accounts
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  return accounts.map((account, index) => ({
    account_number: account.account_number ?? account.accountNumber ?? account.number ?? account.code ?? index,
    account_name: account.account_name ?? account.accountName ?? account.name ?? "Unnamed account",
    account_type: account.account_type ?? account.accountType ?? account.type ?? "Unknown",
    account_category: account.account_category ?? account.accountCategory ?? account.category ?? account.parent_group ?? null,
    is_active: account.is_active ?? account.isActive ?? true,
    parent_account: account.parent_account ?? account.parentAccount ?? null,
    ...account,
  }));
}

async function getChartOfAccounts(customerId) {
  const payload = await requestProvider({
    path: "/chart-of-accounts",
    customerId,
  });

  return normalizeAccounts(payload);
}

async function postTallyRecords({ customer_id, idempotency_key, records, request_id }) {
  const payload = await requestProvider({
    path: "/tally/post",
    method: "POST",
    body: {
      customer_id,
      idempotency_key,
      records,
      request_id,
    },
  });

  return {
    status: payload?.status || "accepted",
    statusCode: payload?.statusCode || 202,
    ...payload,
  };
}

module.exports = {
  getChartOfAccounts,
  postTallyRecords,
};
