const storageKey = "businessRecordsHub.v1";

const form = document.getElementById("record-form");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit");
const list = document.getElementById("records-list");
const template = document.getElementById("record-template");
const filterCompany = document.getElementById("filter-company");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-json");

const fields = {
  id: document.getElementById("record-id"),
  company: document.getElementById("company"),
  recordType: document.getElementById("record-type"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  amount: document.getElementById("amount"),
  contact: document.getElementById("contact"),
  status: document.getElementById("status"),
  notes: document.getElementById("notes")
};

const loadRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
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
  formTitle.textContent = "Add Record";
  cancelEditBtn.hidden = true;
};

const filteredRecords = () => {
  const company = filterCompany.value;
  const term = searchInput.value.trim().toLowerCase();

  return records
    .filter((record) => company === "all" || record.company === company)
    .filter((record) => {
      if (!term) {
        return true;
      }
      return [record.title, record.recordType, record.notes, record.contact]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const render = () => {
  list.innerHTML = "";
  const visible = filteredRecords();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No records found. Add one using the form.";
    list.append(empty);
    return;
  }

  visible.forEach((record) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.querySelector(".record-title").textContent = record.title;
    node.querySelector(".record-company").textContent = record.company;
    node.querySelector(
      ".record-meta"
    ).textContent = `${record.recordType} • ${record.date}${record.amount ? ` • $${Number(record.amount).toFixed(2)}` : ""}${record.contact ? ` • ${record.contact}` : ""}`;
    node.querySelector(".record-notes").textContent = record.notes || "No notes";
    node.querySelector(".record-status").textContent = record.status;

    node.querySelector(".edit-btn").addEventListener("click", () => {
      fields.id.value = record.id;
      fields.company.value = record.company;
      fields.recordType.value = record.recordType;
      fields.title.value = record.title;
      fields.date.value = record.date;
      fields.amount.value = record.amount || "";
      fields.contact.value = record.contact || "";
      fields.status.value = record.status;
      fields.notes.value = record.notes || "";
      formTitle.textContent = "Edit Record";
      cancelEditBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    node.querySelector(".delete-btn").addEventListener("click", () => {
      records = records.filter((x) => x.id !== record.id);
      saveRecords();
      render();
    });

    list.append(node);
  });
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    id: fields.id.value || crypto.randomUUID(),
    company: fields.company.value,
    recordType: fields.recordType.value.trim(),
    title: fields.title.value.trim(),
    date: fields.date.value,
    amount: fields.amount.value,
    contact: fields.contact.value.trim(),
    status: fields.status.value,
    notes: fields.notes.value.trim()
  };

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
  a.download = "business-records.json";
  a.click();
  URL.revokeObjectURL(url);
});

render();
