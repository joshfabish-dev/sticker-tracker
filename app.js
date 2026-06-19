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

// ✅ NORMALIZE EXISTING DATA (safe migration)
function normalizeStickerData() {
  let updated = false;

  stickers.forEach(s => {
    if (!s.Variant) {
      s.Variant = "White";
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
    normalizeStickerData();
  }

  // ✅ Hide CSV button if sticker data already exists
  if (stickers.length > 0) {
    const csvBtn = document.getElementById("csvImportLabel");
    if (csvBtn) csvBtn.style.display = "none";
  }

  // ✅ Hide page import ONLY if page data already exists
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
    normalizeStickerData();

    save();
    render();
  };
  reader.readAsText(file);
}

// MAIN CSV PARSE
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);

  return lines.slice(1).map(line => {
    const values = line.split(",");

    return {
      Code: values[0]?.trim(),
      Name: values[1]?.trim(),
      Organization: values[2]?.trim(),
      Have: values[3]?.trim().toLowerCase() === "true",
      DuplicatesQty: parseInt(values[4]) || 0,
      Variant: "White"
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
  const lines = text.trim().split(/\r?\n/);
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

function renderProgressDashboard() {

  const container = document.getElementById("allList");

  const total = stickers.length;
  const collected = stickers.filter(s => s.Have).length;

  const percent = total
    ? Math.round((collected / total) * 100)
    : 0;

  const teams = {};

  stickers.forEach(s => {

    if (!teams[s.Organization]) {
      teams[s.Organization] = {
        total: 0,
        collected: 0
      };
    }

    teams[s.Organization].total++;

    if (s.Have) {
      teams[s.Organization].collected++;
    }

  });

  const sortedTeams = Object.entries(teams)
    .map(([team, stats]) => ({
      team,
      percent: Math.round(
        (stats.collected / stats.total) * 100
      ),
      collected: stats.collected,
      total: stats.total
    }))
    .sort((a, b) => b.percent - a.percent);

  container.innerHTML = `
    <div class="card">

      <h2>🏆 Collection Progress</h2>

      <div style="
        font-size:32px;
        font-weight:700;
        margin-top:12px;
      ">
        ${collected}/${total}
      </div>

      <div style="
        margin-top:4px;
        font-size:18px;
      ">
        ${percent}% Complete
      </div>

      <div class="progress-track" style="margin-top:12px;">
        <div class="progress-fill"
             style="
               width:${percent}%;
               background:${getProgressColor(percent)};
             ">
        </div>
      </div>

    </div>

    ${sortedTeams.map(t => `
      <div class="card">

        <div style="
          display:flex;
          justify-content:space-between;
          margin-bottom:8px;
        ">
          <strong>${t.team}</strong>
          <strong>${t.percent}%</strong>
        </div>

        <div style="margin-bottom:8px;">
          ${t.collected}/${t.total}
        </div>

        <div class="progress-track">
          <div class="progress-fill"
               style="
                 width:${t.percent}%;
                 background:${getProgressColor(t.percent)};
               ">
          </div>
        </div>

      </div>
    `).join("")}
  `;
}

// MAIN RENDER
function render() {
  renderProgress();

  const container = document.getElementById("allList");
  if (!container) return;

  if (filterMode === "progress") {
    renderProgressDashboard();
    return;
  }

  const filtered = stickers
    .map((s, i) => ({ ...s, i }))
    .filter(s => {
      const name = (s.Name || "").toLowerCase();
      const code = (s.Code || "").toLowerCase();

      const searchMatch =
        name.includes(searchText) ||
        code.includes(searchText);

      let filterMatch = true;

      if (filterMode === "needed") {
        filterMatch = !s.Have;
      }

      if (filterMode === "dupes") {
        filterMatch = s.DuplicatesQty > 0;
      }

      if (filterMode === "rare") {
        filterMatch =
          s.Variant &&
          s.Variant !== "White";
      }

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
  const borderWidth = s.Variant === "Black" ? 6 : 4;
  const borderColor = getVariantBorderColor(s.Variant);
  const badge = getVariantBadge(s.Variant);

  return `
    <div onclick="openModal(${s.i})"
      style="
        padding:16px;
        border-radius:12px;
        margin-bottom:10px;
        background:${s.Have ? "#e6f4ea" : "white"};
        border:${borderWidth}px solid ${borderColor};
        cursor:pointer;
      ">
      ${s.Have ? "✅" : "⬜"} <b>${s.Name}</b>

      <div style="color:#666; margin-top:4px;">
        ${s.Code}
        ${s.Page ? ` • Page ${s.Page}` : ""}
      </div>

      ${badge ? `
        <div style="
          margin-top:8px;
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:600;
          background:${badge.bg};
          color:${badge.text};
        ">
          ${badge.label}
        </div>
      ` : ""}
    </div>
  `;
}

// MODAL (detail)
function openModal(i) {
  activeIndex = i;
  const s = stickers[i];

  document.getElementById("modalName").innerText = s.Name || "";
  document.getElementById("modalCode").innerText = s.Code || "";
  document.getElementById("modalOrg").innerText = s.Organization || "";
  document.getElementById("modalDupes").innerText = s.DuplicatesQty ?? 0;

  const variantSelect = document.getElementById("modalVariant");
  if (variantSelect) {
    variantSelect.value = s.Variant || "White";
  }

  // Big bold page number in detail
  const modalPageEl = document.getElementById("modalPage");
  if (modalPageEl) {
    modalPageEl.innerText = s.Page ? `Page ${s.Page}` : "";
  }

  // ✅ Match modal border to variant
  const modalCard = document.querySelector(".modal-card");
  if (modalCard) {
    const borderWidth = s.Variant === "Black" ? "6px" : "4px";
    modalCard.style.border = `${borderWidth} solid ${getVariantBorderColor(s.Variant)}`;
  }

  // ✅ Variant badge in modal
  const badge = document.getElementById("modalVariantBadge");
  if (badge) {
    const badgeData = getVariantBadge(s.Variant);

    if (badgeData) {
      badge.innerText = badgeData.label;
      badge.style.background = badgeData.bg;
      badge.style.color = badgeData.text;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  const status = document.getElementById("modalStatus");
  if (s.Have) {
    status.innerText = "✅ Collected";
    status.style.background = "#e6f4ea";
    status.style.color = "#2e7d32";
    status.style.display = "inline-block";
    status.style.padding = "6px 12px";
    status.style.borderRadius = "999px";
    status.style.fontWeight = "600";
  } else {
    status.innerText = "⬜ Missing";
    status.style.background = "#f3f4f6";
    status.style.color = "#4b5563";
    status.style.display = "inline-block";
    status.style.padding = "6px 12px";
    status.style.borderRadius = "999px";
    status.style.fontWeight = "600";
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

function updateVariant(value) {
  stickers[activeIndex].Variant = value;
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

function getVariantBorderColor(variant) {
  switch (variant) {
    case "Orange":
      return "#f97316";
    case "Blue":
      return "#2563eb";
    case "Red":
      return "#dc2626";
    case "Purple":
      return "#9333ea";
    case "Green":
      return "#16a34a";
    case "Black":
      return "#000000";
    default:
      return "#dddddd"; // White/Base
  }
}

function getVariantBadge(variant) {
  switch (variant) {
    case "Orange":
      return { label: "Orange", bg: "#ffedd5", text: "#c2410c" };
    case "Blue":
      return { label: "Blue", bg: "#dbeafe", text: "#1d4ed8" };
    case "Red":
      return { label: "Red", bg: "#fee2e2", text: "#b91c1c" };
    case "Purple":
      return { label: "Purple", bg: "#f3e8ff", text: "#7e22ce" };
    case "Green":
      return { label: "Green", bg: "#dcfce7", text: "#15803d" };
    case "Black":
      return { label: "Black", bg: "#111827", text: "#ffffff" };
    default:
      return null;
  }
}

// STORAGE
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) stickers = JSON.parse(raw);
}