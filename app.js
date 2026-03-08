const keys = {
  records: "businessRecordsHub.v5.records",
  holdings: "businessRecordsHub.v5.holdings",
  profiles: "businessRecordsHub.v5.profiles",
  tradelines: "businessRecordsHub.v5.tradelines",
  funding: "businessRecordsHub.v5.funding",
  filings: "businessRecordsHub.v5.filings",
  autoLoans: "businessRecordsHub.v5.autoLoans"
};

const companies = [
  "Trust Company",
  "Transportation Company",
  "Consulting Company",
  "Dispatch Company",
  "Bookkeeping Company"
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const amountNumber = (value) => Number.parseFloat(value || "0") || 0;
const percent = (value) => `${(Number.parseFloat(value || "0") || 0).toFixed(1)}%`;
const id = () => (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
const parse = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const byId = (domId) => document.getElementById(domId);

const fields = {
  record: {
    id: byId("record-id"), company: byId("company"), entryType: byId("entry-type"), recordType: byId("record-type"), title: byId("title"),
    date: byId("date"), amount: byId("amount"), contact: byId("contact"), fromAccount: byId("from-account"), toAccount: byId("to-account"),
    status: byId("status"), notes: byId("notes")
  },
  holding: {
    id: byId("holding-id"), type: byId("holding-type"), name: byId("holding-name"), company: byId("holding-company"), value: byId("holding-value"),
    date: byId("holding-date"), notes: byId("holding-notes")
  },
  profile: {
    id: byId("profile-id"), company: byId("profile-company"), duns: byId("duns-number"), score: byId("business-credit-score"), months: byId("time-in-business")
  },
  tradeline: {
    id: byId("tradeline-id"), company: byId("tradeline-company"), creditor: byId("tradeline-creditor"), type: byId("tradeline-type"), status: byId("tradeline-status"),
    limit: byId("tradeline-limit"), balance: byId("tradeline-balance"), opened: byId("tradeline-opened"), paymentHistory: byId("tradeline-payment-history")
  },
  funding: {
    id: byId("funding-id"), company: byId("funding-company"), name: byId("funding-name"), type: byId("funding-type"), stage: byId("funding-stage"),
    amount: byId("funding-amount"), minScore: byId("funding-min-score"), minTime: byId("funding-min-time"), qualify: byId("funding-qualify")
  },
  filing: {
    id: byId("filing-id"), company: byId("filing-company"), type: byId("filing-type"), reference: byId("filing-reference"), status: byId("filing-status"),
    counterparty: byId("filing-counterparty"), effective: byId("filing-effective"), renewal: byId("filing-renewal"), amount: byId("filing-amount"), notes: byId("filing-notes")
  },
  auto: {
    id: byId("auto-id"), company: byId("auto-company"), vehicle: byId("auto-vehicle"), price: byId("auto-price"), down: byId("auto-down"),
    term: byId("auto-term"), apr: byId("auto-apr"), revenue: byId("auto-revenue"), debt: byId("auto-debt")
  }
};

const ui = {
  recordsBody: byId("records-body"), recordsEmpty: byId("empty-state"),
  holdingsBody: byId("holdings-body"), holdingsEmpty: byId("holdings-empty"),
  profilesBody: byId("profiles-body"), profilesEmpty: byId("profiles-empty"),
  tradelinesBody: byId("tradelines-body"), tradelinesEmpty: byId("tradelines-empty"),
  fundingBody: byId("funding-body"), fundingEmpty: byId("funding-empty"),
  filingsBody: byId("filings-body"), filingsEmpty: byId("filings-empty"),
  autoBody: byId("auto-body"), autoEmpty: byId("auto-empty"),
  strategyList: byId("strategy-list"), qualificationList: byId("qualification-list"),
  formTitle: byId("form-title"), cancelEdit: byId("cancel-edit"),
  search: byId("search"), filterCompany: byId("filter-company"),
  kpiIncome: byId("kpi-income"), kpiExpense: byId("kpi-expense"), kpiNet: byId("kpi-net"), kpiCount: byId("kpi-count"),
  kpiSalaryPaid: byId("kpi-salary-paid"), kpiSalaryReceived: byId("kpi-salary-received")
};

let state = {
  records: parse(keys.records),
  holdings: parse(keys.holdings),
  profiles: parse(keys.profiles),
  tradelines: parse(keys.tradelines),
  funding: parse(keys.funding),
  filings: parse(keys.filings),
  autoLoans: parse(keys.autoLoans)
};

const save = () => {
  Object.entries(keys).forEach(([k, v]) => localStorage.setItem(v, JSON.stringify(state[k])));
};

const upsert = (collection, payload) => {
  const i = state[collection].findIndex((x) => x.id === payload.id);
  if (i >= 0) state[collection][i] = payload;
  else state[collection].push(payload);
};
const del = (collection, itemId) => {
  state[collection] = state[collection].filter((x) => x.id !== itemId);
  save();
  render();
};

const signedAmount = (r) => {
  const amount = amountNumber(r.amount);
  if (r.entryType === "Income" || r.entryType === "Salary Received") return amount;
  if (r.entryType === "Transfer") return 0;
  return -amount;
};

const utilization = (line) => {
  const limit = amountNumber(line.limit);
  return limit > 0 ? (amountNumber(line.balance) / limit) * 100 : 0;
};

const monthlyPayment = (principal, aprPct, termMonths) => {
  const n = Number.parseInt(termMonths || "0", 10) || 0;
  if (n <= 0) return 0;
  const r = (Number.parseFloat(aprPct || "0") || 0) / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

const autoDecision = (scenario) => {
  const profile = state.profiles.find((p) => p.company === scenario.company);
  const score = Number.parseFloat(profile?.score || "0") || 0;
  const months = Number.parseInt(profile?.months || "0", 10) || 0;
  const principal = Math.max(0, amountNumber(scenario.price) - amountNumber(scenario.down));
  const payment = monthlyPayment(principal, scenario.apr, scenario.term);
  const revenue = amountNumber(scenario.revenue);
  const debt = amountNumber(scenario.debt);
  const dscr = payment > 0 ? (revenue - debt) / payment : 0;

  let status = "Review Needed";
  if (score >= 75 && months >= 12 && dscr >= 1.25) status = "Likely Auto Approved";
  else if (score >= 68 && months >= 6 && dscr >= 1.1) status = "Conditional Approval";
  else status = "Not Qualified Yet";

  return { payment, dscr, status, score, months };
};

const normalize = {
  record: (x) => ({ id: x.id || id(), company: x.company || "", entryType: x.entryType || "Expense", recordType: x.recordType || "", title: x.title || "", date: x.date || "", amount: String(amountNumber(x.amount)), contact: x.contact || "", fromAccount: x.fromAccount || "", toAccount: x.toAccount || "", status: x.status || "Open", notes: x.notes || "" }),
  holding: (x) => ({ id: x.id || id(), type: x.type || "Real Property", name: x.name || "", company: x.company || "", value: String(amountNumber(x.value)), date: x.date || "", notes: x.notes || "" }),
  profile: (x) => ({ id: x.id || id(), company: x.company || "", duns: (x.duns || "").trim(), score: String(Math.max(0, Math.min(100, Number.parseFloat(x.score || "0") || 0))), months: String(Math.max(0, Number.parseInt(x.months || "0", 10) || 0)) }),
  tradeline: (x) => ({ id: x.id || id(), company: x.company || "", creditor: x.creditor || "", type: x.type || "Net 30", status: x.status || "Open", limit: String(amountNumber(x.limit)), balance: String(amountNumber(x.balance)), opened: x.opened || "", paymentHistory: String(Math.max(0, Math.min(100, Number.parseFloat(x.paymentHistory || "0") || 0))) }),
  funding: (x) => ({ id: x.id || id(), company: x.company || "", name: x.name || "", type: x.type || "Loan", stage: x.stage || "Researching", amount: String(amountNumber(x.amount)), minScore: String(Math.max(0, Math.min(100, Number.parseFloat(x.minScore || "0") || 0))), minTime: String(Math.max(0, Number.parseInt(x.minTime || "0", 10) || 0)), qualify: x.qualify || "Unknown" }),
  filing: (x) => ({ id: x.id || id(), company: x.company || "", type: x.type || "UCC1 Statement", reference: x.reference || "", status: x.status || "Draft", counterparty: x.counterparty || "", effective: x.effective || "", renewal: x.renewal || "", amount: String(amountNumber(x.amount)), notes: x.notes || "" }),
  auto: (x) => ({ id: x.id || id(), company: x.company || "", vehicle: x.vehicle || "", price: String(amountNumber(x.price)), down: String(amountNumber(x.down)), term: String(Math.max(12, Number.parseInt(x.term || "60", 10) || 60)), apr: String(Math.max(0, Number.parseFloat(x.apr || "9.5") || 9.5)), revenue: String(amountNumber(x.revenue)), debt: String(amountNumber(x.debt)) })
};

Object.keys(state).forEach((k) => { state[k] = state[k].map(normalize[k.slice(0, -1)] || ((x) => x)); });

const fillForm = (group, data) => Object.entries(fields[group]).forEach(([k, el]) => { el.value = data[k] || ""; });

const emptyToggle = (body, emptyEl, len) => {
  body.innerHTML = "";
  emptyEl.hidden = len > 0;
};

const renderRecords = (visible) => {
  emptyToggle(ui.recordsBody, ui.recordsEmpty, visible.length);
  visible.forEach((r) => {
    const tr = document.createElement("tr");
    const signed = signedAmount(r);
    tr.innerHTML = `<td>${r.date || "-"}</td><td>${r.company}</td><td>${r.entryType}</td><td>${r.recordType}</td><td>${r.title}</td><td>${r.contact || "-"}</td><td>${r.fromAccount || "-"}</td><td>${r.toAccount || "-"}</td><td>${r.status}</td><td class="num">${signed > 0 ? "+" : signed < 0 ? "-" : "±"}${currency.format(Math.abs(signed || amountNumber(r.amount)))}</td><td>${r.notes || "-"}</td><td><div class="row-actions"><button class="edit">Edit</button><button class="delete">Delete</button></div></td>`;
    tr.querySelector(".edit").addEventListener("click", () => { fillForm("record", r); ui.formTitle.textContent = "Edit Transaction"; ui.cancelEdit.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); });
    tr.querySelector(".delete").addEventListener("click", () => del("records", r.id));
    ui.recordsBody.append(tr);
  });
};

const renderSimple = (collection, bodyEl, emptyEl, cols, onEdit, rowMap) => {
  const list = state[collection];
  emptyToggle(bodyEl, emptyEl, list.length);
  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `${rowMap(item)}<td><div class="row-actions"><button class="edit">Edit</button><button class="delete">Delete</button></div></td>`;
    tr.querySelector(".edit").addEventListener("click", () => onEdit(item));
    tr.querySelector(".delete").addEventListener("click", () => del(collection, item.id));
    bodyEl.append(tr);
  });
};

const renderKpis = (visible) => {
  const total = visible.reduce((acc, r) => {
    const amount = amountNumber(r.amount);
    if (r.entryType === "Income") acc.income += amount;
    if (r.entryType === "Salary Received") { acc.income += amount; acc.salaryReceived += amount; }
    if (r.entryType === "Expense") acc.expense += amount;
    if (r.entryType === "Salary Paid") { acc.expense += amount; acc.salaryPaid += amount; }
    return acc;
  }, { income: 0, expense: 0, salaryPaid: 0, salaryReceived: 0 });

  ui.kpiIncome.textContent = currency.format(total.income);
  ui.kpiExpense.textContent = currency.format(total.expense);
  ui.kpiNet.textContent = currency.format(total.income - total.expense);
  ui.kpiCount.textContent = String(visible.length);
  ui.kpiSalaryPaid.textContent = currency.format(total.salaryPaid);
  ui.kpiSalaryReceived.textContent = currency.format(total.salaryReceived);
};

const visibleRecords = () => {
  const c = ui.filterCompany.value;
  const term = ui.search.value.trim().toLowerCase();
  return state.records
    .filter((r) => c === "all" || r.company === c)
    .filter((r) => !term || [r.title, r.recordType, r.notes, r.contact, r.fromAccount, r.toAccount, r.entryType].filter(Boolean).some((t) => t.toLowerCase().includes(term)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const generateStrategy = () => {
  const inc = state.records.filter((r) => ["Income", "Salary Received"].includes(r.entryType)).reduce((s, r) => s + amountNumber(r.amount), 0);
  const exp = state.records.filter((r) => ["Expense", "Salary Paid"].includes(r.entryType)).reduce((s, r) => s + amountNumber(r.amount), 0);
  const filedUcc = state.filings.filter((f) => f.type === "UCC1 Statement" && ["Filed", "Active"].includes(f.status)).length;
  const fiduciary = state.filings.filter((f) => f.type === "Fiduciary Filing" && ["Filed", "Active"].includes(f.status)).length;
  const reserve = Math.max(0, inc - exp) * 0.15;

  const ideas = [
    `Be-your-own-bank plan: target internal reserve account at ${currency.format(reserve)} (15% of net cash flow) and route all debt service through it.`,
    `Structure secured financing stack: maintain active UCC1 filings (${filedUcc}) and standardized contracts to strengthen collateral credibility.`,
    fiduciary > 0 ? `Fiduciary posture is active (${fiduciary} filing(s)); align trust/estate documentation with lending and grant packages.` : "Add fiduciary filings for trust-driven entities to improve governance score in underwriting reviews.",
    "Create an internal lending policy: set max LTV, debt service coverage floor (1.25+), and approval matrix before external borrowing.",
    "Use contract portfolio to support predictable revenue claims in loan applications (recurring service agreements, dispatch contracts, retainers)."
  ];

  ui.strategyList.innerHTML = "";
  ideas.forEach((txt) => { const li = document.createElement("li"); li.textContent = txt; ui.strategyList.append(li); });
};

const generateQualification = () => {
  const lines = [];
  companies.forEach((company) => {
    const profile = state.profiles.find((p) => p.company === company);
    const tradelines = state.tradelines.filter((t) => t.company === company);
    const filings = state.filings.filter((f) => f.company === company);
    const score = Number.parseFloat(profile?.score || "0") || 0;
    const months = Number.parseInt(profile?.months || "0", 10) || 0;
    const avgUtil = tradelines.length ? tradelines.reduce((s, t) => s + utilization(t), 0) / tradelines.length : 0;

    if (!profile?.duns) lines.push(`${company}: add/verify DUNS before applications.`);
    if (tradelines.length < 3) lines.push(`${company}: add ${3 - tradelines.length} tradeline(s) to improve credit depth.`);
    if (avgUtil > 30) lines.push(`${company}: lower utilization from ${percent(avgUtil)} to <30% for stronger approvals.`);
    if (!filings.some((f) => f.type === "UCC1 Statement" && ["Filed", "Active"].includes(f.status))) lines.push(`${company}: file/activate UCC1 if using collateral-backed lending strategy.`);

    const matches = state.funding.filter((p) => p.company === company && score >= amountNumber(p.minScore) && months >= amountNumber(p.minTime));
    if (matches.length) lines.push(`${company}: likely qualified for ${matches.length} program(s): ${matches.slice(0, 2).map((m) => m.name).join(", ")}.`);
    else lines.push(`${company}: build to 75+ score and 12+ months time-in-business for better loan/grant access.`);
  });

  ui.qualificationList.innerHTML = "";
  lines.forEach((txt) => { const li = document.createElement("li"); li.textContent = txt; ui.qualificationList.append(li); });
};

const runAutoQualifier = () => render();

const render = () => {
  const visible = visibleRecords();
  renderKpis(visible);
  renderRecords(visible);

  renderSimple("holdings", ui.holdingsBody, ui.holdingsEmpty, [], (item) => fillForm("holding", item), (x) => `<td>${x.type}</td><td>${x.name}</td><td>${x.company}</td><td class="num">${currency.format(amountNumber(x.value))}</td><td>${x.date || "-"}</td><td>${x.notes || "-"}</td>`);
  renderSimple("profiles", ui.profilesBody, ui.profilesEmpty, [], (item) => fillForm("profile", item), (x) => `<td>${x.company}</td><td>${x.duns || "-"}</td><td>${x.score || "-"}</td><td>${x.months || 0} months</td>`);
  renderSimple("tradelines", ui.tradelinesBody, ui.tradelinesEmpty, [], (item) => fillForm("tradeline", item), (x) => `<td>${x.company}</td><td>${x.creditor}</td><td>${x.type}</td><td>${x.status}</td><td class="num">${currency.format(amountNumber(x.limit))}</td><td class="num">${currency.format(amountNumber(x.balance))}</td><td class="num">${percent(utilization(x))}</td><td>${percent(x.paymentHistory)}</td><td>${x.opened || "-"}</td>`);
  renderSimple("funding", ui.fundingBody, ui.fundingEmpty, [], (item) => fillForm("funding", item), (x) => `<td>${x.company}</td><td>${x.name}</td><td>${x.type}</td><td>${x.stage}</td><td class="num">${currency.format(amountNumber(x.amount))}</td><td>${x.minScore || "-"}</td><td>${x.minTime || 0} months</td><td>${x.qualify}</td>`);
  renderSimple("filings", ui.filingsBody, ui.filingsEmpty, [], (item) => fillForm("filing", item), (x) => `<td>${x.company}</td><td>${x.type}</td><td>${x.reference}</td><td>${x.status}</td><td>${x.counterparty || "-"}</td><td>${x.effective || "-"}</td><td>${x.renewal || "-"}</td><td class="num">${currency.format(amountNumber(x.amount))}</td><td>${x.notes || "-"}</td>`);

  emptyToggle(ui.autoBody, ui.autoEmpty, state.autoLoans.length);
  state.autoLoans.forEach((scenario) => {
    const evald = autoDecision(scenario);
    const tr = document.createElement("tr");
    const principal = Math.max(0, amountNumber(scenario.price) - amountNumber(scenario.down));
    tr.innerHTML = `<td>${scenario.company}</td><td>${scenario.vehicle}</td><td class="num">${currency.format(amountNumber(scenario.price))}</td><td class="num">${currency.format(amountNumber(scenario.down))}</td><td>${scenario.term} mo</td><td>${percent(scenario.apr)}</td><td class="num">${currency.format(evald.payment)}</td><td class="num">${evald.dscr.toFixed(2)}</td><td>${evald.status}</td><td><div class="row-actions"><button class="edit">Edit</button><button class="delete">Delete</button></div></td>`;
    tr.querySelector(".edit").addEventListener("click", () => fillForm("auto", scenario));
    tr.querySelector(".delete").addEventListener("click", () => del("autoLoans", scenario.id));
    ui.autoBody.append(tr);
  });
};

const getPayload = (group) => Object.fromEntries(Object.entries(fields[group]).map(([k, el]) => [k, el.value]));

byId("record-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("records", normalize.record(getPayload("record"))); save(); resetRecord(); render(); });
byId("holding-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("holdings", normalize.holding(getPayload("holding"))); save(); fields.holding.id.value = ""; byId("holding-form").reset(); render(); });
byId("company-profile-form").addEventListener("submit", (e) => { e.preventDefault(); const p = normalize.profile(getPayload("profile")); const existing = state.profiles.find((x) => x.company === p.company); if (existing && !p.id) p.id = existing.id; upsert("profiles", p); save(); fields.profile.id.value = ""; byId("company-profile-form").reset(); render(); });
byId("tradeline-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("tradelines", normalize.tradeline(getPayload("tradeline"))); save(); fields.tradeline.id.value = ""; byId("tradeline-form").reset(); render(); });
byId("funding-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("funding", normalize.funding(getPayload("funding"))); save(); fields.funding.id.value = ""; byId("funding-form").reset(); render(); });
byId("filing-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("filings", normalize.filing(getPayload("filing"))); save(); fields.filing.id.value = ""; byId("filing-form").reset(); render(); });
byId("auto-loan-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("autoLoans", normalize.auto(getPayload("auto"))); save(); fields.auto.id.value = ""; byId("auto-loan-form").reset(); fields.auto.term.value = "60"; fields.auto.apr.value = "9.5"; render(); });

const resetRecord = () => { byId("record-form").reset(); fields.record.id.value = ""; fields.record.entryType.value = "Income"; ui.formTitle.textContent = "Add Transaction"; ui.cancelEdit.hidden = true; };
ui.cancelEdit.addEventListener("click", resetRecord);
ui.filterCompany.addEventListener("change", render);
ui.search.addEventListener("input", render);

byId("generate-strategy").addEventListener("click", generateStrategy);
byId("generate-qualification").addEventListener("click", generateQualification);
byId("generate-auto-loan").addEventListener("click", runAutoQualifier);

byId("export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "business-credit-filing-funding-command-center.json";
  a.click();
  URL.revokeObjectURL(url);
});

resetRecord();
render();
