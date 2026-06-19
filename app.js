const STORAGE_KEY = "sticker-data";

let stickers = [];
let searchText = "";
let filterMode = "all";
let activeIndex = null;

// ✅ DATA FIX (SWI → SUI)
function fixSwissCodes() {
  let updated = false;

  stickers.forEach(s => {
    if (s.Code && s.Code.startsWith("SWI")) {
      s.Code = s.Code.replace("SWI", "SUI");
      updated = true;
    }
  });

  if (updated) {
    save();
  }
}

// ✅ APPLY PAGE NUMBERS (SAFE ENRICHMENT)
function applyPageNumbers(mapping) {
  let updated = false;

  stickers.forEach(s => {
    const page = mapping[s.Code];
    if (page && s.Page !== page) {
      s.Page = page;
      updated = true;
    }
  });

  if (updated) {
    save();
  }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  restore();

  // ✅ SAFELY FIX EXISTING DATA
  if (stickers.length > 0) {
    fixSwissCodes();
  }

  // ✅ Hide import buttons after use
  if (stickers.length > 0) {
    const csvBtn = document.getElementById("csvImportLabel");
    if (csvBtn) csvBtn.style.display = "none";
  }

  // ✅ Hide page import ONLY if page data exists
  const pageBtn = document.getElementById("pageCsvImportLabel");
  if (pageBtn) {
    const hasPages = stickers.some(s => s.Page);
    if (hasPages) {
      pageBtn.style.display = "none";
    }
  }

  // CSV IMPORT (main stickers)
  document.getElementById("csvInput")?.addEventListener("change", handleCSV);

  // PAGE IMPORT (Code → Page)
  document.getElementById("pageCsvInput")?.addEventListener("change", handlePageCSV);

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchText = e.target.value.toLowerCase();
      render();
    };
  }

  // Find Player
  const findBtn = document.getElementById("findPlayerBtn");
  if (findBtn) {
    findBtn.onclick = () => {
      const input = document.getElementById("searchInput");
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
  }

  render();
});

// MAIN CSV IMPORT
function handleCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const text = event.target.result;
    stickers = parseCSV(text);

    // Run Swiss code fix immediately after import
    fixSwissCodes();

    save();
    render();
  };
  reader.readAsText(file);
}

// MAIN CSV PARSE
function parseCSV(text) {
  const lines = text.trim().split("\n");

  return lines.slice(1).map(line => {
    const values = line.split(",");

    return {
      Code: values[0]?.trim(),
      Name: values[1]?.trim(),
      Organization: values[2]?.trim(),
      Have: values[3]?.trim().toLowerCase() === "true",
      DuplicatesQty: parseInt(values[4]) || 0
    };
  });
}

// PAGE CSV IMPORT
function handlePageCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const mapping = parsePageCSV(event.target.result);
    applyPageNumbers(mapping);
    render();
  };
  reader.readAsText(file);
}

// PAGE CSV PARSE (Code,Page)
function parsePageCSV(text) {
  const lines = text.trim().split("\n");
  const map = {};

  lines.slice(1).forEach(line => {
    const values = line.split(",");
    const code = values[0]?.trim();
    const page = values[1]?.trim();

    if (code && page) {
      map[code] = page;
    }
  });

  return map;
}

// FILTER
function setFilter(mode) {
  filterMode = mode;
  render();
}

// MAIN RENDER
function render() {
  renderProgress();

  const container = document.getElementById("allList");
  if (!container) return;

  const filtered = stickers
    .map((s, i) => ({ ...s, i }))
    .filter(s => {
      const searchMatch =
        s.Name.toLowerCase().includes(searchText) ||
        s.Code.toLowerCase().includes(searchText);

      let filterMatch = true;
      if (filterMode === "needed") filterMatch = !s.Have;
      if (filterMode === "dupes") filterMatch = s.DuplicatesQty > 0;

      return searchMatch && filterMatch;
    });

  const groups = {};
  filtered.forEach(s => {
    if (!groups[s.Organization]) groups[s.Organization] = [];
    groups[s.Organization].push(s);
  });

  container.innerHTML = Object.keys(groups).map(org => {
    const total = stickers.filter(s => s.Organization === org).length;
    const collected = stickers.filter(s => s.Organization === org && s.Have).length;
    const percent = total ? Math.round((collected / total) * 100) : 0;

    return `
      <div class="card">
        <b>${org} (${percent}%)</b>
        <div class="progress-track">
          <div class="progress-fill"
               style="width:${percent}%; background:${getProgressColor(percent)};">
          </div>
        </div>
      </div>

      ${groups[org].map(card).join("")}
    `;
  }).join("");
}

// CARD (front)
function card(s) {
  return `
    <div onclick="openModal(${s.i})"
      style="
        padding:16px;
        border-radius:12px;
        margin-bottom:10px;
        background:${s.Have ? "#e6f4ea" : "white"};
        border:1px solid #ddd;
        cursor:pointer;
      ">
      ${s.Have ? "✅" : "⬜"} <b>${s.Name}</b>
      <div style="color:#666;">
        ${s.Code}
        ${s.Page ? ` • Page ${s.Page}` : ""}
      </div>
    </div>
  `;
}

// MODAL (detail)
function openModal(i) {
  activeIndex = i;
  const s = stickers[i];

  document.getElementById("modalName").innerText = s.Name;
  document.getElementById("modalCode").innerText = s.Code;
  document.getElementById("modalOrg").innerText = s.Organization;
  document.getElementById("modalDupes").innerText = s.DuplicatesQty;

  // ✅ Big bold page number in detail
  const modalPageEl = document.getElementById("modalPage");
  if (modalPageEl) {
    modalPageEl.innerText = s.Page ? `Page ${s.Page}` : "";
  }

  const status = document.getElementById("modalStatus");
  if (s.Have) {
    status.innerText = "✅ Collected";
    status.style.background = "#e6f4ea";
    status.style.color = "#2e7d32";
  } else {
    status.innerText = "⬜ Missing";
    status.style.background = "#f3f4f6";
    status.style.color = "#4b5563";
  }

  document.getElementById("modal").classList.add("active");
}

// CLOSE MODAL
function closeModal(e) {
  if (e && e.target.id !== "modal") return;
  document.getElementById("modal").classList.remove("active");
}

// ACTIONS
function toggleModal() {
  stickers[activeIndex].Have = !stickers[activeIndex].Have;
  save();
  render();
  openModal(activeIndex);
}

function changeDupes(delta) {
  stickers[activeIndex].DuplicatesQty += delta;
  if (stickers[activeIndex].DuplicatesQty < 0) {
    stickers[activeIndex].DuplicatesQty = 0;
  }
  save();
  render();
  openModal(activeIndex);
}

function resetDupes() {
  stickers[activeIndex].DuplicatesQty = 0;
  save();
  render();
  openModal(activeIndex);
}

// PROGRESS
function renderProgress() {
  const total = stickers.length;
  const collected = stickers.filter(s => s.Have).length;
  const percent = total ? Math.round((collected / total) * 100) : 0;
  const remaining = total - collected;

  document.getElementById("progressText").innerText =
    `${collected}/${total} collected (${percent}%) • ${remaining} left`;

  const bar = document.getElementById("progressBar");
  bar.style.width = percent + "%";
  bar.style.background = getProgressColor(percent);
}

// COLOR LOGIC
function getProgressColor(percent) {
  if (percent >= 100) return "#16a34a";
  if (percent >= 75) return "#2563eb";
  if (percent >= 50) return "#f59e0b";
  return "#ef4444";
}

// STORAGE
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) stickers = JSON.parse(raw);
}