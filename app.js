const recordsKey = "businessRecordsHub.v3.records";
const holdingsKey = "businessRecordsHub.v3.holdings";

const form = document.getElementById("record-form");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit");
const recordsBody = document.getElementById("records-body");
const emptyState = document.getElementById("empty-state");
const filterCompany = document.getElementById("filter-company");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-json");

const generateStrategyBtn = document.getElementById("generate-strategy");
const strategyList = document.getElementById("strategy-list");

const holdingForm = document.getElementById("holding-form");
const holdingsBody = document.getElementById("holdings-body");
const holdingsEmpty = document.getElementById("holdings-empty");

const kpiIncome = document.getElementById("kpi-income");
const kpiExpense = document.getElementById("kpi-expense");
const kpiNet = document.getElementById("kpi-net");
const kpiCount = document.getElementById("kpi-count");
const kpiSalaryPaid = document.getElementById("kpi-salary-paid");
const kpiSalaryReceived = document.getElementById("kpi-salary-received");

const fields = {
  id: document.getElementById("record-id"),
  company: document.getElementById("company"),
  entryType: document.getElementById("entry-type"),
  recordType: document.getElementById("record-type"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  amount: document.getElementById("amount"),
  contact: document.getElementById("contact"),
  fromAccount: document.getElementById("from-account"),
  toAccount: document.getElementById("to-account"),
  status: document.getElementById("status"),
  notes: document.getElementById("notes")
};

const holdingFields = {
  id: document.getElementById("holding-id"),
  type: document.getElementById("holding-type"),
  name: document.getElementById("holding-name"),
  company: document.getElementById("holding-company"),
  value: document.getElementById("holding-value"),
  date: document.getElementById("holding-date"),
  notes: document.getElementById("holding-notes")
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const safeId = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const parseStored = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlainObject);
  } catch {
    return [];
  }
};

const amountNumber = (value) => Number.parseFloat(value || "0") || 0;

const normalizeRecord = (record) => ({
  id: record.id || safeId(),
  company: record.company || "",
  entryType: record.entryType || "Expense",
  recordType: record.recordType || "",
  title: record.title || "",
  date: record.date || "",
  amount: String(amountNumber(record.amount)),
  contact: record.contact || "",
  fromAccount: record.fromAccount || "",
  toAccount: record.toAccount || "",
  status: record.status || "Open",
  notes: record.notes || ""
});

const normalizeHolding = (holding) => ({
  id: holding.id || safeId(),
  type: holding.type || "Real Property",
  name: holding.name || "",
  company: holding.company || "",
  value: String(amountNumber(holding.value)),
  date: holding.date || "",
  notes: holding.notes || ""
});

let records = parseStored(recordsKey).map(normalizeRecord);
let holdings = parseStored(holdingsKey).map(normalizeHolding);

const saveRecords = () => localStorage.setItem(recordsKey, JSON.stringify(records));
const saveHoldings = () => localStorage.setItem(holdingsKey, JSON.stringify(holdings));

const resetForm = () => {
  form.reset();
  fields.id.value = "";
  fields.entryType.value = "Income";
  formTitle.textContent = "Add Transaction";
  cancelEditBtn.hidden = true;
};

const resetHoldingForm = () => {
  holdingForm.reset();
  holdingFields.id.value = "";
};

const entryTypeClass = (type) => `type-${type.toLowerCase().replace(/\s+/g, "-")}`;

const signedAmount = (record) => {
  const amount = amountNumber(record.amount);
  if (record.entryType === "Income" || record.entryType === "Salary Received") return amount;
  if (record.entryType === "Transfer") return 0;
  return -amount;
};

const getVisibleRecords = () => {
  const company = filterCompany.value;
  const term = searchInput.value.trim().toLowerCase();

  return records
    .filter((record) => company === "all" || record.company === company)
    .filter((record) => {
      if (!term) return true;
      return [
        record.title,
        record.recordType,
        record.notes,
        record.contact,
        record.company,
        record.status,
        record.fromAccount,
        record.toAccount,
        record.entryType
      ]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const renderKpis = (visible) => {
  const totals = visible.reduce(
    (acc, record) => {
      const amount = amountNumber(record.amount);

      if (record.entryType === "Income") acc.income += amount;
      if (record.entryType === "Salary Received") {
        acc.salaryReceived += amount;
        acc.income += amount;
      }
      if (record.entryType === "Expense") acc.expense += amount;
      if (record.entryType === "Salary Paid") {
        acc.salaryPaid += amount;
        acc.expense += amount;
      }

      return acc;
    },
    { income: 0, expense: 0, salaryPaid: 0, salaryReceived: 0 }
  );

  kpiIncome.textContent = currency.format(totals.income);
  kpiExpense.textContent = currency.format(totals.expense);
  kpiNet.textContent = currency.format(totals.income - totals.expense);
  kpiCount.textContent = String(visible.length);
  kpiSalaryPaid.textContent = currency.format(totals.salaryPaid);
  kpiSalaryReceived.textContent = currency.format(totals.salaryReceived);
};

const renderRecords = (visible) => {
  recordsBody.innerHTML = "";

  if (!visible.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  visible.forEach((record) => {
    const tr = document.createElement("tr");
    const signed = signedAmount(record);

    tr.innerHTML = `
      <td>${record.date || "-"}</td>
      <td>${record.company || "-"}</td>
      <td><span class="entry-type ${entryTypeClass(record.entryType)}">${record.entryType}</span></td>
      <td>${record.recordType || "-"}</td>
      <td>${record.title || "-"}</td>
      <td>${record.contact || "-"}</td>
      <td>${record.fromAccount || "-"}</td>
      <td>${record.toAccount || "-"}</td>
      <td>${record.status || "-"}</td>
      <td class="num">${signed > 0 ? "+" : signed < 0 ? "-" : "±"}${currency.format(Math.abs(signed || amountNumber(record.amount)))}</td>
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
      fields.fromAccount.value = record.fromAccount;
      fields.toAccount.value = record.toAccount;
      fields.status.value = record.status;
      fields.notes.value = record.notes;
      formTitle.textContent = "Edit Transaction";
      cancelEditBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    tr.querySelector(".delete").addEventListener("click", () => {
      records = records.filter((item) => item.id !== record.id);
      saveRecords();
      render();
    });

    recordsBody.append(tr);
  });
};

const renderHoldings = () => {
  holdingsBody.innerHTML = "";

  if (!holdings.length) {
    holdingsEmpty.hidden = false;
    return;
  }

  holdingsEmpty.hidden = true;

  holdings
    .slice()
    .sort((a, b) => amountNumber(b.value) - amountNumber(a.value))
    .forEach((holding) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${holding.type}</td>
        <td>${holding.name}</td>
        <td>${holding.company}</td>
        <td class="num">${currency.format(amountNumber(holding.value))}</td>
        <td>${holding.date || "-"}</td>
        <td>${holding.notes || "-"}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="edit">Edit</button>
            <button type="button" class="delete">Delete</button>
          </div>
        </td>
      `;

      tr.querySelector(".edit").addEventListener("click", () => {
        holdingFields.id.value = holding.id;
        holdingFields.type.value = holding.type;
        holdingFields.name.value = holding.name;
        holdingFields.company.value = holding.company;
        holdingFields.value.value = holding.value;
        holdingFields.date.value = holding.date;
        holdingFields.notes.value = holding.notes;
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      });

      tr.querySelector(".delete").addEventListener("click", () => {
        holdings = holdings.filter((item) => item.id !== holding.id);
        saveHoldings();
        render();
      });

      holdingsBody.append(tr);
    });
};

const generateStrategies = () => {
  const visible = getVisibleRecords();
  const income = visible
    .filter((r) => r.entryType === "Income" || r.entryType === "Salary Received")
    .reduce((sum, r) => sum + amountNumber(r.amount), 0);
  const outflow = visible
    .filter((r) => r.entryType === "Expense" || r.entryType === "Salary Paid")
    .reduce((sum, r) => sum + amountNumber(r.amount), 0);
  const net = income - outflow;
  const transferCount = visible.filter((r) => r.entryType === "Transfer").length;
  const propertyValue = holdings
    .filter((h) => h.type === "Real Property")
    .reduce((sum, h) => sum + amountNumber(h.value), 0);
  const insuranceValue = holdings
    .filter((h) => h.type === "Insurance Policy")
    .reduce((sum, h) => sum + amountNumber(h.value), 0);

  const ideas = [];
  ideas.push(`Target a monthly revenue run-rate above ${currency.format(Math.max(10000, income * 1.15))} by bundling consulting + bookkeeping retainers.`);

  if (net < 0) {
    ideas.push(`Net position is negative (${currency.format(net)}). Reduce top 3 expense categories by at least 12% and renegotiate vendor contracts this month.`);
  } else {
    ideas.push(`Net positive (${currency.format(net)}). Allocate 20% of surplus to growth marketing and 10% to reserve capital.`);
  }

  ideas.push(`Build a salary discipline plan: automate payroll from a dedicated account and cap salary-paid ratio under 35% of income.`);

  if (transferCount < 2) {
    ideas.push("Increase direct transaction clarity: use dedicated transfer entries between operating, payroll, and tax reserve accounts weekly.");
  } else {
    ideas.push("Direct transfer tracking is active—build weekly reconciliation to ensure from/to balances match bank statements.");
  }

  ideas.push(`Leverage holdings: real property value tracked at ${currency.format(propertyValue)} and insurance coverage at ${currency.format(insuranceValue)}—review coverage adequacy and refinancing options quarterly.`);
  ideas.push("Create a cross-company growth loop: transportation clients -> consulting optimization -> bookkeeping retainers -> trust structuring for long-term asset protection.");

  strategyList.innerHTML = "";
  ideas.forEach((idea) => {
    const li = document.createElement("li");
    li.textContent = idea;
    strategyList.append(li);
  });
};

const render = () => {
  const visible = getVisibleRecords();
  renderKpis(visible);
  renderRecords(visible);
  renderHoldings();
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
    fromAccount: fields.fromAccount.value.trim(),
    toAccount: fields.toAccount.value.trim(),
    status: fields.status.value,
    notes: fields.notes.value.trim()
  });

  const index = records.findIndex((record) => record.id === payload.id);
  if (index >= 0) records[index] = payload;
  else records.push(payload);

  saveRecords();
  resetForm();
  render();
});

holdingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = normalizeHolding({
    id: holdingFields.id.value || safeId(),
    type: holdingFields.type.value,
    name: holdingFields.name.value.trim(),
    company: holdingFields.company.value,
    value: holdingFields.value.value,
    date: holdingFields.date.value,
    notes: holdingFields.notes.value.trim()
  });

  const index = holdings.findIndex((holding) => holding.id === payload.id);
  if (index >= 0) holdings[index] = payload;
  else holdings.push(payload);

  saveHoldings();
  resetHoldingForm();
  render();
});

cancelEditBtn.addEventListener("click", resetForm);
filterCompany.addEventListener("change", render);
searchInput.addEventListener("input", render);
generateStrategyBtn.addEventListener("click", generateStrategies);

exportBtn.addEventListener("click", () => {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          records,
          holdings
        },
        null,
        2
      )
    ],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business-command-center-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

resetForm();
resetHoldingForm();
render();
