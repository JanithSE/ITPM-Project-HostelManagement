import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../shared/api/client";
import {
  getWardenTheme,
  MiniBarChart,
  MiniPieChart,
  pillBaseStatic,
  sanitizeDashboardSearchInput,
  WARDEN_INVENTORY_CHANGED,
} from "../dashboard/wardenDashboardPrimitives";

function inventoryCategoryTaken(category, list) {
  const c = String(category ?? "").trim().toLowerCase();
  if (!c) return false;
  return (Array.isArray(list) ? list : []).some((it) => String(it?.category ?? "").trim().toLowerCase() === c);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Self-contained HTML document for inventory report (download or print).
 */
function buildInventoryReportHtml({ rows, wardenName, hostelName, scopeDescription, generatedAt }) {
  const sumTotal = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const sumIssued = rows.reduce((s, r) => s + (Number(r.issued) || 0), 0);
  const sumAvail = rows.reduce((s, r) => s + (Number(r.available) || 0), 0);
  const tableRows =
    rows.length > 0
      ? rows
          .map(
            (r) =>
              `<tr>
  <td>${escapeHtml(r.name)}</td>
  <td>${escapeHtml(r.category)}</td>
  <td>${escapeHtml(r.location)}</td>
  <td>${escapeHtml(r.condition)}</td>
  <td class="num">${r.total}</td>
  <td class="num">${r.issued}</td>
  <td class="num">${r.available}</td>
</tr>`,
          )
          .join("\n")
      : '<tr><td colspan="7" class="empty">No inventory rows in this scope.</td></tr>';
  const hostelBlock = hostelName
    ? `<p><span class="label">Assigned hostel</span> ${escapeHtml(hostelName)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HostelOS — Inventory report</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --thead: #f1f5f9;
      --accent: #4f46e5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 28px 48px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: var(--ink);
      line-height: 1.45;
      background: #fff;
    }
    .doc {
      max-width: 960px;
      margin: 0 auto;
    }
    .brand {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 20px;
      letter-spacing: -0.02em;
    }
    .meta {
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 24px;
      font-size: 13px;
      color: var(--muted);
    }
    .meta p { margin: 0 0 8px; }
    .meta p:last-child { margin-bottom: 0; }
    .meta .label { font-weight: 700; color: var(--ink); margin-right: 8px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      background: var(--thead);
      border: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      color: #334155;
    }
    tbody td {
      border: 1px solid var(--border);
      padding: 9px 12px;
      vertical-align: top;
    }
    tbody tr:nth-child(even) td { background: #fafafa; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr.totals td {
      font-weight: 800;
      background: #eef2ff !important;
      border-top: 2px solid #c7d2fe;
    }
    td.empty { text-align: center; color: var(--muted); padding: 20px; }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: var(--muted);
    }
    @media print {
      body { padding: 12px; }
      .meta { break-inside: avoid; }
      table { break-inside: auto; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="brand">HostelOS</div>
    <h1>Inventory report</h1>
    <div class="meta">
      <p><span class="label">Warden</span> ${escapeHtml(wardenName)}</p>
      ${hostelBlock}
      <p><span class="label">Scope</span> ${escapeHtml(scopeDescription)}</p>
      <p><span class="label">Generated</span> ${escapeHtml(generatedAt)}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Location</th>
          <th>Condition</th>
          <th class="num">Total stock</th>
          <th class="num">Issued</th>
          <th class="num">Available</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="totals">
          <td colspan="4">Totals</td>
          <td class="num">${sumTotal}</td>
          <td class="num">${sumIssued}</td>
          <td class="num">${sumAvail}</td>
        </tr>
      </tbody>
    </table>
    <p class="footer">This report was generated from the warden inventory screen. Open in a browser or print to PDF.</p>
  </div>
</body>
</html>`;
}

export default function WardenInventory() {
  const { T, s } = getWardenTheme();
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryList, setInventoryList] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  const [showAddInventory, setShowAddInventory] = useState(false);
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invLocation, setInvLocation] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invCondition, setInvCondition] = useState("good");
  const [invDirty, setInvDirty] = useState({ name: false, qty: false, location: false, category: false, condition: false });
  const [invSaving, setInvSaving] = useState(false);
  const [invEditId, setInvEditId] = useState("");
  const [invEditName, setInvEditName] = useState("");
  const [invEditQty, setInvEditQty] = useState("");
  const [invEditLocation, setInvEditLocation] = useState("");
  const [invEditCategory, setInvEditCategory] = useState("");
  const [invEditCondition, setInvEditCondition] = useState("good");
  const [invEditDirty, setInvEditDirty] = useState({ name: false, qty: false, location: false, condition: false });
  const [invEditSaving, setInvEditSaving] = useState(false);
  const [invEditQtyTouched, setInvEditQtyTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        setInventoryLoading(true);
        setInventoryError("");
        const items = await apiFetch("/inventory");
        if (!cancelled) setInventoryList(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) {
          setInventoryError(err?.message ? String(err.message) : "Unable to load inventory");
          setInventoryList([]);
        }
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    }
    loadInventory();
    return () => {
      cancelled = true;
    };
  }, [inventoryRefreshKey]);

  const filteredInventory = inventorySearch.trim()
    ? inventoryList.filter((it) => {
        const q = inventorySearch.trim().toLowerCase();
        const qty = it?.quantity != null ? String(it.quantity) : "";
        const issued = it?.issuedTotal != null ? String(it.issuedTotal) : "";
        const total = it?.totalStock != null ? String(it.totalStock) : "";
        return [it?.name, it?.location, it?.category, it?.condition, qty, issued, total]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .some((v) => v.includes(q));
      })
    : inventoryList;

  const itemAvailable = (it) => Number(it?.availableQuantity ?? it?.quantity) || 0;
  const itemIssued = (it) => Number(it?.issuedTotal) || 0;
  const itemTotalStock = (it) => {
    const t = Number(it?.totalStock);
    if (Number.isFinite(t) && t >= 0) return t;
    return itemAvailable(it) + itemIssued(it);
  };

  const resetInvForm = () => {
    setInvName("");
    setInvQty("");
    setInvLocation("");
    setInvCategory("");
    setInvCondition("good");
    setInvDirty({ name: false, qty: false, location: false, category: false, condition: false });
  };

  const qtyParsed = invQty === "" ? NaN : Number.parseInt(invQty, 10);
  const invErrors = (() => {
    const err = {};
    if (!String(invName).trim()) err.name = "Item name is required.";
    if (invQty === "" || !Number.isFinite(qtyParsed) || !Number.isInteger(qtyParsed) || qtyParsed < 10) {
      err.qty = "Enter a whole number (minimum 10).";
    }
    if (!String(invLocation).trim()) err.location = "Location is required.";
    const catTrim = String(invCategory).trim();
    if (!catTrim) err.category = "Category is required.";
    else if (inventoryCategoryTaken(catTrim, inventoryList)) err.category = "This category already exists. Each item uses a unique category.";
    const c = String(invCondition || "").trim().toLowerCase();
    if (!["good", "used", "time_to_reallocate"].includes(c)) err.condition = "Select a valid condition.";
    return err;
  })();
  const invFormValid = Object.keys(invErrors).length === 0;

  const invErrStyle = { fontSize: "12px", color: "#f87171", marginTop: "4px", fontWeight: 600 };
  const invInputErr = (hasErr) => (hasErr ? { ...s.input, borderColor: "rgba(248,113,113,0.55)", boxShadow: "0 0 0 1px rgba(248,113,113,0.2)" } : s.input);
  const invSelectStyle = (hasErr) => ({
    ...invInputErr(hasErr),
    color: T.textPrimary,
    backgroundColor: "#1f2937",
  });
  const invOptionStyle = { color: "#111827", backgroundColor: "#ffffff" };
  /** Hide values &lt; 10 while typing; still show legacy loaded qty &lt; 10 until user changes the field. */
  const inventoryEditQtyDisplay = (raw, touched) => {
    if (raw === "") return "";
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return "";
    if (n >= 10) return String(n);
    if (!touched) return String(n);
    return "";
  };
  const editQtyParsed = invEditQty === "" ? NaN : Number.parseInt(invEditQty, 10);
  const invEditErrors = (() => {
    if (!invEditId) return {};
    const err = {};
    if (!String(invEditName).trim()) err.name = "Item name is required.";
    if (invEditQty === "" || !Number.isFinite(editQtyParsed) || !Number.isInteger(editQtyParsed) || editQtyParsed < 10) err.qty = "Enter a whole number (minimum 10).";
    if (!String(invEditLocation).trim()) err.location = "Location is required.";
    const c = String(invEditCondition || "").trim().toLowerCase();
    if (!["good", "used", "time_to_reallocate"].includes(c)) err.condition = "Select a valid condition.";
    return err;
  })();
  const invEditValid = Object.keys(invEditErrors).length === 0;

  const startEditInventory = (item) => {
    setInvEditId(String(item?._id || item?.id || ""));
    setInvEditName(String(item?.name || ""));
    setInvEditQty(String(item?.quantity ?? ""));
    setInvEditQtyTouched(false);
    setInvEditLocation(String(item?.location || ""));
    setInvEditCategory(String(item?.category || ""));
    setInvEditCondition(String(item?.condition || "good"));
    setInvEditDirty({ name: false, qty: false, location: false, condition: false });
  };

  const stopEditInventory = () => {
    setInvEditId("");
    setInvEditName("");
    setInvEditQty("");
    setInvEditQtyTouched(false);
    setInvEditLocation("");
    setInvEditCategory("");
    setInvEditCondition("good");
    setInvEditDirty({ name: false, qty: false, location: false, condition: false });
  };

  const handleAddInventory = async () => {
    if (!invFormValid) {
      setInvDirty({ name: true, qty: true, location: true, category: true, condition: true });
      return;
    }
    setInvSaving(true);
    try {
      await apiFetch("/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: String(invName).trim(),
          quantity: qtyParsed,
          location: String(invLocation).trim(),
          category: String(invCategory).trim(),
          condition: String(invCondition).trim().toLowerCase(),
        }),
      });
      resetInvForm();
      setShowAddInventory(false);
      setInventoryRefreshKey((k) => k + 1);
      window.dispatchEvent(new CustomEvent(WARDEN_INVENTORY_CHANGED));
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to add inventory item");
    } finally {
      setInvSaving(false);
    }
  };

  const handleUpdateInventory = async () => {
    if (!invEditId) return;
    if (!invEditValid) {
      setInvEditDirty({ name: true, qty: true, location: true, condition: true });
      return;
    }
    setInvEditSaving(true);
    try {
      await apiFetch(`/inventory/${invEditId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(invEditName).trim(),
          quantity: editQtyParsed,
          location: String(invEditLocation).trim(),
          category: String(invEditCategory).trim(),
          condition: String(invEditCondition).trim().toLowerCase(),
        }),
      });
      stopEditInventory();
      setInventoryRefreshKey((k) => k + 1);
      window.dispatchEvent(new CustomEvent(WARDEN_INVENTORY_CHANGED));
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to update inventory item");
    } finally {
      setInvEditSaving(false);
    }
  };

  const categoryTotals = (() => {
    const map = new Map();
    for (const it of Array.isArray(filteredInventory) ? filteredInventory : []) {
      const key = String(it?.category || "Other");
      const qty = itemAvailable(it);
      map.set(key, (map.get(key) || 0) + qty);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((x) => (Number(x.value) || 0) > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  const conditionCounts = (() => {
    const c = { good: 0, used: 0, time_to_reallocate: 0 };
    for (const it of Array.isArray(filteredInventory) ? filteredInventory : []) {
      const k = String(it?.condition || "good").toLowerCase();
      if (k in c) c[k] += 1;
    }
    return [
      { label: "Good", value: c.good },
      { label: "Used", value: c.used },
      { label: "Reallocate", value: c.time_to_reallocate },
    ];
  })();

  const wardenMeta = useMemo(() => {
    try {
      const raw = localStorage.getItem("wardenUser");
      const u = raw ? JSON.parse(raw) : null;
      return {
        name: String(u?.name || "").trim() || "Warden",
        hostel: String(u?.assignedHostel || "").trim() || "",
      };
    } catch {
      return { name: "Warden", hostel: "" };
    }
  }, []);

  const buildReportRows = (list) =>
    (Array.isArray(list) ? list : []).map((it) => ({
      name: it?.name ?? "",
      category: it?.category ?? "",
      location: it?.location ?? "",
      condition: String(it?.condition || "good").replace(/_/g, " "),
      total: itemTotalStock(it),
      issued: itemIssued(it),
      available: itemAvailable(it),
    }));

  const downloadInventoryReport = () => {
    const rows = buildReportRows(filteredInventory);
    const q = inventorySearch.trim();
    const scopeDescription = q
      ? `Filtered by search (“${q}”) — ${rows.length} row(s)`
      : `Full inventory — ${rows.length} row(s)`;
    const generatedAt = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const html = buildInventoryReportHtml({
      rows,
      wardenName: wardenMeta.name,
      hostelName: wardenMeta.hostel,
      scopeDescription,
      generatedAt,
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `inventory-report-${stamp}.html`;
    downloadBlob(filename, new Blob([html], { type: "text/html;charset=utf-8" }));
  };

  return (
    <div style={{ ...s.card, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "17px", color: T.textPrimary }}>Inventory Items</div>
          <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "2px" }}>{inventoryLoading ? "Loading…" : `${filteredInventory.length} items`}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            name="warden-inventory-filter"
            autoComplete="off"
            value={inventorySearch}
            onChange={(e) => setInventorySearch(sanitizeDashboardSearchInput(e.target.value))}
            placeholder="Search inventory…"
            style={{ ...s.input, width: "220px", minWidth: "160px" }}
          />
          <button
            type="button"
            disabled={inventoryLoading}
            onClick={downloadInventoryReport}
            title="Download a standalone HTML report (respects current search filter)"
            style={{
              whiteSpace: "nowrap",
              background: inventoryLoading ? T.inputBg : "linear-gradient(135deg, #34d399, #06b6d4)",
              border: inventoryLoading ? `1px solid ${T.inputBorder}` : "none",
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: inventoryLoading ? "not-allowed" : "pointer",
              color: inventoryLoading ? T.textSecondary : "#fff",
              fontFamily: "inherit",
              boxShadow: inventoryLoading ? "none" : "0 4px 16px rgba(52,211,153,0.35)",
              opacity: inventoryLoading ? 0.55 : 1,
            }}
          >
            Download report
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddInventory((v) => {
                if (v) resetInvForm();
                return !v;
              });
            }}
            style={{
              whiteSpace: "nowrap",
              background: showAddInventory ? T.inputBg : "linear-gradient(135deg, #818cf8, #c084fc)",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: showAddInventory ? "none" : "0 4px 14px rgba(129,140,248,0.3)",
              border: showAddInventory ? `1px solid ${T.inputBorder}` : "none",
              color: showAddInventory ? T.textSecondary : "#fff",
              fontFamily: "inherit",
            }}
          >
            {showAddInventory ? "Close form" : "+ Add inventory item"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <MiniBarChart
          title="Category Quantities"
          data={categoryTotals}
          color="#34d399"
          bg="rgba(52,211,153,0.16)"
        />
        <MiniPieChart
          title="Condition Split"
          data={conditionCounts}
          colors={["#34d399", "#f59e0b", "#f87171"]}
        />
      </div>

      {showAddInventory && (
        <div style={{ marginBottom: "16px", padding: "16px", background: "rgba(129,140,248,0.06)", border: `1px solid ${T.accentBorder}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: T.textPrimary }}>Add inventory item</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>All fields are required. Category must be unique. Quantity: digits only (minimum 10). Condition default: good.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>NAME</label>
              <input
                type="text"
                autoComplete="off"
                value={invName}
                onChange={(e) => {
                  setInvName(sanitizeDashboardSearchInput(e.target.value));
                  setInvDirty((d) => ({ ...d, name: true }));
                }}
                onBlur={() => setInvDirty((d) => ({ ...d, name: true }))}
                placeholder="e.g. Study table"
                style={{ ...invInputErr(invDirty.name && invErrors.name) }}
              />
              {invDirty.name && invErrors.name ? <div style={invErrStyle}>{invErrors.name}</div> : null}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>QUANTITY</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={invQty}
                onChange={(e) => {
                  setInvQty(e.target.value.replace(/\D/g, ""));
                  setInvDirty((d) => ({ ...d, qty: true }));
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey || e.altKey) return;
                  const allow = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
                  if (allow.includes(e.key)) return;
                  if (/^\d$/.test(e.key)) return;
                  e.preventDefault();
                }}
                onBlur={() => {
                  setInvDirty((d) => ({ ...d, qty: true }));
                  const n = Number.parseInt(invQty, 10);
                  if (Number.isFinite(n) && n < 10) setInvQty("10");
                }}
                placeholder="e.g. 24"
                style={{ ...invInputErr(invDirty.qty && invErrors.qty) }}
              />
              {invDirty.qty && invErrors.qty ? <div style={invErrStyle}>{invErrors.qty}</div> : null}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>LOCATION</label>
              <input
                type="text"
                autoComplete="off"
                value={invLocation}
                onChange={(e) => {
                  setInvLocation(sanitizeDashboardSearchInput(e.target.value));
                  setInvDirty((d) => ({ ...d, location: true }));
                }}
                onBlur={() => setInvDirty((d) => ({ ...d, location: true }))}
                placeholder="e.g. Green View Hostel"
                style={{ ...invInputErr(invDirty.location && invErrors.location) }}
              />
              {invDirty.location && invErrors.location ? <div style={invErrStyle}>{invErrors.location}</div> : null}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>CATEGORY (UNIQUE)</label>
              <input
                type="text"
                autoComplete="off"
                value={invCategory}
                onChange={(e) => {
                  setInvCategory(sanitizeDashboardSearchInput(e.target.value));
                  setInvDirty((d) => ({ ...d, category: true }));
                }}
                onBlur={() => setInvDirty((d) => ({ ...d, category: true }))}
                placeholder="e.g. Tables"
                style={{ ...invInputErr(invDirty.category && invErrors.category) }}
              />
              {invDirty.category && invErrors.category ? <div style={invErrStyle}>{invErrors.category}</div> : null}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>CONDITION</label>
              <select
                value={invCondition}
                onChange={(e) => {
                  setInvCondition(String(e.target.value || "good"));
                  setInvDirty((d) => ({ ...d, condition: true }));
                }}
                onBlur={() => setInvDirty((d) => ({ ...d, condition: true }))}
                style={invSelectStyle(invDirty.condition && invErrors.condition)}
              >
                <option style={invOptionStyle} value="good">good</option>
                <option style={invOptionStyle} value="used">used</option>
                <option style={invOptionStyle} value="time_to_reallocate">time to reallocate</option>
              </select>
              {invDirty.condition && invErrors.condition ? <div style={invErrStyle}>{invErrors.condition}</div> : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={invSaving}
              onClick={handleAddInventory}
              style={{
                background: "linear-gradient(135deg, #818cf8, #c084fc)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: 800,
                color: "#fff",
                cursor: invSaving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: invSaving ? 0.6 : 1,
              }}
            >
              {invSaving ? "Saving…" : "Save item"}
            </button>
            <button
              type="button"
              disabled={invSaving}
              onClick={() => {
                resetInvForm();
                setShowAddInventory(false);
              }}
              style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "10px", padding: "8px 16px", fontSize: "14px", fontWeight: 700, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {inventoryLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`sk-${idx}`} style={{ ...s.card, padding: "16px", minHeight: "168px" }}>
              <div style={{ height: 14, width: "70%", background: T.skelBg, borderRadius: 8, marginBottom: "14px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {[1, 2, 3].map((k) => (
                  <div key={k} style={{ height: 64, background: T.skelBg, borderRadius: 12 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : inventoryError ? (
        <div style={{ padding: "14px 0", color: "#f87171", fontSize: "14px" }}>{inventoryError}</div>
      ) : !filteredInventory.length ? (
        <div style={{ padding: "14px 0", color: T.textMuted, fontSize: "14px" }}>No inventory items found.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {filteredInventory.map((it) => {
            const avail = itemAvailable(it);
            const issued = itemIssued(it);
            const total = itemTotalStock(it);
            const low = avail < 15;
            const isEditing = invEditId && invEditId === String(it?._id || it?.id || "");
            const statBox = (label, value, topColor) => (
              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: topColor }} />
                <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: T.textMuted, marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
              </div>
            );
            return (
              <div
                key={it?._id || it?.id || it?.name}
                style={{
                  ...s.card,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  border: low ? "1px solid rgba(248,113,113,0.35)" : s.card.border,
                  boxShadow: low ? "0 8px 28px rgba(248,113,113,0.12), 0 0 0 1px rgba(248,113,113,0.08) inset" : s.card.boxShadow,
                }}
              >
                {isEditing ? (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: T.textMuted, letterSpacing: "0.06em" }}>EDIT ITEM</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>NAME</label>
                        <input type="text" autoComplete="off" value={invEditName} onChange={(e) => { setInvEditName(sanitizeDashboardSearchInput(e.target.value)); setInvEditDirty((d) => ({ ...d, name: true })); }} onBlur={() => setInvEditDirty((d) => ({ ...d, name: true }))} style={{ ...invInputErr(invEditDirty.name && invEditErrors.name) }} />
                        {invEditDirty.name && invEditErrors.name ? <div style={invErrStyle}>{invEditErrors.name}</div> : null}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>QUANTITY (AVAILABLE IN STORE)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={inventoryEditQtyDisplay(invEditQty, invEditQtyTouched)}
                          onChange={(e) => {
                            const inputType = e.nativeEvent?.inputType;
                            if (inputType === "insertFromPaste" || inputType === "deleteByCut") {
                              setInvEditQtyTouched(true);
                              const t = e.target.value.replace(/\D/g, "");
                              setInvEditQty(t);
                              setInvEditDirty((d) => ({ ...d, qty: true }));
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            setInvEditQtyTouched(true);
                            const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                            setInvEditQty(t);
                            setInvEditDirty((d) => ({ ...d, qty: true }));
                          }}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey || e.altKey) return;
                            const nav = ["Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
                            if (nav.includes(e.key)) return;
                            if (e.key === "Backspace" || e.key === "Delete") {
                              e.preventDefault();
                              setInvEditQtyTouched(true);
                              setInvEditQty((p) => p.slice(0, -1));
                              setInvEditDirty((d) => ({ ...d, qty: true }));
                              return;
                            }
                            if (/^\d$/.test(e.key)) {
                              e.preventDefault();
                              setInvEditQtyTouched(true);
                              setInvEditQty((p) => `${p}${e.key}`.replace(/\D/g, ""));
                              setInvEditDirty((d) => ({ ...d, qty: true }));
                            } else {
                              e.preventDefault();
                            }
                          }}
                          onBlur={() => {
                            setInvEditDirty((d) => ({ ...d, qty: true }));
                            const n = Number.parseInt(invEditQty, 10);
                            if (invEditQty !== "" && Number.isFinite(n) && n < 10) setInvEditQty("10");
                          }}
                          style={{ ...invInputErr(invEditDirty.qty && invEditErrors.qty) }}
                        />
                        {invEditDirty.qty && invEditErrors.qty ? <div style={invErrStyle}>{invEditErrors.qty}</div> : null}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>LOCATION</label>
                        <input type="text" autoComplete="off" value={invEditLocation} onChange={(e) => { setInvEditLocation(sanitizeDashboardSearchInput(e.target.value)); setInvEditDirty((d) => ({ ...d, location: true })); }} onBlur={() => setInvEditDirty((d) => ({ ...d, location: true }))} style={{ ...invInputErr(invEditDirty.location && invEditErrors.location) }} />
                        {invEditDirty.location && invEditErrors.location ? <div style={invErrStyle}>{invEditErrors.location}</div> : null}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>CATEGORY</label>
                        <span style={{ ...pillBaseStatic, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#818cf8" }}>{invEditCategory || "—"}</span>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>CONDITION</label>
                        <select
                          value={invEditCondition}
                          onChange={(e) => {
                            setInvEditCondition(String(e.target.value || "good"));
                            setInvEditDirty((d) => ({ ...d, condition: true }));
                          }}
                          onBlur={() => setInvEditDirty((d) => ({ ...d, condition: true }))}
                          style={{ ...invSelectStyle(invEditDirty.condition && invEditErrors.condition), width: "100%" }}
                        >
                          <option style={invOptionStyle} value="good">good</option>
                          <option style={invOptionStyle} value="used">used</option>
                          <option style={invOptionStyle} value="time_to_reallocate">time to reallocate</option>
                        </select>
                        {invEditDirty.condition && invEditErrors.condition ? <div style={invErrStyle}>{invEditErrors.condition}</div> : null}
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: T.textMuted }}>
                      Issued / total shown on the card are derived from bookings; they update after save when you reload.
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button type="button" disabled={invEditSaving} onClick={handleUpdateInventory} style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 800, color: "#fff", cursor: invEditSaving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: invEditSaving ? 0.6 : 1 }}>{invEditSaving ? "Saving…" : "Save"}</button>
                      <button type="button" disabled={invEditSaving} onClick={stopEditInventory} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: low ? "#fda4af" : T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{it?.name || "—"}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                          <span style={{ ...pillBaseStatic, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#818cf8" }}>{it?.category || "—"}</span>
                          <span style={{ ...pillBaseStatic, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399" }}>{String(it?.condition || "good").replace(/_/g, " ")}</span>
                          {low ? (
                            <span style={{ ...pillBaseStatic, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)", color: "#f87171" }}>Low stock</span>
                          ) : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => startEditInventory(it)} style={{ flexShrink: 0, background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}>
                        Update
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {statBox("TOTAL", total, "linear-gradient(90deg, #818cf8, #c084fc)")}
                      {statBox("ISSUED", issued, "linear-gradient(90deg, #fbbf24, #f97316)")}
                      {statBox("AVAILABLE", avail, low ? "linear-gradient(90deg, #f87171, #fb7185)" : "linear-gradient(90deg, #34d399, #06b6d4)")}
                    </div>
                    <div style={{ fontSize: "12px", color: T.textSecondary, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>
                        <span style={{ color: T.textMuted, fontWeight: 600 }}>Location: </span>
                        {it?.location || "—"}
                      </span>
                      <span>
                        <span style={{ color: T.textMuted, fontWeight: 600 }}>Updated: </span>
                        {it?.updatedAt ? new Date(it.updatedAt).toLocaleDateString() : it?.createdAt ? new Date(it.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
