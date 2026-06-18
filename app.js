const STORAGE_KEY = "sticker-data";

let stickers = [];
let searchText = "";
let filterMode = "all";
let activeIndex = null;

// SAMPLE DATA
const sampleData = [
  { Code:"USA10", Name:"Weston McKennie", Organization:"USA", Have:true, DuplicatesQty:1 },
  { Code:"USA16", Name:"Christian Pulisic", Organization:"USA", Have:false, DuplicatesQty:0 },
  { Code:"BRA14", Name:"Vinicius Junior", Organization:"Brazil", Have:true, DuplicatesQty:0 },
  { Code:"BRA19", Name:"Raphinha", Organization:"Brazil", Have:false, DuplicatesQty:0 },
  { Code:"ARG17", Name:"Lionel Messi", Organization:"Argentina", Have:true, DuplicatesQty:2 }
];

// INIT
document.addEventListener("DOMContentLoaded", () => {
  restore();

  // Load sample
  document.getElementById("loadSampleBtn").onclick = () => {
    stickers = JSON.parse(JSON.stringify(sampleData));
    save();
    render();
  };

  // Search
  document.getElementById("searchInput").oninput = (e) => {
    searchText = e.target.value.toLowerCase();
    render();
  };

  // ✅ Find Player button FIX
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

// FILTER
function setFilter(mode) {
  filterMode = mode;
  render();
}

// MAIN RENDER
function render() {
  renderProgress();

  const container = document.getElementById("allList");

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
    const percent = total ? Math.round(collected / total * 100) : 0;

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

// CARD
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
      <div style="color:#666;">${s.Code}</div>
    </div>
  `;
}

// MODAL
function openModal(i) {
  activeIndex = i;
  const s = stickers[i];

  document.getElementById("modalName").innerText = s.Name;
  document.getElementById("modalCode").innerText = s.Code;
  document.getElementById("modalOrg").innerText = s.Organization;
  document.getElementById("modalDupes").innerText = s.DuplicatesQty;

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

function closeModal(e) {
  if (e && e.target.id !== "modal") return;
  document.getElementById("modal").classList.remove("active");
}

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
  const percent = total ? Math.round(collected / total * 100) : 0;
  const remaining = total - collected;

  document.getElementById("progressText").innerText =
    `${collected}/${total} collected (${percent}%) • ${remaining} left`;

  const bar = document.getElementById("progressBar");
  bar.style.width = percent + "%";
  bar.style.background = getProgressColor(percent);
}

// COLOR LOGIC (RESTORED)
function getProgressColor(percent) {
  if (percent >= 100) return "#16a34a"; // green
  if (percent >= 75) return "#2563eb";  // blue
  if (percent >= 50) return "#f59e0b";  // amber
  return "#ef4444";                     // red
}

// STORAGE
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) stickers = JSON.parse(raw);
}
