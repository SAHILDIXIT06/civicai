const API_BASE_URL = "http://localhost:4000";

const tableBody = document.querySelector('[data-role="rows"]');
const messageEl = document.querySelector('[data-role="message"]');
const refreshBtn = document.querySelector('[data-role="refresh"]');
const lastRefreshEl = document.querySelector('[data-role="last-refresh"]');

const summaryEls = {
  total: document.querySelector('[data-summary="total"]'),
  submitted: document.querySelector('[data-summary="Submitted"]'),
  "in-progress": document.querySelector('[data-summary="In Progress"]'),
  resolved: document.querySelector('[data-summary="Resolved"]')
};

const setMessage = (text, tone = "info") => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
};

const formatLocation = (location) => {
  if (!location) return "—";
  const { latitude, longitude, accuracy } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "—";
  }
  const base = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
  if (Number.isFinite(accuracy)) {
    return `${base} (±${Math.round(accuracy)} m)`;
  }
  return base;
};

const statusClass = (status = "") => {
  const slug = status.trim().toLowerCase().replace(/\s+/g, "-");
  if (slug === "submitted" || slug === "in-progress" || slug === "resolved") {
    return `status-${slug}`;
  }
  return "status-unknown";
};

const buildRow = (complaint) => {
  const row = document.createElement("tr");

  const addCell = (content, className) => {
    const cell = document.createElement("td");
    if (className) {
      cell.classList.add(className);
    }
    if (content instanceof Node) {
      cell.appendChild(content);
    } else {
      cell.textContent = content ?? "—";
    }
    row.appendChild(cell);
  };

  addCell(complaint.id ?? "—");
  addCell(formatDate(complaint.createdAt));
  addCell(complaint.category ?? "—");

  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge ${statusClass(complaint.status)}`;
  statusBadge.textContent = complaint.status ?? "Unknown";
  addCell(statusBadge);

  // 🔥 NEW: Add complainer details
  const complainerInfo = complaint.userPhone 
    ? `${complaint.userPhone}${complaint.userName ? `\n${complaint.userName}` : ''}`
    : "—";
  addCell(complainerInfo, "complainer-info");

  addCell(formatLocation(complaint.location), "location");
  addCell(complaint.description ?? "—", "description");

  if (complaint.image?.url) {
    const link = document.createElement("a");
    link.href = `${API_BASE_URL}${complaint.image.url}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = complaint.image.originalName ?? "View";
    addCell(link);
  } else {
    addCell("—");
  }

  return row;
};

const updateSummary = (complaints) => {
  const counts = complaints.reduce(
    (acc, complaint) => {
      acc.total += 1;
      const status = (complaint.status || "").toLowerCase();
      if (status === "submitted") acc.submitted += 1;
      if (status === "in progress" || status === "in-progress") acc["in-progress"] += 1;
      if (status === "resolved") acc.resolved += 1;
      return acc;
    },
    { total: 0, submitted: 0, "in-progress": 0, resolved: 0 }
  );

  Object.entries(counts).forEach(([key, value]) => {
    const el = summaryEls[key];
    if (el) {
      el.textContent = value.toString();
    }
  });
};

const renderComplaints = (complaints) => {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (complaints.length === 0) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No complaints found.";
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return;
  }

  complaints.forEach((complaint) => {
    tableBody.appendChild(buildRow(complaint));
  });
};

const loadComplaints = async () => {
  setMessage("Loading complaints…", "info");
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/complaints`);
    if (!response.ok) {
      throw new Error("Unable to load complaints.");
    }

    const payload = await response.json();
    const complaints = Array.isArray(payload.complaints) ? payload.complaints : [];

    updateSummary(complaints);
    renderComplaints(complaints);

    const countText = complaints.length === 1 ? "1 complaint" : `${complaints.length} complaints`;
    setMessage(`Loaded ${countText}.`, complaints.length ? "success" : "info");

    if (lastRefreshEl) {
      lastRefreshEl.textContent = new Date().toLocaleTimeString();
    }
  } catch (error) {
    console.error(error);
    setMessage(error.message ?? "Unexpected error while loading complaints.", "error");
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
};

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadComplaints();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadComplaints();
});
