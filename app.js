const storageKey = "businessRecordsHub.v2";

const form = document.getElementById("record-form");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit");
const recordsBody = document.getElementById("records-body");
const emptyState = document.getElementById("empty-state");
const filterCompany = document.getElementById("filter-company");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-json");

const kpiIncome = document.getElementById("kpi-income");
const kpiExpense = document.getElementById("kpi-expense");
const kpiNet = document.getElementById("kpi-net");
const kpiCount = document.getElementById("kpi-count");

const fields = {
  id: document.getElementById("record-id"),
  company: document.getElementById("company"),
  entryType: document.getElementById("entry-type"),
  recordType: document.getElementById("record-type"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  amount: document.getElementById("amount"),
  contact: document.getElementById("contact"),
  status: document.getElementById("status"),
  notes: document.getElementById("notes")
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const safeId = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const normalizeRecord = (record) => ({
  id: record.id || safeId(),
  company: record.company || "",
  entryType: record.entryType || "Expense",
  recordType: record.recordType || "",
  title: record.title || "",
  date: record.date || "",
  amount: record.amount || "0",
  contact: record.contact || "",
  status: record.status || "Open",
  notes: record.notes || ""
});

const loadRecords = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(normalizeRecord);
  } catch {
    return [];
  }
};

let records = loadRecords();

const saveRecords = () => {
  localStorage.setItem(storageKey, JSON.stringify(records));
};

const resetForm = () => {
  form.reset();
  fields.id.value = "";
  fields.entryType.value = "Income";
  formTitle.textContent = "Add Ledger Entry";
  cancelEditBtn.hidden = true;
};

const amountNumber = (value) => Number.parseFloat(value || "0") || 0;

const getVisibleRecords = () => {
  const company = filterCompany.value;
  const term = searchInput.value.trim().toLowerCase();

  return records
    .filter((record) => company === "all" || record.company === company)
    .filter((record) => {
      if (!term) {
        return true;
      }
      return [record.title, record.recordType, record.notes, record.contact, record.company, record.status]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const renderKpis = (visible) => {
  const totals = visible.reduce(
    (acc, record) => {
      const amount = amountNumber(record.amount);
      if (record.entryType === "Income") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  kpiIncome.textContent = currency.format(totals.income);
  kpiExpense.textContent = currency.format(totals.expense);
  kpiNet.textContent = currency.format(totals.income - totals.expense);
  kpiCount.textContent = String(visible.length);
};

const renderRows = (visible) => {
  recordsBody.innerHTML = "";

  if (!visible.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  visible.forEach((record) => {
    const tr = document.createElement("tr");

    const amount = amountNumber(record.amount);
    const signedAmount = record.entryType === "Income" ? amount : -amount;

    tr.innerHTML = `
      <td>${record.date || "-"}</td>
      <td>${record.company || "-"}</td>
      <td><span class="entry-type ${record.entryType.toLowerCase()}">${record.entryType}</span></td>
      <td>${record.recordType || "-"}</td>
      <td>${record.title || "-"}</td>
      <td>${record.contact || "-"}</td>
      <td>${record.status || "-"}</td>
      <td class="num">${signedAmount >= 0 ? "+" : "-"}${currency.format(Math.abs(signedAmount))}</td>
      <td>${record.notes || "-"}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="edit">Edit</button>
          <button type="button" class="delete">Delete</button>
        </div>
      </td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      fields.id.value = record.id;
      fields.company.value = record.company;
      fields.entryType.value = record.entryType;
      fields.recordType.value = record.recordType;
      fields.title.value = record.title;
      fields.date.value = record.date;
      fields.amount.value = record.amount;
      fields.contact.value = record.contact;
      fields.status.value = record.status;
      fields.notes.value = record.notes;
      formTitle.textContent = "Edit Ledger Entry";
      cancelEditBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    tr.querySelector(".delete").addEventListener("click", () => {
      records = records.filter((x) => x.id !== record.id);
      saveRecords();
      render();
    });

    recordsBody.append(tr);
  });
};

const render = () => {
  const visible = getVisibleRecords();
  renderKpis(visible);
  renderRows(visible);
};

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = normalizeRecord({
    id: fields.id.value || safeId(),
    company: fields.company.value,
    entryType: fields.entryType.value,
    recordType: fields.recordType.value.trim(),
    title: fields.title.value.trim(),
    date: fields.date.value,
    amount: fields.amount.value,
    contact: fields.contact.value.trim(),
    status: fields.status.value,
    notes: fields.notes.value.trim()
  });

  const index = records.findIndex((record) => record.id === payload.id);
  if (index >= 0) {
    records[index] = payload;
  } else {
    records.push(payload);
  }

  saveRecords();
  resetForm();
  render();
});

cancelEditBtn.addEventListener("click", resetForm);
filterCompany.addEventListener("change", render);
searchInput.addEventListener("input", render);

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business-accounting-records.json";
  a.click();
  URL.revokeObjectURL(url);
});

resetForm();
render();
