const recordsKey = "businessRecordsHub.v4.records";
const holdingsKey = "businessRecordsHub.v4.holdings";
const profilesKey = "businessRecordsHub.v4.profiles";
const tradelinesKey = "businessRecordsHub.v4.tradelines";
const fundingKey = "businessRecordsHub.v4.funding";

const companyNames = [
  "Trust Company",
  "Transportation Company",
  "Consulting Company",
  "Dispatch Company",
  "Bookkeeping Company"
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const amountNumber = (value) => Number.parseFloat(value || "0") || 0;
const toPercent = (value) => `${(Number.parseFloat(value || "0") || 0).toFixed(1)}%`;

const safeId = () => {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const parseStored = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

const profileForm = document.getElementById("company-profile-form");
const profilesBody = document.getElementById("profiles-body");
const profilesEmpty = document.getElementById("profiles-empty");

const tradelineForm = document.getElementById("tradeline-form");
const tradelinesBody = document.getElementById("tradelines-body");
const tradelinesEmpty = document.getElementById("tradelines-empty");

const fundingForm = document.getElementById("funding-form");
const fundingBody = document.getElementById("funding-body");
const fundingEmpty = document.getElementById("funding-empty");
const generateQualificationBtn = document.getElementById("generate-qualification");
const qualificationList = document.getElementById("qualification-list");

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

const profileFields = {
  id: document.getElementById("profile-id"),
  company: document.getElementById("profile-company"),
  duns: document.getElementById("duns-number"),
  score: document.getElementById("business-credit-score"),
  months: document.getElementById("time-in-business")
};

const tradelineFields = {
  id: document.getElementById("tradeline-id"),
  company: document.getElementById("tradeline-company"),
  creditor: document.getElementById("tradeline-creditor"),
  type: document.getElementById("tradeline-type"),
  status: document.getElementById("tradeline-status"),
  limit: document.getElementById("tradeline-limit"),
  balance: document.getElementById("tradeline-balance"),
  opened: document.getElementById("tradeline-opened"),
  paymentHistory: document.getElementById("tradeline-payment-history")
};

const fundingFields = {
  id: document.getElementById("funding-id"),
  company: document.getElementById("funding-company"),
  name: document.getElementById("funding-name"),
  type: document.getElementById("funding-type"),
  stage: document.getElementById("funding-stage"),
  amount: document.getElementById("funding-amount"),
  minScore: document.getElementById("funding-min-score"),
  minTime: document.getElementById("funding-min-time"),
  qualify: document.getElementById("funding-qualify")
};

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

const normalizeProfile = (profile) => ({
  id: profile.id || safeId(),
  company: profile.company || "",
  duns: (profile.duns || "").trim(),
  score: String(Math.max(0, Math.min(100, Number.parseFloat(profile.score || "0") || 0))),
  months: String(Math.max(0, Number.parseInt(profile.months || "0", 10) || 0))
});

const normalizeTradeline = (tradeline) => ({
  id: tradeline.id || safeId(),
  company: tradeline.company || "",
  creditor: tradeline.creditor || "",
  type: tradeline.type || "Net 30",
  status: tradeline.status || "Open",
  limit: String(amountNumber(tradeline.limit)),
  balance: String(amountNumber(tradeline.balance)),
  opened: tradeline.opened || "",
  paymentHistory: String(Math.max(0, Math.min(100, Number.parseFloat(tradeline.paymentHistory || "0") || 0)))
});

const normalizeFunding = (funding) => ({
  id: funding.id || safeId(),
  company: funding.company || "",
  name: funding.name || "",
  type: funding.type || "Loan",
  stage: funding.stage || "Researching",
  amount: String(amountNumber(funding.amount)),
  minScore: String(Math.max(0, Math.min(100, Number.parseFloat(funding.minScore || "0") || 0))),
  minTime: String(Math.max(0, Number.parseInt(funding.minTime || "0", 10) || 0)),
  qualify: funding.qualify || "Unknown"
});

let records = parseStored(recordsKey).map(normalizeRecord);
let holdings = parseStored(holdingsKey).map(normalizeHolding);
let profiles = parseStored(profilesKey).map(normalizeProfile);
let tradelines = parseStored(tradelinesKey).map(normalizeTradeline);
let fundingPrograms = parseStored(fundingKey).map(normalizeFunding);

const saveAll = () => {
  localStorage.setItem(recordsKey, JSON.stringify(records));
  localStorage.setItem(holdingsKey, JSON.stringify(holdings));
  localStorage.setItem(profilesKey, JSON.stringify(profiles));
  localStorage.setItem(tradelinesKey, JSON.stringify(tradelines));
  localStorage.setItem(fundingKey, JSON.stringify(fundingPrograms));
};

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
const resetProfileForm = () => {
  profileForm.reset();
  profileFields.id.value = "";
};
const resetTradelineForm = () => {
  tradelineForm.reset();
  tradelineFields.id.value = "";
};
const resetFundingForm = () => {
  fundingForm.reset();
  fundingFields.id.value = "";
};

const signedAmount = (record) => {
  const amount = amountNumber(record.amount);
  if (record.entryType === "Income" || record.entryType === "Salary Received") return amount;
  if (record.entryType === "Transfer") return 0;
  return -amount;
};

const entryTypeClass = (type) => `type-${type.toLowerCase().replace(/\s+/g, "-")}`;
const utilization = (line) => {
  const limit = amountNumber(line.limit);
  const balance = amountNumber(line.balance);
  return limit > 0 ? (balance / limit) * 100 : 0;
};

const getProfileByCompany = (company) => profiles.find((p) => p.company === company);
const getTradelinesByCompany = (company) => tradelines.filter((t) => t.company === company);

const getVisibleRecords = () => {
  const company = filterCompany.value;
  const term = searchInput.value.trim().toLowerCase();

  return records
    .filter((record) => company === "all" || record.company === company)
    .filter((record) => {
      if (!term) return true;
      return [record.title, record.recordType, record.notes, record.contact, record.company, record.status, record.fromAccount, record.toAccount, record.entryType]
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
      <td>${record.date || "-"}</td><td>${record.company || "-"}</td><td><span class="entry-type ${entryTypeClass(record.entryType)}">${record.entryType}</span></td>
      <td>${record.recordType || "-"}</td><td>${record.title || "-"}</td><td>${record.contact || "-"}</td><td>${record.fromAccount || "-"}</td><td>${record.toAccount || "-"}</td><td>${record.status || "-"}</td>
      <td class="num">${signed > 0 ? "+" : signed < 0 ? "-" : "±"}${currency.format(Math.abs(signed || amountNumber(record.amount)))}</td><td>${record.notes || "-"}</td>
      <td><div class="row-actions"><button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button></div></td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      Object.entries(fields).forEach(([key, el]) => {
        el.value = record[key] || "";
      });
      formTitle.textContent = "Edit Transaction";
      cancelEditBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    tr.querySelector(".delete").addEventListener("click", () => {
      records = records.filter((x) => x.id !== record.id);
      saveAll();
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
        <td>${holding.type}</td><td>${holding.name}</td><td>${holding.company}</td><td class="num">${currency.format(amountNumber(holding.value))}</td><td>${holding.date || "-"}</td><td>${holding.notes || "-"}</td>
        <td><div class="row-actions"><button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button></div></td>
      `;

      tr.querySelector(".edit").addEventListener("click", () => {
        Object.entries(holdingFields).forEach(([key, el]) => {
          el.value = holding[key] || "";
        });
      });
      tr.querySelector(".delete").addEventListener("click", () => {
        holdings = holdings.filter((x) => x.id !== holding.id);
        saveAll();
        render();
      });
      holdingsBody.append(tr);
    });
};

const renderProfiles = () => {
  profilesBody.innerHTML = "";
  if (!profiles.length) {
    profilesEmpty.hidden = false;
    return;
  }
  profilesEmpty.hidden = true;

  profiles.forEach((profile) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${profile.company}</td><td>${profile.duns || "-"}</td><td>${profile.score || "-"}</td><td>${profile.months || "0"} months</td>
      <td><div class="row-actions"><button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button></div></td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      Object.entries(profileFields).forEach(([key, el]) => {
        el.value = profile[key] || "";
      });
    });
    tr.querySelector(".delete").addEventListener("click", () => {
      profiles = profiles.filter((x) => x.id !== profile.id);
      saveAll();
      render();
    });

    profilesBody.append(tr);
  });
};

const renderTradelines = () => {
  tradelinesBody.innerHTML = "";
  if (!tradelines.length) {
    tradelinesEmpty.hidden = false;
    return;
  }
  tradelinesEmpty.hidden = true;

  tradelines.forEach((line) => {
    const util = utilization(line);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line.company}</td><td>${line.creditor}</td><td>${line.type}</td><td>${line.status}</td><td class="num">${currency.format(amountNumber(line.limit))}</td>
      <td class="num">${currency.format(amountNumber(line.balance))}</td><td class="num">${toPercent(util)}</td><td>${toPercent(line.paymentHistory)}</td><td>${line.opened || "-"}</td>
      <td><div class="row-actions"><button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button></div></td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      Object.entries(tradelineFields).forEach(([key, el]) => {
        el.value = line[key] || "";
      });
    });
    tr.querySelector(".delete").addEventListener("click", () => {
      tradelines = tradelines.filter((x) => x.id !== line.id);
      saveAll();
      render();
    });

    tradelinesBody.append(tr);
  });
};

const renderFundingPrograms = () => {
  fundingBody.innerHTML = "";
  if (!fundingPrograms.length) {
    fundingEmpty.hidden = false;
    return;
  }
  fundingEmpty.hidden = true;

  fundingPrograms.forEach((program) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${program.company}</td><td>${program.name}</td><td>${program.type}</td><td>${program.stage}</td><td class="num">${currency.format(amountNumber(program.amount))}</td>
      <td>${program.minScore || "-"}</td><td>${program.minTime || "0"} months</td><td>${program.qualify}</td>
      <td><div class="row-actions"><button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button></div></td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      Object.entries(fundingFields).forEach(([key, el]) => {
        el.value = program[key] || "";
      });
    });
    tr.querySelector(".delete").addEventListener("click", () => {
      fundingPrograms = fundingPrograms.filter((x) => x.id !== program.id);
      saveAll();
      render();
    });

    fundingBody.append(tr);
  });
};

const generateStrategies = () => {
  const visible = getVisibleRecords();
  const income = visible.filter((r) => ["Income", "Salary Received"].includes(r.entryType)).reduce((sum, r) => sum + amountNumber(r.amount), 0);
  const outflow = visible.filter((r) => ["Expense", "Salary Paid"].includes(r.entryType)).reduce((sum, r) => sum + amountNumber(r.amount), 0);
  const net = income - outflow;
  const propertyValue = holdings.filter((h) => h.type === "Real Property").reduce((sum, h) => sum + amountNumber(h.value), 0);
  const insuranceValue = holdings.filter((h) => h.type === "Insurance Policy").reduce((sum, h) => sum + amountNumber(h.value), 0);

  const ideas = [
    `Revenue target: push monthly run-rate above ${currency.format(Math.max(10000, income * 1.2))} by packaging cross-company service bundles.`,
    net >= 0
      ? `Net positive (${currency.format(net)}): allocate 20% of surplus to growth and 10% to underwriting reserve.`
      : `Net negative (${currency.format(net)}): cut non-essential outflow by 12% and improve receivables collection speed.`,
    `Use asset-backed positioning: property holdings ${currency.format(propertyValue)} and insurance coverage ${currency.format(insuranceValue)} should be updated quarterly for lender confidence.`
  ];

  strategyList.innerHTML = "";
  ideas.forEach((idea) => {
    const li = document.createElement("li");
    li.textContent = idea;
    strategyList.append(li);
  });
};

const generateQualificationPlan = () => {
  const ideas = [];

  companyNames.forEach((company) => {
    const profile = getProfileByCompany(company);
    const companyTradelines = getTradelinesByCompany(company);
    const avgUtil =
      companyTradelines.length > 0
        ? companyTradelines.reduce((sum, line) => sum + utilization(line), 0) / companyTradelines.length
        : 0;
    const avgPayment =
      companyTradelines.length > 0
        ? companyTradelines.reduce((sum, line) => sum + (Number.parseFloat(line.paymentHistory) || 0), 0) / companyTradelines.length
        : 0;

    const score = Number.parseFloat(profile?.score || "0") || 0;
    const months = Number.parseInt(profile?.months || "0", 10) || 0;

    if (!profile || !profile.duns) {
      ideas.push(`${company}: add/verify DUNS number first. Lenders and vendor tradelines typically require strong business identity data.`);
      return;
    }

    if (companyTradelines.length < 3) {
      ideas.push(`${company}: open at least ${3 - companyTradelines.length} additional tradeline(s) to strengthen credit depth before large loan/grant applications.`);
    }

    if (avgUtil > 35) {
      ideas.push(`${company}: reduce tradeline utilization from ${toPercent(avgUtil)} to below 30% to improve loan and credit approval odds.`);
    }

    if (avgPayment < 98) {
      ideas.push(`${company}: improve payment history to 98%+ (current ${toPercent(avgPayment)}) for better underwriting decisions.`);
    }

    const matches = fundingPrograms.filter((program) => {
      if (program.company !== company) return false;
      return score >= (Number.parseFloat(program.minScore) || 0) && months >= (Number.parseInt(program.minTime, 10) || 0);
    });

    if (matches.length > 0) {
      ideas.push(`${company}: likely qualified now for ${matches.length} program(s). Prioritize: ${matches.slice(0, 2).map((m) => m.name).join(", ")}.`);
    } else {
      ideas.push(`${company}: build qualification runway by increasing score to 80+, time-in-business to 12+ months, and keeping utilization low.`);
    }
  });

  if (!ideas.length) {
    ideas.push("Add company profiles, tradelines, and funding programs first to generate qualification guidance.");
  }

  qualificationList.innerHTML = "";
  ideas.forEach((idea) => {
    const li = document.createElement("li");
    li.textContent = idea;
    qualificationList.append(li);
  });
};

const render = () => {
  const visible = getVisibleRecords();
  renderKpis(visible);
  renderRecords(visible);
  renderHoldings();
  renderProfiles();
  renderTradelines();
  renderFundingPrograms();
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
  saveAll();
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

  const index = holdings.findIndex((item) => item.id === payload.id);
  if (index >= 0) holdings[index] = payload;
  else holdings.push(payload);
  saveAll();
  resetHoldingForm();
  render();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = normalizeProfile({
    id: profileFields.id.value || safeId(),
    company: profileFields.company.value,
    duns: profileFields.duns.value,
    score: profileFields.score.value,
    months: profileFields.months.value
  });

  const existingById = profiles.findIndex((item) => item.id === payload.id);
  const existingByCompany = profiles.findIndex((item) => item.company === payload.company);
  const index = existingById >= 0 ? existingById : existingByCompany;

  if (index >= 0) profiles[index] = payload;
  else profiles.push(payload);
  saveAll();
  resetProfileForm();
  render();
});

tradelineForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = normalizeTradeline({
    id: tradelineFields.id.value || safeId(),
    company: tradelineFields.company.value,
    creditor: tradelineFields.creditor.value.trim(),
    type: tradelineFields.type.value,
    status: tradelineFields.status.value,
    limit: tradelineFields.limit.value,
    balance: tradelineFields.balance.value,
    opened: tradelineFields.opened.value,
    paymentHistory: tradelineFields.paymentHistory.value
  });

  const index = tradelines.findIndex((item) => item.id === payload.id);
  if (index >= 0) tradelines[index] = payload;
  else tradelines.push(payload);
  saveAll();
  resetTradelineForm();
  render();
});

fundingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = normalizeFunding({
    id: fundingFields.id.value || safeId(),
    company: fundingFields.company.value,
    name: fundingFields.name.value.trim(),
    type: fundingFields.type.value,
    stage: fundingFields.stage.value,
    amount: fundingFields.amount.value,
    minScore: fundingFields.minScore.value,
    minTime: fundingFields.minTime.value,
    qualify: fundingFields.qualify.value
  });

  const index = fundingPrograms.findIndex((item) => item.id === payload.id);
  if (index >= 0) fundingPrograms[index] = payload;
  else fundingPrograms.push(payload);
  saveAll();
  resetFundingForm();
  render();
});

cancelEditBtn.addEventListener("click", resetForm);
filterCompany.addEventListener("change", render);
searchInput.addEventListener("input", render);
generateStrategyBtn.addEventListener("click", generateStrategies);
generateQualificationBtn.addEventListener("click", generateQualificationPlan);

exportBtn.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    records,
    holdings,
    profiles,
    tradelines,
    fundingPrograms
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business-credit-funding-command-center.json";
  a.click();
  URL.revokeObjectURL(url);
});

resetForm();
resetHoldingForm();
resetProfileForm();
resetTradelineForm();
resetFundingForm();
render();
