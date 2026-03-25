const keys = {
  records: "businessRecordsHub.v6.records",
  holdings: "businessRecordsHub.v6.holdings",
  profiles: "businessRecordsHub.v6.profiles",
  tradelines: "businessRecordsHub.v6.tradelines",
  funding: "businessRecordsHub.v6.funding",
  filings: "businessRecordsHub.v6.filings",
  autoLoans: "businessRecordsHub.v6.autoLoans",
  meta: "businessRecordsHub.v6.meta"
};

const companies = ["Trust Company", "Transportation Company", "Consulting Company", "Dispatch Company", "Bookkeeping Company"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v) => Number.parseFloat(v || "0") || 0;
const pct = (v) => `${(Number.parseFloat(v || "0") || 0).toFixed(1)}%`;
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.floor(Math.random() * 9999)}`);

const el = (id) => document.getElementById(id);
const toastEl = el("toast");
const lastSavedEl = el("last-saved");

const fields = {
  record: ["record-id", "company", "entry-type", "record-type", "title", "date", "amount", "contact", "from-account", "to-account", "status", "notes"],
  holding: ["holding-id", "holding-type", "holding-name", "holding-company", "holding-value", "holding-date", "holding-notes"],
  profile: ["profile-id", "profile-company", "duns-number", "business-credit-score", "time-in-business"],
  tradeline: ["tradeline-id", "tradeline-company", "tradeline-creditor", "tradeline-type", "tradeline-status", "tradeline-limit", "tradeline-balance", "tradeline-opened", "tradeline-payment-history"],
  funding: ["funding-id", "funding-company", "funding-name", "funding-type", "funding-stage", "funding-amount", "funding-min-score", "funding-min-time", "funding-qualify"],
  filing: ["filing-id", "filing-company", "filing-type", "filing-reference", "filing-status", "filing-counterparty", "filing-effective", "filing-renewal", "filing-amount", "filing-notes"],
  auto: ["auto-id", "auto-company", "auto-vehicle", "auto-price", "auto-down", "auto-term", "auto-apr", "auto-revenue", "auto-debt"]
};

const parse = (key, fallback = []) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(fallback) ? (Array.isArray(v) ? v : fallback) : v || fallback;
  } catch {
    return fallback;
  }
};

const initState = () => ({
  records: parse(keys.records), holdings: parse(keys.holdings), profiles: parse(keys.profiles), tradelines: parse(keys.tradelines),
  funding: parse(keys.funding), filings: parse(keys.filings), autoLoans: parse(keys.autoLoans), meta: parse(keys.meta, { updatedAt: null })
});

let state = initState();

const showToast = (msg, ms = 2200) => {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  setTimeout(() => { toastEl.hidden = true; }, ms);
};

const validateDuns = (value) => /^\d{2}-?\d{3}-?\d{4}$/.test(String(value || "").trim());

const payload = (group) => {
  const ids = fields[group];
  const values = ids.map((id) => el(id).value);
  return Object.fromEntries(ids.map((id, i) => [id, values[i]]));
};

const map = {
  record: (p) => ({ id: p["record-id"] || uuid(), company: p.company, entryType: p["entry-type"], recordType: p["record-type"].trim(), title: p.title.trim(), date: p.date, amount: String(num(p.amount)), contact: p.contact.trim(), fromAccount: p["from-account"].trim(), toAccount: p["to-account"].trim(), status: p.status, notes: p.notes.trim() }),
  holding: (p) => ({ id: p["holding-id"] || uuid(), type: p["holding-type"], name: p["holding-name"].trim(), company: p["holding-company"], value: String(num(p["holding-value"])), date: p["holding-date"], notes: p["holding-notes"].trim() }),
  profile: (p) => ({ id: p["profile-id"] || uuid(), company: p["profile-company"], duns: p["duns-number"].trim(), score: String(Math.max(0, Math.min(100, num(p["business-credit-score"])))), months: String(Math.max(0, parseInt(p["time-in-business"], 10) || 0)) }),
  tradeline: (p) => ({ id: p["tradeline-id"] || uuid(), company: p["tradeline-company"], creditor: p["tradeline-creditor"].trim(), type: p["tradeline-type"], status: p["tradeline-status"], limit: String(num(p["tradeline-limit"])), balance: String(num(p["tradeline-balance"])), opened: p["tradeline-opened"], paymentHistory: String(Math.max(0, Math.min(100, num(p["tradeline-payment-history"])))) }),
  funding: (p) => ({ id: p["funding-id"] || uuid(), company: p["funding-company"], name: p["funding-name"].trim(), type: p["funding-type"], stage: p["funding-stage"], amount: String(num(p["funding-amount"])), minScore: String(Math.max(0, Math.min(100, num(p["funding-min-score"])))), minTime: String(Math.max(0, parseInt(p["funding-min-time"], 10) || 0)), qualify: p["funding-qualify"] }),
  filing: (p) => ({ id: p["filing-id"] || uuid(), company: p["filing-company"], type: p["filing-type"], reference: p["filing-reference"].trim(), status: p["filing-status"], counterparty: p["filing-counterparty"].trim(), effective: p["filing-effective"], renewal: p["filing-renewal"], amount: String(num(p["filing-amount"])), notes: p["filing-notes"].trim() }),
  auto: (p) => ({ id: p["auto-id"] || uuid(), company: p["auto-company"], vehicle: p["auto-vehicle"].trim(), price: String(num(p["auto-price"])), down: String(num(p["auto-down"])), term: String(Math.max(12, parseInt(p["auto-term"], 10) || 60)), apr: String(Math.max(0, num(p["auto-apr"]))), revenue: String(num(p["auto-revenue"])), debt: String(num(p["auto-debt"])) })
};

const save = () => {
  state.meta.updatedAt = new Date().toISOString();
  Object.entries(keys).forEach(([k, storage]) => localStorage.setItem(storage, JSON.stringify(state[k])));
  lastSavedEl.textContent = `Last saved: ${new Date(state.meta.updatedAt).toLocaleString()}`;
};

const upsert = (collection, record) => {
  const idx = state[collection].findIndex((x) => x.id === record.id);
  if (idx >= 0) state[collection][idx] = record; else state[collection].push(record);
  save();
  render();
};

const remove = (collection, id) => {
  state[collection] = state[collection].filter((x) => x.id !== id);
  save();
  render();
};

const signed = (r) => (r.entryType === "Income" || r.entryType === "Salary Received" ? num(r.amount) : r.entryType === "Transfer" ? 0 : -num(r.amount));
const util = (t) => (num(t.limit) > 0 ? (num(t.balance) / num(t.limit)) * 100 : 0);
const monthlyPayment = (p, apr, n) => {
  const r = num(apr) / 1200;
  const months = parseInt(n, 10) || 1;
  return r === 0 ? p / months : (p * r) / (1 - (1 + r) ** -months);
};

const autoEval = (a) => {
  const principal = Math.max(0, num(a.price) - num(a.down));
  const payment = monthlyPayment(principal, a.apr, a.term);
  const dscr = payment > 0 ? (num(a.revenue) - num(a.debt)) / payment : 0;
  const profile = state.profiles.find((p) => p.company === a.company);
  const score = num(profile?.score);
  const months = parseInt(profile?.months || "0", 10);
  const status = score >= 75 && months >= 12 && dscr >= 1.25 ? "Likely Auto Approved" : score >= 68 && months >= 6 && dscr >= 1.1 ? "Conditional Approval" : "Not Qualified Yet";
  return { payment, dscr, status };
};

const rowActions = (onEdit, onDelete) => `<div class="row-actions"><button class="edit">Edit</button><button class="delete">Delete</button></div>`;
const attachActions = (tr, onEdit, onDelete) => {
  tr.querySelector(".edit").addEventListener("click", onEdit);
  tr.querySelector(".delete").addEventListener("click", onDelete);
};

const fill = (group, data) => fields[group].forEach((id) => { const key = id; if (el(id)) el(id).value = data[key] || data[id.replace(/-/g, "")] || data[id.split("-").slice(1).join("")] || ""; });

const renderTable = (tbodyId, emptyId, list, row, onEdit, onDelete) => {
  const body = el(tbodyId);
  const empty = el(emptyId);
  body.innerHTML = "";
  empty.hidden = list.length > 0;
  list.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = row(item) + `<td>${rowActions()}</td>`;
    attachActions(tr, () => onEdit(item), () => onDelete(item));
    body.append(tr);
  });
};

const visibleRecords = () => {
  const company = el("filter-company").value;
  const term = el("search").value.trim().toLowerCase();
  return state.records
    .filter((r) => company === "all" || r.company === company)
    .filter((r) => !term || [r.title, r.recordType, r.notes, r.contact, r.fromAccount, r.toAccount].join(" ").toLowerCase().includes(term))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const render = () => {
  const recs = visibleRecords();
  const totals = recs.reduce((acc, r) => {
    const a = num(r.amount);
    if (r.entryType === "Income") acc.income += a;
    if (r.entryType === "Salary Received") { acc.income += a; acc.sr += a; }
    if (r.entryType === "Expense") acc.expense += a;
    if (r.entryType === "Salary Paid") { acc.expense += a; acc.sp += a; }
    return acc;
  }, { income: 0, expense: 0, sp: 0, sr: 0 });

  el("kpi-income").textContent = currency.format(totals.income);
  el("kpi-expense").textContent = currency.format(totals.expense);
  el("kpi-net").textContent = currency.format(totals.income - totals.expense);
  el("kpi-count").textContent = String(recs.length);
  el("kpi-salary-paid").textContent = currency.format(totals.sp);
  el("kpi-salary-received").textContent = currency.format(totals.sr);

  renderTable("records-body", "empty-state", recs,
    (r) => `<td>${r.date || "-"}</td><td>${r.company}</td><td>${r.entryType}</td><td>${r.recordType}</td><td>${r.title}</td><td>${r.fromAccount || "-"}</td><td>${r.toAccount || "-"}</td><td>${r.status}</td><td class="num">${signed(r) >= 0 ? "+" : "-"}${currency.format(Math.abs(signed(r)))}</td>`,
    (r) => { el("record-id").value = r.id; el("company").value = r.company; el("entry-type").value = r.entryType; el("record-type").value = r.recordType; el("title").value = r.title; el("date").value = r.date; el("amount").value = r.amount; el("contact").value = r.contact; el("from-account").value = r.fromAccount; el("to-account").value = r.toAccount; el("status").value = r.status; el("notes").value = r.notes; el("form-title").textContent = "Edit Transaction"; el("cancel-edit").hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); },
    (r) => remove("records", r.id)
  );

  renderTable("profiles-body", "profiles-empty", state.profiles, (p) => `<td>${p.company}</td><td>${p.duns}</td><td>${p.score}</td><td>${p.months}</td>`,
    (p) => { el("profile-id").value = p.id; el("profile-company").value = p.company; el("duns-number").value = p.duns; el("business-credit-score").value = p.score; el("time-in-business").value = p.months; },
    (p) => remove("profiles", p.id));

  renderTable("tradelines-body", "tradelines-empty", state.tradelines, (t) => `<td>${t.company}</td><td>${t.creditor}</td><td>${t.type}</td><td>${t.status}</td><td class="num">${currency.format(num(t.limit))}</td><td class="num">${currency.format(num(t.balance))}</td><td class="num">${pct(util(t))}</td>`,
    (t) => { el("tradeline-id").value = t.id; el("tradeline-company").value = t.company; el("tradeline-creditor").value = t.creditor; el("tradeline-type").value = t.type; el("tradeline-status").value = t.status; el("tradeline-limit").value = t.limit; el("tradeline-balance").value = t.balance; el("tradeline-opened").value = t.opened; el("tradeline-payment-history").value = t.paymentHistory; },
    (t) => remove("tradelines", t.id));

  renderTable("filings-body", "filings-empty", state.filings, (f) => `<td>${f.company}</td><td>${f.type}</td><td>${f.reference}</td><td>${f.status}</td><td>${f.renewal || "-"}</td>`,
    (f) => { el("filing-id").value = f.id; el("filing-company").value = f.company; el("filing-type").value = f.type; el("filing-reference").value = f.reference; el("filing-status").value = f.status; el("filing-counterparty").value = f.counterparty; el("filing-effective").value = f.effective; el("filing-renewal").value = f.renewal; el("filing-amount").value = f.amount; el("filing-notes").value = f.notes; },
    (f) => remove("filings", f.id));

  renderTable("funding-body", "funding-empty", state.funding, (f) => `<td>${f.company}</td><td>${f.name}</td><td>${f.type}</td><td class="num">${currency.format(num(f.amount))}</td><td>${f.minScore}</td><td>${f.minTime}</td>`,
    (f) => { el("funding-id").value = f.id; el("funding-company").value = f.company; el("funding-name").value = f.name; el("funding-type").value = f.type; el("funding-stage").value = f.stage; el("funding-amount").value = f.amount; el("funding-min-score").value = f.minScore; el("funding-min-time").value = f.minTime; el("funding-qualify").value = f.qualify; },
    (f) => remove("funding", f.id));

  renderTable("holdings-body", "holdings-empty", state.holdings, (h) => `<td>${h.type}</td><td>${h.name}</td><td>${h.company}</td><td class="num">${currency.format(num(h.value))}</td>`,
    (h) => { el("holding-id").value = h.id; el("holding-type").value = h.type; el("holding-name").value = h.name; el("holding-company").value = h.company; el("holding-value").value = h.value; el("holding-date").value = h.date; el("holding-notes").value = h.notes; },
    (h) => remove("holdings", h.id));

  renderTable("auto-body", "auto-empty", state.autoLoans, (a) => {
    const e = autoEval(a);
    return `<td>${a.company}</td><td>${a.vehicle}</td><td class="num">${currency.format(e.payment)}</td><td class="num">${e.dscr.toFixed(2)}</td><td>${e.status}</td>`;
  },
  (a) => { el("auto-id").value = a.id; el("auto-company").value = a.company; el("auto-vehicle").value = a.vehicle; el("auto-price").value = a.price; el("auto-down").value = a.down; el("auto-term").value = a.term; el("auto-apr").value = a.apr; el("auto-revenue").value = a.revenue; el("auto-debt").value = a.debt; },
  (a) => remove("autoLoans", a.id));

  lastSavedEl.textContent = state.meta.updatedAt ? `Last saved: ${new Date(state.meta.updatedAt).toLocaleString()}` : "Last saved: never";
};

const resetRecord = () => {
  el("record-form").reset();
  el("record-id").value = "";
  el("entry-type").value = "Income";
  el("form-title").textContent = "Add Transaction";
  el("cancel-edit").hidden = true;
};

el("record-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("records", map.record(payload("record"))); resetRecord(); showToast("Transaction saved."); });
el("holding-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("holdings", map.holding(payload("holding"))); el("holding-form").reset(); el("holding-id").value = ""; showToast("Holding saved."); });
el("company-profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = map.profile(payload("profile"));
  if (!validateDuns(p.duns)) {
    showToast("Invalid DUNS format. Use 12-345-6789 or 123456789.");
    return;
  }
  const existing = state.profiles.find((x) => x.company === p.company);
  if (existing && !el("profile-id").value) p.id = existing.id;
  upsert("profiles", p);
  el("company-profile-form").reset();
  el("profile-id").value = "";
  showToast("Credit profile saved.");
});
el("tradeline-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("tradelines", map.tradeline(payload("tradeline"))); el("tradeline-form").reset(); el("tradeline-id").value = ""; showToast("Tradeline saved."); });
el("filing-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("filings", map.filing(payload("filing"))); el("filing-form").reset(); el("filing-id").value = ""; showToast("Filing saved."); });
el("funding-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("funding", map.funding(payload("funding"))); el("funding-form").reset(); el("funding-id").value = ""; showToast("Funding program saved."); });
el("auto-loan-form").addEventListener("submit", (e) => { e.preventDefault(); upsert("autoLoans", map.auto(payload("auto"))); el("auto-loan-form").reset(); el("auto-id").value = ""; el("auto-term").value = "60"; el("auto-apr").value = "9.5"; showToast("Auto-loan scenario saved."); });

el("cancel-edit").addEventListener("click", resetRecord);
el("filter-company").addEventListener("change", render);
el("search").addEventListener("input", render);

el("generate-strategy").addEventListener("click", () => {
  const inflow = state.records.filter((r) => ["Income", "Salary Received"].includes(r.entryType)).reduce((s, r) => s + num(r.amount), 0);
  const outflow = state.records.filter((r) => ["Expense", "Salary Paid"].includes(r.entryType)).reduce((s, r) => s + num(r.amount), 0);
  const reserveTarget = Math.max(0, inflow - outflow) * 0.15;
  const uccActive = state.filings.filter((f) => f.type === "UCC1 Statement" && ["Filed", "Active"].includes(f.status)).length;
  const list = [
    `Build internal banking reserve account target: ${currency.format(reserveTarget)} (15% of net cashflow).`,
    `Keep at least 1 active UCC1/collateral package (current active: ${uccActive}) for secured financing leverage.`,
    "Use contract receivables as evidence of recurring revenue for higher-value loan and grant underwriting.",
    "Set internal debt policy: minimum DSCR 1.25 and utilization under 30% before new borrowing."
  ];
  el("strategy-list").innerHTML = list.map((x) => `<li>${x}</li>`).join("");
});

el("generate-qualification").addEventListener("click", () => {
  const messages = [];
  companies.forEach((company) => {
    const profile = state.profiles.find((p) => p.company === company);
    const tl = state.tradelines.filter((t) => t.company === company);
    const avgUtil = tl.length ? tl.reduce((s, t) => s + util(t), 0) / tl.length : 0;
    const score = num(profile?.score);
    const months = parseInt(profile?.months || "0", 10);
    if (!profile?.duns) messages.push(`${company}: add DUNS.`);
    if (tl.length < 3) messages.push(`${company}: add ${3 - tl.length} tradeline(s).`);
    if (avgUtil > 30) messages.push(`${company}: reduce utilization (${pct(avgUtil)}) below 30%.`);
    const matches = state.funding.filter((f) => f.company === company && score >= num(f.minScore) && months >= parseInt(f.minTime || "0", 10));
    if (matches.length) messages.push(`${company}: likely matches ${matches.length} funding program(s).`);
  });
  el("qualification-list").innerHTML = (messages.length ? messages : ["No gaps detected. Keep all profiles current and continue applying."]).map((x) => `<li>${x}</li>`).join("");
});



const downloadTextFile = (filename, content, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const buildLicenseKey = (brand, holder) => {
  const base = `${brand}|${holder || "UNASSIGNED"}|${Date.now()}`;
  const hash = btoa(base).replace(/[^A-Z0-9]/gi, "").slice(0, 20).toUpperCase();
  return `${hash.slice(0, 5)}-${hash.slice(5, 10)}-${hash.slice(10, 15)}-${hash.slice(15, 20)}`;
};
el("generate-auto-loan").addEventListener("click", () => {
  render();
  showToast("Auto-approval check refreshed.");
});



el("generate-license-key").addEventListener("click", () => {
  const brand = el("seller-brand").value.trim();
  const holder = el("license-holder").value.trim();
  if (!brand) {
    showToast("Add your brand name first.");
    return;
  }
  const key = buildLicenseKey(brand, holder);
  el("license-key").value = key;
  showToast("License key generated.");
});

el("copy-sales-script").addEventListener("click", async () => {
  const brand = el("seller-brand").value.trim() || "Your Brand";
  const price = el("seller-price").value.trim() || "Custom";
  const support = el("seller-support").value.trim() || "support@example.com";
  const script = `Thanks for your interest in ${brand}.\n\nThis package includes the full Business Credit, Filing & Funding Command Center app with local-first data storage and backup tooling.\nPrice: $${price} one-time.\nSupport: ${support}.\n\nDelivery includes app files, buyer license certificate, and onboarding instructions.`;
  try {
    await navigator.clipboard.writeText(script);
    showToast("Sales script copied.");
  } catch {
    showToast("Could not copy. Please copy manually.");
  }
});

el("download-seller-pack").addEventListener("click", async () => {
  const brand = el("seller-brand").value.trim();
  const price = el("seller-price").value.trim();
  const support = el("seller-support").value.trim();
  const holder = el("license-holder").value.trim() || "UNASSIGNED BUYER";
  const key = el("license-key").value.trim() || buildLicenseKey(brand || "BRAND", holder);

  if (!brand || !price || !support) {
    showToast("Fill brand, price, and support email first.");
    return;
  }

  const files = ["index.html", "app.js", "styles.css", "README.md"];
  for (const file of files) {
    const resp = await fetch(file);
    const text = await resp.text();
    downloadTextFile(`SELLER_PACK_${file}`, text, file.endsWith('.html') ? 'text/html' : 'text/plain');
  }

  const license = `SOFTWARE LICENSE CERTIFICATE\n\nBrand: ${brand}\nLicense Holder: ${holder}\nLicense Key: ${key}\nPrice Paid: $${price}\nSupport: ${support}\nIssued At: ${new Date().toISOString()}\n\nTerms: Buyer may use one copy for internal business operations. Redistribution/resale by buyer is prohibited without written permission from ${brand}.`;
  const onboarding = `BUYER ONBOARDING\n\n1) Place index.html, app.js, styles.css in one folder.\n2) Run: python3 -m http.server 8000\n3) Open: http://localhost:8000\n4) Use Export/Import JSON for backups.\n\nSupport: ${support}`;
  downloadTextFile("SELLER_PACK_LICENSE.txt", license);
  downloadTextFile("SELLER_PACK_ONBOARDING.txt", onboarding);
  downloadTextFile("SELLER_PACK_PRICE_QUOTE.txt", `Brand: ${brand}\nPrice: $${price}\nSupport: ${support}\nGenerated: ${new Date().toISOString()}`);
  el("license-key").value = key;
  showToast("Seller pack downloaded.");
});
el("export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "command-center-launch-ready-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
});

el("download-template").addEventListener("click", () => {
  const template = { exportedAt: new Date().toISOString(), records: [], holdings: [], profiles: [], tradelines: [], funding: [], filings: [], autoLoans: [], meta: { updatedAt: null } };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "command-center-template.json";
  a.click();
  URL.revokeObjectURL(url);
});

el("import-json-btn").addEventListener("click", () => el("import-json-file").click());
el("import-json-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    ["records", "holdings", "profiles", "tradelines", "funding", "filings", "autoLoans"].forEach((k) => {
      if (Array.isArray(parsed[k])) state[k] = parsed[k];
    });
    save();
    render();
    showToast("Import completed.");
  } catch {
    showToast("Import failed: invalid JSON.");
  } finally {
    event.target.value = "";
  }
});

el("clear-all").addEventListener("click", () => {
  if (!confirm("This will remove all stored data. Continue?")) return;
  state = { records: [], holdings: [], profiles: [], tradelines: [], funding: [], filings: [], autoLoans: [], meta: { updatedAt: null } };
  save();
  resetRecord();
  render();
  showToast("All data cleared.");
});

resetRecord();
render();
