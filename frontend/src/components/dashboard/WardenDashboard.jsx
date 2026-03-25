import { useState, useEffect } from "react";

function formatRoomTypeLabel(v) {
  if (v === "single") return "Single";
  if (v === "double") return "Double";
  return v ? String(v) : "—";
}

function formatAcLabel(v) {
  if (v === "ac") return "AC";
  if (v === "non-ac") return "Non-AC";
  return v ? String(v) : "—";
}

/** Blocks #, @, and other special symbols in search; keeps letters, digits, spaces, . - _ ' */
function sanitizeDashboardSearchInput(value) {
  const s = String(value ?? "");
  try {
    return s.replace(/[^\p{L}\p{N}\s.\-'_]/gu, "");
  } catch {
    return s.replace(/[^a-zA-Z0-9\s.\-'_]/g, "");
  }
}

import { apiFetch } from "../../shared/api/client";

const stats = [
  { label: "Total Students", value: 248, sub: "+4 this week", icon: "🎓", grad: "135deg, #60a5fa, #818cf8", glow: "rgba(99,102,241,0.45)", accent: "#818cf8" },
  { label: "Rooms Occupied", value: "112", sub: "of 120 rooms", icon: "🏠", grad: "135deg, #34d399, #06b6d4", glow: "rgba(16,185,129,0.45)", accent: "#34d399" },
  { label: "Complaints", value: 7, sub: "2 urgent", icon: "⚡", grad: "135deg, #fbbf24, #f87171", glow: "rgba(251,191,36,0.45)", accent: "#fbbf24" },
  { label: "Leave Requests", value: 14, sub: "5 pending review", icon: "📋", grad: "135deg, #c084fc, #f472b6", glow: "rgba(192,132,252,0.45)", accent: "#c084fc" },
];

const complaints = [
  { id: "C-041", student: "Rahul Mehta", room: "A-204", issue: "Water leakage", priority: "High", status: "Open", av: "RM", avc: "60a5fa,818cf8" },
  { id: "C-040", student: "Priya Sharma", room: "B-112", issue: "AC not working", priority: "Medium", status: "In Progress", av: "PS", avc: "f472b6,ec4899" },
  { id: "C-039", student: "Aman Singh", room: "C-308", issue: "Wi-Fi issue", priority: "Low", status: "Resolved", av: "AS", avc: "34d399,06b6d4" },
  { id: "C-038", student: "Sneha Patel", room: "A-101", issue: "Broken cupboard", priority: "Low", status: "Open", av: "SP", avc: "fbbf24,f97316" },
  { id: "C-037", student: "Vikram Nair", room: "D-205", issue: "No hot water", priority: "High", status: "In Progress", av: "VN", avc: "c084fc,8b5cf6" },
];

const leaves = [
  { name: "Aditya Kumar", room: "B-201", from: "Mar 24", to: "Mar 27", reason: "Family function", status: "Pending", av: "AK", avc: "60a5fa,818cf8" },
  { name: "Meera Joshi", room: "C-115", from: "Mar 25", to: "Mar 26", reason: "Medical appt", status: "Pending", av: "MJ", avc: "f472b6,ec4899" },
  { name: "Rohit Das", room: "A-310", from: "Mar 23", to: "Mar 30", reason: "Home visit", status: "Approved", av: "RD", avc: "34d399,06b6d4" },
  { name: "Ananya Roy", room: "D-102", from: "Mar 28", to: "Mar 29", reason: "College event", status: "Rejected", av: "AR", avc: "c084fc,8b5cf6" },
];

const activity = [
  { icon: "🔑", text: "Room B-308 checked in", sub: "Nikhil Verma", time: "10m", dot: "#60a5fa" },
  { icon: "✅", text: "Leave approved", sub: "Rohit Das", time: "45m", dot: "#34d399" },
  { icon: "🛠️", text: "Complaint C-039 resolved", sub: "Maintenance team", time: "1h", dot: "#fbbf24" },
  { icon: "📢", text: "Notice posted", sub: "Maintenance Mar 26", time: "3h", dot: "#c084fc" },
  { icon: "🚪", text: "Room A-205 vacated", sub: "Suresh Pillai", time: "5h", dot: "#f472b6" },
];

const blocks = [
  { name: "A", occupied: 28, total: 30, grad: "90deg, #60a5fa, #818cf8", glow: "rgba(96,165,250,0.6)" },
  { name: "B", occupied: 29, total: 30, grad: "90deg, #c084fc, #8b5cf6", glow: "rgba(192,132,252,0.6)" },
  { name: "C", occupied: 27, total: 30, grad: "90deg, #34d399, #06b6d4", glow: "rgba(52,211,153,0.6)" },
  { name: "D", occupied: 28, total: 30, grad: "90deg, #fbbf24, #f97316", glow: "rgba(251,191,36,0.6)" },
];

const nav = [
  { label: "Dashboard", icon: "⊞" },
  { label: "Inventory", icon: "▦" },
  { label: "Students", icon: "◉" },
  { label: "Rooms", icon: "⬡" },
  { label: "Complaints", icon: "◎" },
  { label: "Leave", icon: "◫" },
  { label: "Notices", icon: "◳" },
  { label: "Reports", icon: "◰" },
  { label: "Settings", icon: "◍" },
];

function Counter({ n }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const target = parseInt(n) || 0;
    if (!target) return;
    let cur = 0;
    const inc = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setV(cur);
      if (cur >= target) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [n]);
  return <>{isNaN(parseInt(n)) ? n : v}</>;
}

const pillBaseStatic = {
  fontSize: "14px",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: "99px",
  display: "inline-block",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

function bedPillStyle(status) {
  if (status === "Occupied") return { bg: "rgba(248,113,113,0.15)", color: "#f87171", border: "rgba(248,113,113,0.3)" };
  return { bg: "rgba(52,211,153,0.15)", color: "#34d399", border: "rgba(52,211,153,0.3)" };
}

function RoomsPanel({
  T,
  s,
  roomsManageLoading,
  roomsManageError,
  filteredRoomsManage,
  roomsManageSearch,
  setRoomsManageSearch,
  roomsHostelId,
  roomsActionLoading,
  setRoomsActionLoading,
  roomsEditId,
  setRoomsEditId,
  roomsEditRoomNumber,
  setRoomsEditRoomNumber,
  setRoomsManageRefreshKey,
}) {
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState("double");
  const [newRoomAc, setNewRoomAc] = useState("non-ac");
  const [newRoomDetails, setNewRoomDetails] = useState("");
  /** Once true for a field, show live validation for that field. */
  const [addRoomDirty, setAddRoomDirty] = useState({ roomNumber: false, roomType: false, ac: false, details: false });

  const resetAddRoomForm = () => {
    setNewRoomNumber("");
    setNewRoomType("double");
    setNewRoomAc("non-ac");
    setNewRoomDetails("");
    setAddRoomDirty({ roomNumber: false, roomType: false, ac: false, details: false });
  };

  const roomNoDigits = newRoomNumber.replace(/\D/g, "");
  const addRoomErrors = (() => {
    const err = {};
    if (!roomNoDigits) err.roomNumber = "Room number is required (digits only).";
    if (!newRoomType) err.roomType = "Select single or double.";
    if (!newRoomAc) err.ac = "Select AC or Non-AC.";
    if (!String(newRoomDetails).trim()) err.details = "Other details are required.";
    return err;
  })();
  const addRoomFormValid = Object.keys(addRoomErrors).length === 0;

  const errText = { fontSize: "12px", color: "#f87171", marginTop: "4px", fontWeight: 600 };
  const inputErr = (hasErr) => (hasErr ? { ...s.input, borderColor: "rgba(248,113,113,0.55)", boxShadow: "0 0 0 1px rgba(248,113,113,0.2)" } : s.input);

  const handleAddRoom = async () => {
    if (!roomsHostelId) return;
    if (!addRoomFormValid) {
      setAddRoomDirty({ roomNumber: true, roomType: true, ac: true, details: true });
      return;
    }
    const rn = roomNoDigits;
    setRoomsActionLoading(true);
    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          hostel: roomsHostelId,
          roomNumber: rn,
          roomType: newRoomType,
          acType: newRoomAc,
          details: String(newRoomDetails).trim(),
        }),
      });
      resetAddRoomForm();
      setShowAddRoomForm(false);
      setRoomsEditId("");
      setRoomsEditRoomNumber("");
      setRoomsManageRefreshKey((x) => x + 1);
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to add room");
    } finally {
      setRoomsActionLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!roomId) return;
    const ok = window.confirm("Delete this room? This will cancel related bookings.");
    if (!ok) return;
    setRoomsActionLoading(true);
    try {
      await apiFetch(`/rooms/${roomId}`, { method: "DELETE" });
      setRoomsEditId("");
      setRoomsEditRoomNumber("");
      setRoomsManageRefreshKey((x) => x + 1);
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to delete room");
    } finally {
      setRoomsActionLoading(false);
    }
  };

  const handleStartEdit = (room) => {
    setRoomsEditId(room?._id || "");
    setRoomsEditRoomNumber(String(room?.roomNumber || ""));
  };
  const handleCancelEdit = () => {
    setRoomsEditId("");
    setRoomsEditRoomNumber("");
  };
  const handleSaveEdit = async (roomId) => {
    const rn = roomsEditRoomNumber.trim();
    if (!roomId || !rn) return;
    setRoomsActionLoading(true);
    try {
      await apiFetch(`/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ roomNumber: rn }) });
      setRoomsEditId("");
      setRoomsEditRoomNumber("");
      setRoomsManageRefreshKey((x) => x + 1);
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to update room");
    } finally {
      setRoomsActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", height: "100%" }}>
      <div style={{ ...s.card, padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "17px", color: T.textPrimary }}>All Rooms</div>
            <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "2px" }}>{roomsManageLoading ? "Loading…" : `${filteredRoomsManage.length} rooms`}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              name="warden-rooms-filter"
              autoComplete="off"
              value={roomsManageSearch}
              onChange={(e) => setRoomsManageSearch(sanitizeDashboardSearchInput(e.target.value))}
              placeholder="Search rooms…"
              style={{ ...s.input, width: "200px", minWidth: "140px" }}
            />
            <button
              type="button"
              disabled={!roomsHostelId}
              onClick={() => {
                setShowAddRoomForm((v) => {
                  if (v) resetAddRoomForm();
                  return !v;
                });
              }}
              style={{
                whiteSpace: "nowrap",
                background: showAddRoomForm ? T.inputBg : "linear-gradient(135deg, #818cf8, #c084fc)",
                borderRadius: "10px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: 800,
                cursor: !roomsHostelId ? "not-allowed" : "pointer",
                boxShadow: showAddRoomForm ? "none" : "0 4px 14px rgba(129,140,248,0.3)",
                border: showAddRoomForm ? `1px solid ${T.inputBorder}` : "none",
                color: showAddRoomForm ? T.textSecondary : "#fff",
                fontFamily: "inherit",
                opacity: !roomsHostelId ? 0.6 : 1,
              }}
            >
              {showAddRoomForm ? "Close form" : "+ Add Room"}
            </button>
          </div>
        </div>

        {showAddRoomForm && (
          <div style={{ marginBottom: "16px", padding: "16px", background: "rgba(129,140,248,0.06)", border: `1px solid ${T.accentBorder}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: T.textPrimary }}>Add new room</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>All fields are required. Room number accepts digits only (0–9).</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>ROOM NUMBER (DIGITS ONLY)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={newRoomNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setNewRoomNumber(digits);
                    setAddRoomDirty((d) => ({ ...d, roomNumber: true }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allow = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
                    if (allow.includes(e.key)) return;
                    if (/^\d$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
                    setNewRoomNumber(t);
                    setAddRoomDirty((d) => ({ ...d, roomNumber: true }));
                  }}
                  onBlur={() => setAddRoomDirty((d) => ({ ...d, roomNumber: true }))}
                  placeholder="e.g. 105"
                  aria-invalid={addRoomDirty.roomNumber && Boolean(addRoomErrors.roomNumber)}
                  style={{ ...inputErr(addRoomDirty.roomNumber && addRoomErrors.roomNumber) }}
                />
                {addRoomDirty.roomNumber && addRoomErrors.roomNumber ? <div style={errText}>{addRoomErrors.roomNumber}</div> : null}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>ROOM TYPE</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { v: "single", label: "Single" },
                    { v: "double", label: "Double" },
                  ].map(({ v, label }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: T.textSecondary, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="warden-new-room-type"
                        checked={newRoomType === v}
                        onChange={() => {
                          setNewRoomType(v);
                          setAddRoomDirty((d) => ({ ...d, roomType: true }));
                        }}
                        style={{ accentColor: "#818cf8" }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {addRoomDirty.roomType && addRoomErrors.roomType ? <div style={errText}>{addRoomErrors.roomType}</div> : null}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>COOLING</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { v: "ac", label: "AC" },
                    { v: "non-ac", label: "Non-AC" },
                  ].map(({ v, label }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: T.textSecondary, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="warden-new-room-ac"
                        checked={newRoomAc === v}
                        onChange={() => {
                          setNewRoomAc(v);
                          setAddRoomDirty((d) => ({ ...d, ac: true }));
                        }}
                        style={{ accentColor: "#818cf8" }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {addRoomDirty.ac && addRoomErrors.ac ? <div style={errText}>{addRoomErrors.ac}</div> : null}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: T.textMuted, marginBottom: "4px", letterSpacing: "0.06em" }}>OTHER DETAILS</label>
              <textarea
                value={newRoomDetails}
                onChange={(e) => {
                  setNewRoomDetails(e.target.value);
                  setAddRoomDirty((d) => ({ ...d, details: true }));
                }}
                onBlur={() => setAddRoomDirty((d) => ({ ...d, details: true }))}
                placeholder="Notes, attached bath, window facing, etc."
                rows={3}
                aria-invalid={addRoomDirty.details && Boolean(addRoomErrors.details)}
                style={{ ...inputErr(addRoomDirty.details && addRoomErrors.details), width: "100%", minHeight: "72px", resize: "vertical" }}
              />
              {addRoomDirty.details && addRoomErrors.details ? <div style={errText}>{addRoomErrors.details}</div> : null}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={roomsActionLoading || !roomsHostelId}
                onClick={handleAddRoom}
                style={{
                  background: "linear-gradient(135deg, #818cf8, #c084fc)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 18px",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#fff",
                  cursor: roomsActionLoading || !roomsHostelId ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: roomsActionLoading || !roomsHostelId ? 0.55 : 1,
                }}
              >
                Save room
              </button>
              <button
                type="button"
                disabled={roomsActionLoading}
                onClick={() => { resetAddRoomForm(); setShowAddRoomForm(false); }}
                style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "10px", padding: "8px 16px", fontSize: "14px", fontWeight: 700, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={s.trBorder}>{["Room", "Type", "AC", "Details", "Bed 1", "Bed 2", "Student", "Actions"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {roomsManageLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`rm-skel-${idx}`} style={s.trBorder}>
                    {[72, 56, 48, 100, 90, 90, 120, 140].map((w, ci) => (
                      <td key={ci} style={{ padding: "11px 0" }}>
                        <div style={{ height: 9, width: w, background: T.skelBg, borderRadius: 8 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : roomsManageError ? (
                <tr>
                  <td colSpan={8} style={{ padding: "14px 0", color: "#f87171", fontSize: "14px" }}>{roomsManageError}</td>
                </tr>
              ) : !filteredRoomsManage.length ? (
                <tr>
                  <td colSpan={8} style={{ padding: "14px 0", color: T.textMuted, fontSize: "14px" }}>No rooms found.</td>
                </tr>
              ) : (
                filteredRoomsManage.map((r) => {
                  const bed1 = (r?.beds || []).find((b) => String(b?.bedNumber) === "1");
                  const bed2 = (r?.beds || []).find((b) => String(b?.bedNumber) === "2");
                  const isEditing = roomsEditId && String(roomsEditId) === String(r?._id);
                  const p1 = bedPillStyle(bed1?.status);
                  const p2 = bedPillStyle(bed2?.status);
                  const det = r?.details ? String(r.details) : "";
                  const detShort = det.length > 48 ? `${det.slice(0, 48)}…` : det;
                  return (
                    <tr key={r?._id || r?.roomNumber} style={s.trBorder}>
                      <td style={{ padding: "11px 0 11px 0", fontSize: "14px", fontWeight: 800, color: T.textPrimary }}>{r.roomNumber}</td>
                      <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{formatRoomTypeLabel(r?.roomType)}</td>
                      <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{formatAcLabel(r?.acType)}</td>
                      <td style={{ padding: "11px 0", fontSize: "12px", color: T.textMuted, maxWidth: "140px" }} title={det || undefined}>{detShort || "—"}</td>
                      <td style={{ padding: "11px 0" }}>
                        <span style={{ ...pillBaseStatic, background: p1.bg, color: p1.color, border: `1px solid ${p1.border}` }}>{bed1?.status || "Available"}</span>
                        {bed1?.studentName ? <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "3px" }}>{bed1.studentName}</div> : null}
                      </td>
                      <td style={{ padding: "11px 0" }}>
                        {bed2 ? (
                          <>
                            <span style={{ ...pillBaseStatic, background: p2.bg, color: p2.color, border: `1px solid ${p2.border}` }}>{bed2?.status}</span>
                            {bed2?.studentName ? <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "3px" }}>{bed2.studentName}</div> : null}
                          </>
                        ) : (
                          <span
                            style={{
                              ...pillBaseStatic,
                              background: "rgba(148,163,184,0.15)",
                              color: "#94a3b8",
                              border: "1px solid rgba(148,163,184,0.35)",
                            }}
                          >
                            N/A
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{r.studentName || "—"}</td>
                      <td style={{ padding: "11px 0" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input type="text" value={roomsEditRoomNumber} onChange={(e) => setRoomsEditRoomNumber(e.target.value)} style={{ ...s.input, width: 120 }} />
                            <button type="button" disabled={roomsActionLoading} onClick={() => handleSaveEdit(r._id)} style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, cursor: roomsActionLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>Save</button>
                            <button type="button" disabled={roomsActionLoading} onClick={handleCancelEdit} style={{ background: T.inputBg, color: T.textSecondary, border: `1px solid ${T.inputBorder}`, borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, cursor: roomsActionLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button type="button" disabled={roomsActionLoading} onClick={() => handleStartEdit(r)} style={{ fontSize: "13px", color: "#60a5fa", fontWeight: 700, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", padding: "5px 10px", borderRadius: "8px", cursor: roomsActionLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>Update</button>
                            <button type="button" disabled={roomsActionLoading} onClick={() => handleDeleteRoom(r._id)} style={{ fontSize: "13px", color: "#f87171", fontWeight: 700, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", padding: "5px 10px", borderRadius: "8px", cursor: roomsActionLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ComplaintsPanel({ T, s, complaintsLoading, complaintsError, filteredComplaints, complaintsSearch, setComplaintsSearch }) {
  const statusLabel = (status) => {
    if (status === "open") return "Open";
    if (status === "in_progress") return "In Progress";
    if (status === "resolved") return "Resolved";
    return String(status || "");
  };
  const statusPill = (status) => {
    if (status === "resolved") return { bg: "rgba(52,211,153,0.15)", color: "#34d399", border: "rgba(52,211,153,0.3)" };
    if (status === "in_progress") return { bg: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "rgba(96,165,250,0.3)" };
    return { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" };
  };
  return (
    <div style={{ ...s.card, padding: "20px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "17px", color: T.textPrimary }}>All Complaints</div>
          <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "2px" }}>{complaintsLoading ? "Loading…" : `${filteredComplaints.length} complaints`}</div>
        </div>
        <input
          type="search"
          name="warden-complaints-filter"
          autoComplete="off"
          value={complaintsSearch}
          onChange={(e) => setComplaintsSearch(sanitizeDashboardSearchInput(e.target.value))}
          placeholder="Search complaints…"
          style={{ ...s.input, width: "280px", minWidth: "180px" }}
        />
      </div>
      <div style={{ overflowY: "auto", maxHeight: "calc(100% - 60px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={s.trBorder}>{["Student", "Subject", "Description", "Status", "Created"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {complaintsLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`cp-${idx}`} style={s.trBorder}>
                  {[160, 200, 260, 120, 120].map((w, ci) => (
                    <td key={ci} style={{ padding: "11px 0" }}>
                      <div style={{ height: 9, width: w, background: T.skelBg, borderRadius: 8 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : complaintsError ? (
              <tr>
                <td colSpan={5} style={{ padding: "14px 0", color: "#f87171", fontSize: "14px" }}>{complaintsError}</td>
              </tr>
            ) : !filteredComplaints.length ? (
              <tr>
                <td colSpan={5} style={{ padding: "14px 0", color: T.textMuted, fontSize: "14px" }}>No complaints found.</td>
              </tr>
            ) : (
              filteredComplaints.map((c) => {
                const pill = statusPill(c?.status);
                return (
                  <tr key={c?._id || `${c?.student?._id || ""}-${c?.createdAt || ""}`} style={s.trBorder}>
                    <td style={{ padding: "11px 0", fontSize: "14px", fontWeight: 700, color: T.textPrimary }}>{c?.student?.name || "—"}</td>
                    <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{c?.subject || "—"}</td>
                    <td style={{ padding: "11px 0", fontSize: "13px", color: T.textMuted }}>{c?.description ? String(c.description).slice(0, 70) + (String(c.description).length > 70 ? "…" : "") : "—"}</td>
                    <td style={{ padding: "11px 0" }}>
                      <span style={{ ...pillBaseStatic, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>{statusLabel(c?.status)}</span>
                    </td>
                    <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{c?.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function inventoryCategoryTaken(category, list) {
  const c = String(category ?? "").trim().toLowerCase();
  if (!c) return false;
  return (Array.isArray(list) ? list : []).some((it) => String(it?.category ?? "").trim().toLowerCase() === c);
}

function InventoryPanel({
  T,
  s,
  inventoryLoading,
  inventoryError,
  filteredInventory,
  inventoryList,
  inventorySearch,
  setInventorySearch,
  setInventoryRefreshKey,
}) {
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invLocation, setInvLocation] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invDirty, setInvDirty] = useState({ name: false, qty: false, location: false, category: false });
  const [invSaving, setInvSaving] = useState(false);

  const resetInvForm = () => {
    setInvName("");
    setInvQty("");
    setInvLocation("");
    setInvCategory("");
    setInvDirty({ name: false, qty: false, location: false, category: false });
  };

  const qtyParsed = invQty === "" ? NaN : Number.parseInt(invQty, 10);
  const invErrors = (() => {
    const err = {};
    if (!String(invName).trim()) err.name = "Item name is required.";
    if (invQty === "" || !Number.isFinite(qtyParsed) || !Number.isInteger(qtyParsed) || qtyParsed < 0) {
      err.qty = "Enter a whole number (0 or greater).";
    }
    if (!String(invLocation).trim()) err.location = "Location is required.";
    const catTrim = String(invCategory).trim();
    if (!catTrim) err.category = "Category is required.";
    else if (inventoryCategoryTaken(catTrim, inventoryList)) err.category = "This category already exists. Each item uses a unique category.";
    return err;
  })();
  const invFormValid = Object.keys(invErrors).length === 0;

  const invErrStyle = { fontSize: "12px", color: "#f87171", marginTop: "4px", fontWeight: 600 };
  const invInputErr = (hasErr) => (hasErr ? { ...s.input, borderColor: "rgba(248,113,113,0.55)", boxShadow: "0 0 0 1px rgba(248,113,113,0.2)" } : s.input);

  const handleAddInventory = async () => {
    if (!invFormValid) {
      setInvDirty({ name: true, qty: true, location: true, category: true });
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
        }),
      });
      resetInvForm();
      setShowAddInventory(false);
      setInventoryRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err?.message ? String(err.message) : "Failed to add inventory item");
    } finally {
      setInvSaving(false);
    }
  };

  return (
    <div style={{ ...s.card, padding: "20px", height: "100%" }}>
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

      {showAddInventory && (
        <div style={{ marginBottom: "16px", padding: "16px", background: "rgba(129,140,248,0.06)", border: `1px solid ${T.accentBorder}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: T.textPrimary }}>Add inventory item</div>
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>All fields are required. Category must be unique. Quantity: digits only (0+).</div>
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
                onBlur={() => setInvDirty((d) => ({ ...d, qty: true }))}
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

      <div style={{ overflowY: "auto", maxHeight: "calc(100% - 60px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={s.trBorder}>{["Name", "Quantity", "Location", "Category", "Updated"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {inventoryLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`inv-${idx}`} style={s.trBorder}>
                  {[160, 80, 140, 120, 130].map((w, ci) => (
                    <td key={ci} style={{ padding: "11px 0" }}>
                      <div style={{ height: 9, width: w, background: T.skelBg, borderRadius: 8 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : inventoryError ? (
              <tr>
                <td colSpan={5} style={{ padding: "14px 0", color: "#f87171", fontSize: "14px" }}>{inventoryError}</td>
              </tr>
            ) : !filteredInventory.length ? (
              <tr>
                <td colSpan={5} style={{ padding: "14px 0", color: T.textMuted, fontSize: "14px" }}>No inventory items found.</td>
              </tr>
            ) : (
              filteredInventory.map((it) => (
                <tr key={it?._id || it?.id || it?.name} style={s.trBorder}>
                  <td style={{ padding: "11px 0", fontSize: "14px", fontWeight: 700, color: T.textPrimary }}>{it?.name || "—"}</td>
                  <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{typeof it?.quantity === "number" ? it.quantity : it?.quantity ?? "—"}</td>
                  <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{it?.location || "—"}</td>
                  <td style={{ padding: "11px 0" }}>
                    <span style={{ ...pillBaseStatic, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#818cf8" }}>{it?.category || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{it?.updatedAt ? new Date(it.updatedAt).toLocaleDateString() : it?.createdAt ? new Date(it.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("Dashboard");
  const [now, setNow] = useState(new Date());
  const [warden, setWarden] = useState(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [roomsOverview, setRoomsOverview] = useState({
    occupiedRooms: 0,
    totalRooms: 0,
    blockCounts: {
      A: { occupied: 0, total: 0 },
      B: { occupied: 0, total: 0 },
      C: { occupied: 0, total: 0 },
      D: { occupied: 0, total: 0 },
    },
  });
  const [roomDetails, setRoomDetails] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [roomsManageLoading, setRoomsManageLoading] = useState(false);
  const [roomsManageError, setRoomsManageError] = useState("");
  const [roomsManageList, setRoomsManageList] = useState([]);
  const [roomsManageSearch, setRoomsManageSearch] = useState("");
  const [roomsHostelId, setRoomsHostelId] = useState("");
  const [roomsEditId, setRoomsEditId] = useState("");
  const [roomsEditRoomNumber, setRoomsEditRoomNumber] = useState("");
  const [roomsActionLoading, setRoomsActionLoading] = useState(false);
  const [roomsManageRefreshKey, setRoomsManageRefreshKey] = useState(0);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [complaintsList, setComplaintsList] = useState([]);
  const [complaintsSearch, setComplaintsSearch] = useState("");
  const [complaintsRefreshKey, setComplaintsRefreshKey] = useState(0);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryList, setInventoryList] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wardenUser");
      const parsed = raw ? JSON.parse(raw) : null;
      setWarden(parsed);
    } catch { setWarden(null); }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      try {
        setStudentsLoading(true); setStudentsError("");
        const users = await apiFetch("/users");
        const list = Array.isArray(users) ? users.filter((u) => u?.role === "student") : [];
        if (!cancelled) setStudents(list);
      } catch (err) {
        if (!cancelled) { setStudentsError(err?.message ? String(err.message) : "Unable to load students"); setStudents([]); }
      } finally { if (!cancelled) setStudentsLoading(false); }
    }
    if (active !== "Students") return;
    loadStudents();
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoomsManage() {
      try {
        setRoomsManageLoading(true); setRoomsManageError("");
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = wardenUser?.assignedHostel;
        if (!assignedHostelName) throw new Error("Assigned hostel not found for this warden.");
        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels) ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === String(assignedHostelName).trim().toLowerCase()) : null;
        if (!hostel) throw new Error("Hostel not found.");
        setRoomsHostelId(String(hostel._id));
        const [roomDocs, details] = await Promise.all([apiFetch(`/rooms?hostelId=${hostel._id}`), apiFetch(`/rooms/details?hostelId=${hostel._id}`)]);
        const detailsByRoomNumber = new Map((Array.isArray(details) ? details : []).map((d) => [String(d?.roomNumber || ""), d]));
        const merged = (Array.isArray(roomDocs) ? roomDocs : []).map((rd) => {
          const roomNumber = String(rd?.roomNumber || "");
          const d = detailsByRoomNumber.get(roomNumber);
          const roomType = String(rd?.roomType || "double").toLowerCase();
          const bedCount = roomType === "single" ? 1 : 2;
          const fallbackBeds = bedCount === 1
            ? [{ bedNumber: "1", status: "Available", studentName: null }]
            : [{ bedNumber: "1", status: "Available", studentName: null }, { bedNumber: "2", status: "Available", studentName: null }];

          const beds =
            Array.isArray(d?.beds) && d.beds.length
              ? d.beds
              : Array.isArray(rd?.beds) && rd.beds.length
                ? rd.beds
                : fallbackBeds;

          return { ...rd, roomNumber, studentName: d?.studentName ?? null, beds };
        });
        merged.sort((a, b) => {
          const ak = String(a?.roomNumber || "").match(/(\d+)/)?.[1] ? Number(String(a.roomNumber).match(/(\d+)/)[1]) : a.roomNumber;
          const bk = String(b?.roomNumber || "").match(/(\d+)/)?.[1] ? Number(String(b.roomNumber).match(/(\d+)/)[1]) : b.roomNumber;
          if (typeof ak === "number" && typeof bk === "number") return ak - bk;
          return String(a.roomNumber).localeCompare(String(b.roomNumber));
        });
        if (!cancelled) setRoomsManageList(merged);
      } catch (err) {
        if (!cancelled) { setRoomsManageError(err?.message ? String(err.message) : "Unable to load rooms."); setRoomsManageList([]); }
      } finally { if (!cancelled) setRoomsManageLoading(false); }
    }
    if (active !== "Rooms") return;
    loadRoomsManage();
    return () => { cancelled = true; };
  }, [active, roomsManageRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadComplaints() {
      try {
        setComplaintsLoading(true); setComplaintsError("");
        const list = await apiFetch("/complains");
        if (!cancelled) setComplaintsList(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) { setComplaintsError(err?.message ? String(err.message) : "Unable to load complaints."); setComplaintsList([]); }
      } finally { if (!cancelled) setComplaintsLoading(false); }
    }
    if (active !== "Complaints") return;
    loadComplaints();
    return () => { cancelled = true; };
  }, [active, complaintsRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        setRoomsLoading(true); setRoomsError("");
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = wardenUser?.assignedHostel;
        if (!assignedHostelName) { if (!cancelled) { setRoomsOverview((prev) => ({ ...prev })); setRoomDetails([]); } return; }
        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels) ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === String(assignedHostelName).trim().toLowerCase()) : null;
        if (!hostel) { if (!cancelled) { setRoomDetails([]); setRoomsOverview((prev) => ({ ...prev })); } return; }
        const details = await apiFetch(`/rooms/details?hostelId=${hostel._id}`);
        const rooms = Array.isArray(details) ? details : [];
        const totalRooms = rooms.length;
        const isRoomOccupied = (room) => (room?.beds || []).some((b) => b?.status === "Occupied");
        const occupiedRooms = rooms.filter((r) => isRoomOccupied(r)).length;
        const blockCounts = { A: { occupied: 0, total: 0 }, B: { occupied: 0, total: 0 }, C: { occupied: 0, total: 0 }, D: { occupied: 0, total: 0 } };
        for (const r of rooms) {
          const rn = String(r?.roomNumber || "").trim();
          const letter = rn ? rn[0].toUpperCase() : "";
          if (!["A", "B", "C", "D"].includes(letter)) continue;
          blockCounts[letter].total += 1;
          if (isRoomOccupied(r)) blockCounts[letter].occupied += 1;
        }
        if (!cancelled) { setRoomDetails(rooms); setRoomsOverview({ occupiedRooms, totalRooms, blockCounts }); }
      } catch (err) {
        if (!cancelled) {
          setRoomDetails([]); setRoomsError(err?.message ? String(err.message) : "Unable to load rooms");
          setRoomsOverview({ occupiedRooms: 0, totalRooms: 0, blockCounts: { A: { occupied: 0, total: 0 }, B: { occupied: 0, total: 0 }, C: { occupied: 0, total: 0 }, D: { occupied: 0, total: 0 } } });
        }
      } finally { if (!cancelled) setRoomsLoading(false); }
    }
    loadRooms();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        setInventoryLoading(true); setInventoryError("");
        const items = await apiFetch("/inventory");
        if (!cancelled) setInventoryList(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) { setInventoryError(err?.message ? String(err.message) : "Unable to load inventory"); setInventoryList([]); }
      } finally { if (!cancelled) setInventoryLoading(false); }
    }
    if (active !== "Inventory") return;
    loadInventory();
    return () => { cancelled = true; };
  }, [active, inventoryRefreshKey]);

  const statsFinal = roomsOverview?.totalRooms !== undefined
    ? stats.map((st) => st.label === "Rooms Occupied" ? { ...st, value: roomsOverview.occupiedRooms, sub: `of ${roomsOverview.totalRooms} rooms` } : st)
    : stats;

  const blocksFinal = blocks.map((b) => {
    const counts = roomsOverview?.blockCounts?.[b.name];
    if (!counts) return b;
    return { ...b, occupied: counts.occupied, total: counts.total };
  });

  const activeBlockCount = ["A", "B", "C", "D"].filter((k) => (roomsOverview?.blockCounts?.[k]?.total || 0) > 0).length || 0;

  function roomRowsToShow() {
    const max = 10;
    if (!roomDetails || roomDetails.length <= max) return { rows: roomDetails || [], more: 0 };
    return { rows: roomDetails.slice(0, max), more: roomDetails.length - max };
  }

  const { rows: roomRows, more: roomRowsMore } = roomRowsToShow();

  const filteredStudents = studentSearch.trim()
    ? students.filter((u) => {
        const q = studentSearch.trim().toLowerCase();
        const fields = [u?.name, u?.email, u?.phoneNumber, u?.assignedHostel, u?.gender, u?.nic, u?.universityId, u?.address];
        return fields.filter(Boolean).map((x) => String(x).toLowerCase()).some((v) => v.includes(q));
      })
    : students;

  const filteredRoomsManage = roomsManageSearch.trim()
    ? roomsManageList.filter((r) => {
        const q = roomsManageSearch.trim().toLowerCase();
        const bed1 = (r?.beds || []).find((b) => String(b?.bedNumber) === "1");
        const bed2 = (r?.beds || []).find((b) => String(b?.bedNumber) === "2");
        const roomStr = String(r?.roomNumber ?? "").toLowerCase();
        const haystack = [roomStr, r?.studentName, bed1?.studentName, bed2?.studentName, bed1?.status, bed2?.status, r?.roomType, r?.acType, r?.details].filter(Boolean).map((x) => String(x).toLowerCase());
        return haystack.some((v) => v.includes(q));
      })
    : roomsManageList;

  const filteredComplaints = complaintsSearch.trim()
    ? complaintsList.filter((c) => {
        const q = complaintsSearch.trim().toLowerCase();
        const idStr = c?._id != null ? String(c._id).toLowerCase() : "";
        const statusHuman = String(c?.status || "").replace(/_/g, " ").toLowerCase();
        const fields = [c?.subject, c?.description, c?.student?.name, c?.student?.email, c?.status, idStr, statusHuman];
        return fields.filter(Boolean).map((x) => String(x).toLowerCase()).some((v) => v.includes(q));
      })
    : complaintsList;

  const filteredInventory = inventorySearch.trim()
    ? inventoryList.filter((it) => {
        const q = inventorySearch.trim().toLowerCase();
        const qty = it?.quantity != null ? String(it.quantity) : "";
        return [it?.name, it?.location, it?.category, qty].filter(Boolean).map((x) => String(x).toLowerCase()).some((v) => v.includes(q));
      })
    : inventoryList;

  function getInitials(name) {
    if (!name) return "W";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "W";
    return ((parts[0]?.[0] || "W") + (parts[1]?.[0] || (parts[0]?.[1] ? parts[0][1] : ""))).toUpperCase();
  }

  const wardenName = warden?.name || "Warden";
  const assignedHostelName = warden?.assignedHostel || "";

  // ─── DESIGN TOKENS ───────────────────────────────────────────────
  const T = {
    pageBg: "#0c0f1a",
    sidebarBg: "#0f1220",
    sidebarBorder: "rgba(255,255,255,0.06)",
    cardBg: "rgba(255,255,255,0.04)",
    cardBgHover: "rgba(255,255,255,0.07)",
    cardBorder: "rgba(255,255,255,0.08)",
    cardRadius: "16px",
    cardShadow: "0 4px 24px rgba(0,0,0,0.3)",
    textPrimary: "#f0f4ff",
    textSecondary: "#94a3b8",
    textMuted: "#475569",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.1)",
    divider: "rgba(255,255,255,0.06)",
    skelBg: "rgba(255,255,255,0.08)",
    accent: "#818cf8",
    accentLight: "rgba(129,140,248,0.12)",
    accentBorder: "rgba(129,140,248,0.25)",
  };

  const s = {
    page: {
      height: "100dvh",
      width: "100vw",
      display: "flex",
      background: T.pageBg,
      fontFamily: "'DM Sans', 'Manrope', 'Segoe UI', sans-serif",
      color: T.textPrimary,
      overflow: "hidden",
      position: "fixed",
      top: 0, left: 0,
    },
    aside: {
      width: "220px",
      flexShrink: 0,
      background: T.sidebarBg,
      borderRight: `1px solid ${T.sidebarBorder}`,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      zIndex: 10,
      overflow: "hidden",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
      zIndex: 10,
      minWidth: 0,
    },
    card: {
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: T.cardRadius,
      boxShadow: T.cardShadow,
      backdropFilter: "blur(12px)",
    },
    input: {
      width: "100%",
      background: T.inputBg,
      border: `1px solid ${T.inputBorder}`,
      borderRadius: "10px",
      padding: "8px 12px",
      color: T.textPrimary,
      outline: "none",
      fontSize: "16px",
      fontFamily: "inherit",
      transition: "border-color 0.15s",
      boxSizing: "border-box",
    },
    thStyle: {
      textAlign: "left",
      paddingBottom: "10px",
      fontSize: "14px",
      fontWeight: 700,
      color: T.textMuted,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    trBorder: { borderBottom: `1px solid ${T.divider}` },
  };

  return (
    <div style={s.page}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-160px", left: "-80px", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-120px", right: "-80px", width: "520px", height: "520px", background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Sidebar ─────────────────────────────── */}
      <aside style={s.aside}>
        {/* Brand */}
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "linear-gradient(135deg, #818cf8, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "19px", color: "#fff", boxShadow: "0 4px 16px rgba(129,140,248,0.4)", flexShrink: 0 }}>H</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em", color: T.textPrimary }}>HostelOS</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "1px" }}>Warden Command Center</div>
            </div>
          </div>
        </div>

        {/* Clock */}
        <div style={{ padding: "10px 12px" }}>
          <div style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.15)", borderRadius: "12px", padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "0.05em", color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "3px" }}>
              {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 8px", display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
          {nav.map((item) => {
            const isActive = active === item.label;
            const badge = item.label === "Complaints" ? 7 : item.label === "Leave" ? 5 : null;
            return (
              <button key={item.label} onClick={() => setActive(item.label)} style={{
                display: "flex", alignItems: "center", gap: "9px", padding: "9px 11px", borderRadius: "10px",
                fontSize: "14px", fontWeight: isActive ? 700 : 500, width: "100%", textAlign: "left", cursor: "pointer",
                transition: "all 0.15s",
                background: isActive ? T.accentLight : "transparent",
                border: isActive ? `1px solid ${T.accentBorder}` : "1px solid transparent",
                color: isActive ? T.accent : T.textSecondary,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: "15px", opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge && (
                  <span style={{ background: isActive ? "linear-gradient(135deg,#818cf8,#c084fc)" : "rgba(255,255,255,0.07)", fontSize: "11px", padding: "2px 6px", borderRadius: "99px", color: isActive ? "#fff" : T.textMuted, fontWeight: 700 }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile */}
        <div style={{ padding: "10px 10px 12px", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.sidebarBorder}`, borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(135deg, #818cf8, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {getInitials(wardenName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wardenName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 4px rgba(52,211,153,0.8)" }} />
                <span style={{ fontSize: "12px", color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {assignedHostelName ? `${assignedHostelName}` : "Online"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div style={s.main}>
        {/* Header */}
        <header style={{
          padding: "12px 24px", background: "rgba(12,15,26,0.92)", borderBottom: `1px solid ${T.sidebarBorder}`,
          backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
              Good morning, {wardenName} 👋
            </div>
            <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "1px" }}>
              Hostel overview {assignedHostelName ? `· ${assignedHostelName}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: "10px", padding: "8px 12px", color: T.textSecondary, cursor: "pointer", position: "relative", fontSize: "16px" }}>
              🔔
              <span style={{ position: "absolute", top: "-3px", right: "-3px", width: "15px", height: "15px", borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ef4444)", fontSize: "10px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>9</span>
            </button>
            <button style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", borderRadius: "10px", padding: "8px 18px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(129,140,248,0.35)", color: "#fff", border: "none", fontFamily: "inherit" }}>
              + Post Notice
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px", background: T.pageBg }}>

          {active === "Inventory" ? (
            <InventoryPanel T={T} s={s} inventoryLoading={inventoryLoading} inventoryError={inventoryError} filteredInventory={filteredInventory} inventoryList={inventoryList} inventorySearch={inventorySearch} setInventorySearch={setInventorySearch} setInventoryRefreshKey={setInventoryRefreshKey} />
          ) : active === "Rooms" ? (
            <RoomsPanel
              T={T}
              s={s}
              roomsManageLoading={roomsManageLoading}
              roomsManageError={roomsManageError}
              filteredRoomsManage={filteredRoomsManage}
              roomsManageSearch={roomsManageSearch}
              setRoomsManageSearch={setRoomsManageSearch}
              roomsHostelId={roomsHostelId}
              roomsActionLoading={roomsActionLoading}
              setRoomsActionLoading={setRoomsActionLoading}
              roomsEditId={roomsEditId}
              setRoomsEditId={setRoomsEditId}
              roomsEditRoomNumber={roomsEditRoomNumber}
              setRoomsEditRoomNumber={setRoomsEditRoomNumber}
              setRoomsManageRefreshKey={setRoomsManageRefreshKey}
            />
          ) : active === "Complaints" ? (
            <ComplaintsPanel T={T} s={s} complaintsLoading={complaintsLoading} complaintsError={complaintsError} filteredComplaints={filteredComplaints} complaintsSearch={complaintsSearch} setComplaintsSearch={setComplaintsSearch} />
          ) : active === "Students" ? (
            <div style={{ ...s.card, padding: "20px", display: "flex", flexDirection: "column", gap: "0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "17px", color: T.textPrimary }}>Students</div>
                  <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "2px" }}>{studentsLoading ? "Loading…" : `${filteredStudents.length} students`}</div>
                </div>
                <input type="search" name="warden-students-filter" autoComplete="off" value={studentSearch} onChange={(e) => setStudentSearch(sanitizeDashboardSearchInput(e.target.value))} placeholder="Search students…" style={{ ...s.input, width: "260px", minWidth: "160px" }} />
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={s.trBorder}>{["Name", "Email", "Phone", "Hostel", "Gender"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {studentsLoading ? Array.from({ length: 6 }).map((_, idx) => <tr key={`st-${idx}`} style={s.trBorder}>{[160, 210, 120, 170, 90].map((w, ci) => <td key={ci} style={{ padding: "11px 0" }}><div style={{ height: 9, width: w, background: T.skelBg, borderRadius: 8 }} /></td>)}</tr>)
                    : studentsError ? <tr><td colSpan={5} style={{ padding: "14px 0", color: "#f87171", fontSize: "14px" }}>{studentsError}</td></tr>
                    : !filteredStudents.length ? <tr><td colSpan={5} style={{ padding: "14px 0", color: T.textMuted, fontSize: "14px" }}>No students found</td></tr>
                    : filteredStudents.map((u) => (
                      <tr key={u._id || u.id} style={s.trBorder}>
                        <td style={{ padding: "11px 0", fontSize: "14px", fontWeight: 700, color: T.textPrimary }}>{u.name || "—"}</td>
                        <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{u.email || "—"}</td>
                        <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{u.phoneNumber || "—"}</td>
                        <td style={{ padding: "11px 0" }}><span style={{ ...pillBaseStatic, background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent }}>{u.assignedHostel || "—"}</span></td>
                        <td style={{ padding: "11px 0", fontSize: "13px", color: T.textSecondary }}>{u.gender || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {/* ── Stats Row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {statsFinal.map((st, i) => (
                  <div key={i} style={{ ...s.card, padding: "18px 20px", position: "relative", overflow: "hidden", cursor: "default" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(${st.grad})`, opacity: 0.9 }} />
                    <div style={{ position: "absolute", bottom: "-30px", right: "-20px", width: "100px", height: "100px", background: `radial-gradient(circle, ${st.glow.replace("0.45", "0.1")} 0%, transparent 70%)`, pointerEvents: "none" }} />
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: `linear-gradient(${st.grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "12px", boxShadow: `0 4px 14px ${st.glow.replace("0.45","0.3")}` }}>
                      {st.icon}
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: T.textPrimary }}>
                      <Counter n={st.value} />
                    </div>
                    <div style={{ fontSize: "14px", color: T.textSecondary, marginTop: "4px", fontWeight: 500 }}>{st.label}</div>
                    <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "3px" }}>{st.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── Mid row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 280px", gap: "12px" }}>

                {/* Block Occupancy */}
                <div style={{ ...s.card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Block Occupancy</div>
                      <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>{activeBlockCount || 4} blocks · {roomsOverview.totalRooms} rooms</div>
                    </div>
                    <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", borderRadius: "8px", padding: "4px 10px", fontSize: "13px", fontWeight: 700, color: "#34d399" }}>
                      {roomsOverview.occupiedRooms} / {roomsOverview.totalRooms}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {blocksFinal.map((b) => {
                      const pct = b.total ? Math.round((b.occupied / b.total) * 100) : 0;
                      const free = b.total - b.occupied;
                      return (
                        <div key={b.name} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.cardBorder}`, borderRadius: "12px", padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                              <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: `linear-gradient(${b.grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", color: "#fff" }}>{b.name}</div>
                              <span style={{ fontWeight: 700, fontSize: "14px", color: T.textPrimary }}>Block {b.name}</span>
                            </div>
                            <span style={{ fontSize: "12px", fontWeight: 700, background: free <= 1 ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)", color: free <= 1 ? "#f87171" : "#34d399", padding: "2px 6px", borderRadius: "6px" }}>{free} free</span>
                          </div>
                          <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: "99px", background: `linear-gradient(${pct > 96 ? "90deg, #f87171, #f97316" : b.grad})`, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                            <span style={{ fontSize: "12px", color: T.textMuted }}>{b.occupied}/{b.total}</span>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: T.textPrimary }}>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rooms mini-table */}
                <div style={{ ...s.card, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Bed Occupancy</div>
                    <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>
                      {roomsLoading ? "Loading…" : `${roomRows.length} of ${roomsOverview.totalRooms} rooms`}{roomRowsMore ? ` · +${roomRowsMore} more` : ""}
                    </div>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={s.trBorder}>{["Room", "Bed 1", "Bed 2", "Student"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr></thead>
                      <tbody>
                        {roomsLoading ? Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={`s-${idx}`} style={s.trBorder}>
                            {[60, 76, 76, 90].map((w, ci) => <td key={ci} style={{ padding: "9px 0" }}><div style={{ height: 8, width: w, background: T.skelBg, borderRadius: 6 }} /></td>)}
                          </tr>
                        )) : roomsError ? <tr><td colSpan={4} style={{ padding: "12px 0", color: "#f87171", fontSize: "13px" }}>{roomsError}</td></tr>
                        : (<>
                          {roomRows.map((r, idx) => {
                            const bed1 = (r?.beds || []).find((b) => String(b?.bedNumber) === "1") || r?.beds?.[0];
                            const bed2 = (r?.beds || []).find((b) => String(b?.bedNumber) === "2") || r?.beds?.[1];
                            const pb1 = bedPillStyle(bed1?.status);
                            const pb2 = bedPillStyle(bed2?.status);
                            return (
                              <tr key={`${r.roomNumber}-${idx}`} style={s.trBorder}>
                                <td style={{ padding: "9px 0", fontSize: "13px", fontWeight: 700, color: T.textPrimary }}>{r.roomNumber}</td>
                                <td style={{ padding: "9px 0" }}>
                                  <span style={{ ...pillBaseStatic, background: pb1.bg, color: pb1.color, border: `1px solid ${pb1.border}` }}>{bed1?.status}</span>
                                  {bed1?.studentName ? <div style={{ fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>{bed1.studentName}</div> : null}
                                </td>
                                <td style={{ padding: "9px 0" }}>
                                  {bed2 ? (
                                    <>
                                      <span style={{ ...pillBaseStatic, background: pb2.bg, color: pb2.color, border: `1px solid ${pb2.border}` }}>{bed2?.status}</span>
                                      {bed2?.studentName ? <div style={{ fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>{bed2.studentName}</div> : null}
                                    </>
                                  ) : (
                                    <span
                                      style={{
                                        ...pillBaseStatic,
                                        background: "rgba(148,163,184,0.15)",
                                        color: "#94a3b8",
                                        border: "1px solid rgba(148,163,184,0.35)",
                                      }}
                                    >
                                      N/A
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "9px 0", fontSize: "12px", color: T.textSecondary }}>{r.studentName || "—"}</td>
                              </tr>
                            );
                          })}
                          {!roomRows?.length && <tr><td colSpan={4} style={{ padding: "12px 0", color: T.textMuted, fontSize: "13px" }}>No rooms found.</td></tr>}
                        </>)}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Activity */}
                <div style={{ ...s.card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Live Activity</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 5px rgba(52,211,153,0.8)" }} />
                      <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 600 }}>Live</span>
                    </div>
                  </div>
                  {activity.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: i < activity.length - 1 ? "14px" : 0, position: "relative" }}>
                      {i < activity.length - 1 && <div style={{ position: "absolute", left: "15px", top: "30px", width: "1px", height: "calc(100% + 2px)", background: T.divider }} />}
                      <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{a.icon}</div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.3, color: T.textPrimary }}>{a.text}</div>
                        <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>{a.sub} · {a.time} ago</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Bottom row: Complaints + Leave ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>

                {/* Complaints Tracker */}
                <div style={{ ...s.card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Complaints Tracker</div>
                      <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>7 open · 2 urgent</div>
                    </div>
                    <button style={{ fontSize: "13px", color: T.accent, fontWeight: 700, background: T.accentLight, border: `1px solid ${T.accentBorder}`, padding: "5px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>View all →</button>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={s.trBorder}>{["Student", "Room", "Issue", "Priority", "Status", ""].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {complaints.map((c, i) => {
                        const pri = c.priority === "High" ? { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.25)" } : c.priority === "Medium" ? { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" } : { bg: "rgba(52,211,153,0.12)", color: "#34d399", border: "rgba(52,211,153,0.25)" };
                        const st = c.status === "Resolved" ? { bg: "rgba(52,211,153,0.12)", color: "#34d399" } : c.status === "In Progress" ? { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" } : { bg: "rgba(248,113,113,0.12)", color: "#f87171" };
                        return (
                          <tr key={i} style={s.trBorder}>
                            <td style={{ padding: "10px 0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `linear-gradient(135deg, #${c.avc})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{c.av}</div>
                                <span style={{ fontSize: "14px", fontWeight: 600, color: T.textPrimary }}>{c.student}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 0" }}><span style={{ background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontFamily: "monospace", color: T.textSecondary, border: `1px solid ${T.cardBorder}` }}>{c.room}</span></td>
                            <td style={{ padding: "10px 0", fontSize: "13px", color: T.textMuted }}>{c.issue}</td>
                            <td style={{ padding: "10px 0" }}><span style={{ ...pillBaseStatic, background: pri.bg, color: pri.color, border: `1px solid ${pri.border}` }}>{c.priority}</span></td>
                            <td style={{ padding: "10px 0" }}><span style={{ ...pillBaseStatic, background: st.bg, color: st.color }}>{c.status}</span></td>
                            <td style={{ padding: "10px 0" }}><button style={{ fontSize: "12px", color: T.accent, fontWeight: 700, background: T.accentLight, border: `1px solid ${T.accentBorder}`, padding: "4px 10px", borderRadius: "7px", cursor: "pointer", fontFamily: "inherit" }}>Review</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Leave Requests */}
                <div style={{ ...s.card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Leave Requests</div>
                      <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>5 pending review</div>
                    </div>
                    <button style={{ fontSize: "13px", color: T.accent, fontWeight: 700, background: T.accentLight, border: `1px solid ${T.accentBorder}`, padding: "5px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>View all →</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {leaves.map((l, i) => {
                      const stStyle = l.status === "Approved" ? { bg: "rgba(52,211,153,0.12)", color: "#34d399", border: "rgba(52,211,153,0.25)" } : l.status === "Rejected" ? { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.22)" } : { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.22)" };
                      return (
                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.cardBorder}`, borderRadius: "12px", padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `linear-gradient(135deg, #${l.avc})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{l.av}</div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "14px", color: T.textPrimary }}>{l.name}</div>
                                <div style={{ fontSize: "12px", color: T.textMuted }}>Room {l.room}</div>
                              </div>
                            </div>
                            <span style={{ ...pillBaseStatic, background: stStyle.bg, color: stStyle.color, border: `1px solid ${stStyle.border}` }}>{l.status}</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.cardBorder}`, borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: l.status === "Pending" ? "8px" : "0" }}>
                            <div><div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 700, letterSpacing: "0.07em" }}>FROM</div><div style={{ fontWeight: 700, fontSize: "13px", color: T.textPrimary }}>{l.from}</div></div>
                            <div style={{ color: T.textMuted, fontSize: "16px" }}>→</div>
                            <div><div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 700, letterSpacing: "0.07em" }}>TO</div><div style={{ fontWeight: 700, fontSize: "13px", color: T.textPrimary }}>{l.to}</div></div>
                            <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 700, letterSpacing: "0.07em" }}>REASON</div><div style={{ fontSize: "12px", color: T.textSecondary }}>{l.reason}</div></div>
                          </div>
                          {l.status === "Pending" && (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button style={{ flex: 1, background: "linear-gradient(135deg, #34d399, #06b6d4)", borderRadius: "8px", padding: "7px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", border: "none", fontFamily: "inherit" }}>✓ Approve</button>
                              <button style={{ flex: 1, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "7px", fontSize: "13px", fontWeight: 700, color: "#f87171", cursor: "pointer", fontFamily: "inherit" }}>✕ Reject</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}