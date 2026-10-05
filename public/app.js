const form = document.getElementById("dashboardForm");
const statusMessage = document.getElementById("statusMessage");
const apiUrlInput = document.getElementById("apiUrlInput");
const ledgerSearch = document.getElementById("ledgerSearch");
const groupFilter = document.getElementById("groupFilter");
const ledgerCount = document.getElementById("ledgerCount");
const accountsTableBody = document.getElementById("accountsTableBody");

const statCustomer = document.getElementById("statCustomer");
const statAccounts = document.getElementById("statAccounts");
const statGroups = document.getElementById("statGroups");
const statGstRegistered = document.getElementById("statGstRegistered");

let accounts = [];

const detailLabels = {
  "SD Sr No": "Serial number",
  CMPNAME: "Company",
  LEDNAME: "Ledger name",
  LEDMSID: "Ledger ID",
  LEDALTERID: "Alter ID",
  LEDMAILNAME: "Mailing name",
  LEDGRP: "Group",
  MOBILE: "Mobile",
  PHONE: "Phone",
  LEDBILLWISE: "Bill-wise balances",
  LEDADD1: "Address line 1",
  LEDADD2: "Address line 2",
  LEDADD3: "Address line 3",
  LEDSTATE: "State",
  LEDCOUNTRY: "Country",
  LEDPINCODE: "PIN code",
  LEDREG: "GST registration",
  LEDGSTIN: "GSTIN",
  OP_BAL: "Opening balance",
  account_name: "Ledger name",
  account_type: "Account type",
  account_category: "Group",
  account_number: "Account number",
  parent_account: "Parent account",
  opening_balance: "Opening balance",
  openingBalance: "Opening balance",
  gstin: "GSTIN",
  state: "State",
  country: "Country",
  mobile: "Mobile",
  phone: "Phone",
};

function updateStatus(message, variant = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${variant}`;
}

function accountValue(account, ...keys) {
  for (const key of keys) {
    const value = account[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanizeKey(key) {
  return detailLabels[key] || key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createCell(value, className) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = displayValue(value);
  return cell;
}

function createDetails(account, index) {
  const row = document.createElement("tr");
  row.className = "ledger-details-row";
  row.id = `ledger-details-${index}`;
  row.hidden = true;

  const cell = document.createElement("td");
  cell.colSpan = 7;
  const list = document.createElement("dl");
  list.className = "ledger-details";

  const hasTallyFields = "LEDNAME" in account || "LEDGRP" in account;
  const normalizedKeys = new Set([
    "account_name",
    "account_type",
    "account_category",
    "account_number",
    "parent_account",
    "is_active",
  ]);

  Object.entries(account).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (hasTallyFields && normalizedKeys.has(key)) return;

    const item = document.createElement("div");
    item.className = "ledger-detail";
    const label = document.createElement("dt");
    label.textContent = humanizeKey(key);
    const detail = document.createElement("dd");
    detail.textContent = displayValue(value);
    item.append(label, detail);
    list.appendChild(item);
  });

  cell.appendChild(list);
  row.appendChild(cell);
  return row;
}

function matchesSearch(account, query) {
  if (!query) return true;
  return Object.values(account)
    .map(displayValue)
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

function getFilteredAccounts() {
  const query = ledgerSearch.value.trim().toLocaleLowerCase();
  const selectedGroup = groupFilter.value;

  return accounts
    .map((account, index) => ({ account, index }))
    .filter(({ account }) => {
      const group = accountValue(account, "LEDGRP", "account_category", "accountCategory", "parent_group", "group");
      return (!selectedGroup || group === selectedGroup) && matchesSearch(account, query);
    });
}

function renderAccounts(emptyMessage = "No ledgers available for this company.") {
  const filtered = getFilteredAccounts();
  ledgerCount.textContent = accounts.length
    ? `Showing ${filtered.length} of ${accounts.length} ledgers`
    : "No ledgers loaded";

  if (filtered.length === 0) {
    accountsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">${accounts.length ? "No matching ledgers found." : emptyMessage}</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach(({ account, index }) => {
    const name = accountValue(account, "LEDNAME", "account_name", "accountName", "name") || "Unnamed ledger";
    const group = accountValue(account, "LEDGRP", "account_category", "accountCategory", "parent_group", "group");
    const openingBalance = accountValue(account, "OP_BAL", "opening_balance", "openingBalance");
    const gstin = accountValue(account, "LEDGSTIN", "gstin", "GSTIN");
    const state = accountValue(account, "LEDSTATE", "state");
    const country = accountValue(account, "LEDCOUNTRY", "country");
    const location = [state, country].filter(Boolean).join(", ");
    const billWise = accountValue(account, "LEDBILLWISE", "bill_wise", "billWise");

    const row = document.createElement("tr");
    row.className = "ledger-row";
    const nameCell = document.createElement("td");
    const nameText = document.createElement("span");
    nameText.className = "ledger-name";
    nameText.textContent = displayValue(name);
    nameCell.appendChild(nameText);

    const mailingName = accountValue(account, "LEDMAILNAME", "mailing_name", "mailingName");
    if (mailingName && mailingName !== name) {
      const meta = document.createElement("span");
      meta.className = "ledger-meta";
      meta.textContent = `Mailing name: ${mailingName}`;
      nameCell.appendChild(meta);
    }
    row.appendChild(nameCell);
    row.appendChild(createCell(group));
    row.appendChild(createCell(openingBalance, "balance-cell"));
    row.appendChild(createCell(gstin));
    row.appendChild(createCell(location));
    row.appendChild(createCell(billWise));

    const actionCell = document.createElement("td");
    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "details-button";
    detailsButton.textContent = "Details";
    detailsButton.setAttribute("aria-expanded", "false");
    detailsButton.setAttribute("aria-controls", `ledger-details-${index}`);
    detailsButton.addEventListener("click", () => {
      const detailsRow = document.getElementById(`ledger-details-${index}`);
      detailsRow.hidden = !detailsRow.hidden;
      detailsButton.setAttribute("aria-expanded", String(!detailsRow.hidden));
      detailsButton.textContent = detailsRow.hidden ? "Details" : "Hide";
    });
    actionCell.appendChild(detailsButton);
    row.appendChild(actionCell);

    fragment.append(row, createDetails(account, index));
  });

  accountsTableBody.replaceChildren(fragment);
}

function updateSummary(payload) {
  const groups = new Set(
    accounts
      .map((account) => accountValue(account, "LEDGRP", "account_category", "accountCategory", "parent_group", "group"))
      .filter(Boolean)
      .map((group) => String(group).trim().toLocaleLowerCase())
  );
  const registered = accounts.filter((account) =>
    accountValue(account, "LEDGSTIN", "gstin", "GSTIN")
  ).length;
  const company = accountValue(accounts[0] || {}, "CMPNAME", "company_name", "companyName") ||
    payload?.company_name ||
    payload?.company ||
    payload?.customer_id ||
    "Unknown company";

  statCustomer.textContent = displayValue(company);
  statAccounts.textContent = String(accounts.length);
  statGroups.textContent = String(groups.size);
  statGstRegistered.textContent = String(registered);
}

function updateGroupOptions() {
  const currentValue = groupFilter.value;
  const groups = [...new Set(
    accounts
      .map((account) => accountValue(account, "LEDGRP", "account_category", "accountCategory", "parent_group", "group"))
      .filter(Boolean)
      .map(String)
  )].sort((a, b) => a.localeCompare(b));

  groupFilter.replaceChildren(new Option("All groups", ""));
  groups.forEach((group) => groupFilter.add(new Option(group, group)));
  groupFilter.value = groups.includes(currentValue) ? currentValue : "";
}

async function loadData(event) {
  event.preventDefault();

  const apiUrl = apiUrlInput.value.trim() || "/api/v1/coa";
  updateStatus("Fetching ledger data...", "info");

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.message || payload?.error || "Request failed.";
      throw new Error(message);
    }

    accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
    updateSummary(payload);
    updateGroupOptions();
    renderAccounts();
    updateStatus(`Loaded ${accounts.length} ledgers.`, "success");
  } catch (error) {
    accounts = [];
    updateSummary({});
    updateGroupOptions();
    renderAccounts("Unable to load ledger data.");
    updateStatus(error.message || "Unable to fetch ledger data.", "error");
  }
}

form.addEventListener("submit", loadData);
ledgerSearch.addEventListener("input", () => renderAccounts());
groupFilter.addEventListener("change", () => renderAccounts());
