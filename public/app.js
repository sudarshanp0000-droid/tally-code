const form = document.getElementById("dashboardForm");
const statusMessage = document.getElementById("statusMessage");
const tokenInput = document.getElementById("tokenInput");
const apiUrlInput = document.getElementById("apiUrlInput");
const accountsTableBody = document.getElementById("accountsTableBody");

const statCustomer = document.getElementById("statCustomer");
const statAccounts = document.getElementById("statAccounts");
const statStatus = document.getElementById("statStatus");
const statUpdated = document.getElementById("statUpdated");

const defaultToken = new URLSearchParams(window.location.search).get("token");
if (defaultToken) {
  tokenInput.value = defaultToken;
}

function updateStatus(message, variant = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${variant}`;
}

function formatLastUpdated(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderAccounts(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    accountsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No accounts available for this customer.</td></tr>';
    return;
  }

  accountsTableBody.innerHTML = accounts
    .map((account) => {
      const accountName = account.account_name || account.accountName || "Unnamed account";
      const accountType = account.account_type || account.accountType || "Unknown";
      const category = account.account_category || account.accountCategory || "—";
      const accountNumber = account.account_number || account.accountNumber || "—";
      const parentAccount = account.parent_account || account.parentAccount || "—";
      const active = account.is_active ?? account.isActive ?? true;

      return `
        <tr>
          <td>${accountName}</td>
          <td>${accountType}</td>
          <td>${category}</td>
          <td>${accountNumber}</td>
          <td>${parentAccount}</td>
          <td><span class="badge ${active ? "active" : "inactive"}">${active ? "Active" : "Inactive"}</span></td>
        </tr>
      `;
    })
    .join("");
}

async function loadData(event) {
  event.preventDefault();

  const token = tokenInput.value.trim();
  const apiUrl = apiUrlInput.value.trim() || "/api/v1/coa";

  if (!token) {
    updateStatus("Please enter a valid bearer token before loading data.", "error");
    return;
  }

  updateStatus("Fetching account data...", "info");

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.message || payload?.error || "Request failed.";
      throw new Error(message);
    }

    const accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
    const customerId = payload?.customer_id || "Unknown customer";
    const updatedAt = payload?.generated_at || new Date().toISOString();

    statCustomer.textContent = customerId;
    statAccounts.textContent = String(accounts.length);
    statStatus.textContent = "Connected";
    statUpdated.textContent = formatLastUpdated(updatedAt);

    renderAccounts(accounts);
    updateStatus(`Loaded ${accounts.length} account records for ${customerId}.`, "success");
  } catch (error) {
    statCustomer.textContent = "--";
    statAccounts.textContent = "0";
    statStatus.textContent = "Error";
    statUpdated.textContent = "--";
    renderAccounts([]);
    updateStatus(error.message || "Unable to fetch account data.", "error");
  }
}

form.addEventListener("submit", loadData);

if (defaultToken) {
  form.requestSubmit();
}
