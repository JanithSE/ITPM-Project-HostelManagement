import { useState, useEffect } from "react";
import { apiFetch } from "../../shared/api/client";
import {
  useWardenTheme,
  MiniBarChart,
  MiniPieChart,
  bedPillStyle,
  pillBaseStatic,
  sanitizeDashboardSearchInput,
} from "../dashboard/wardenDashboardPrimitives";

function formatRoomTypeLabel(v) {
  if (v === "single") return "Single";
  if (v === "sharing" || v === "double") return "Sharing";
  return v ? String(v) : "—";
}

function formatAcLabel(v) {
  if (v === "ac") return "AC";
  if (v === "non-ac") return "Non-AC";
  return v ? String(v) : "—";
}

export default function WardenRooms() {
  const { T, s } = useWardenTheme();
  const [roomsManageLoading, setRoomsManageLoading] = useState(false);
  const [roomsManageError, setRoomsManageError] = useState("");
  const [roomsManageList, setRoomsManageList] = useState([]);
  const [roomsManageSearch, setRoomsManageSearch] = useState("");
  const [roomsHostelId, setRoomsHostelId] = useState("");
  const [roomsEditId, setRoomsEditId] = useState("");
  const [roomsEditRoomNumber, setRoomsEditRoomNumber] = useState("");
  const [roomsActionLoading, setRoomsActionLoading] = useState(false);
  const [roomsManageRefreshKey, setRoomsManageRefreshKey] = useState(0);

  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState("sharing");
  const [newRoomAc, setNewRoomAc] = useState("non-ac");
  const [newRoomDetails, setNewRoomDetails] = useState("");
  const [addRoomDirty, setAddRoomDirty] = useState({ roomNumber: false, roomType: false, ac: false, details: false });

  const resetAddRoomForm = () => {
    setNewRoomNumber("");
    setNewRoomType("sharing");
    setNewRoomAc("non-ac");
    setNewRoomDetails("");
    setAddRoomDirty({ roomNumber: false, roomType: false, ac: false, details: false });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadRoomsManage() {
      try {
        setRoomsManageLoading(true);
        setRoomsManageError("");
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = wardenUser?.assignedHostel;
        if (!assignedHostelName) throw new Error("Assigned hostel not found for this warden.");
        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels)
          ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === String(assignedHostelName).trim().toLowerCase())
          : null;
        if (!hostel) throw new Error("Hostel not found.");
        setRoomsHostelId(String(hostel._id));
        const [roomDocs, details] = await Promise.all([
          apiFetch(`/rooms?hostelId=${hostel._id}`),
          apiFetch(`/rooms/details?hostelId=${hostel._id}`),
        ]);
        const detailsByRoomNumber = new Map((Array.isArray(details) ? details : []).map((d) => [String(d?.roomNumber || ""), d]));
        const merged = (Array.isArray(roomDocs) ? roomDocs : []).map((rd) => {
          const roomNumber = String(rd?.roomNumber || "");
          const d = detailsByRoomNumber.get(roomNumber);
          const raw = String(rd?.roomType || "sharing").toLowerCase();
          const roomType = raw === "double" ? "sharing" : raw;
          const bedCount = roomType === "single" ? 1 : 2;
          const fallbackBeds =
            bedCount === 1
              ? [{ bedNumber: "1", status: "Available", studentName: null }]
              : [
                  { bedNumber: "1", status: "Available", studentName: null },
                  { bedNumber: "2", status: "Available", studentName: null },
                ];
          const beds =
            Array.isArray(d?.beds) && d.beds.length
              ? d.beds
              : Array.isArray(rd?.beds) && rd.beds.length
                ? rd.beds
                : fallbackBeds;
          return { ...rd, roomNumber, roomType, studentName: d?.studentName ?? null, beds };
        });
        merged.sort((a, b) => {
          const ak = String(a?.roomNumber || "").match(/(\d+)/)?.[1] ? Number(String(a.roomNumber).match(/(\d+)/)[1]) : a.roomNumber;
          const bk = String(b?.roomNumber || "").match(/(\d+)/)?.[1] ? Number(String(b.roomNumber).match(/(\d+)/)[1]) : b.roomNumber;
          if (typeof ak === "number" && typeof bk === "number") return ak - bk;
          return String(a.roomNumber).localeCompare(String(b.roomNumber));
        });
        if (!cancelled) setRoomsManageList(merged);
      } catch (err) {
        if (!cancelled) {
          setRoomsManageError(err?.message ? String(err.message) : "Unable to load rooms.");
          setRoomsManageList([]);
        }
      } finally {
        if (!cancelled) setRoomsManageLoading(false);
      }
    }
    loadRoomsManage();
    return () => {
      cancelled = true;
    };
  }, [roomsManageRefreshKey]);

  const roomNoDigits = newRoomNumber.replace(/\D/g, "");
  const addRoomErrors = (() => {
    const err = {};
    if (!roomNoDigits) err.roomNumber = "Room number is required (digits only).";
    if (!newRoomType) err.roomType = "Select single or sharing.";
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

  const filteredRoomsManage = roomsManageSearch.trim()
    ? roomsManageList.filter((r) => {
        const q = roomsManageSearch.trim().toLowerCase();
        const bed1 = (r?.beds || []).find((b) => String(b?.bedNumber) === "1");
        const bed2 = (r?.beds || []).find((b) => String(b?.bedNumber) === "2");
        const roomStr = String(r?.roomNumber ?? "").toLowerCase();
        const haystack = [roomStr, r?.studentName, bed1?.studentName, bed2?.studentName, bed1?.status, bed2?.status, r?.roomType, r?.acType, r?.details]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase());
        return haystack.some((v) => v.includes(q));
      })
    : roomsManageList;

  const roomTypeCounts = (Array.isArray(filteredRoomsManage) ? filteredRoomsManage : []).reduce(
    (acc, r) => {
      const t = String(r?.roomType || "").toLowerCase();
      if (t === "single") acc.single += 1;
      else if (t === "sharing" || t === "double") acc.sharing += 1;
      return acc;
    },
    { single: 0, sharing: 0 },
  );
  const acTypeCounts = (Array.isArray(filteredRoomsManage) ? filteredRoomsManage : []).reduce(
    (acc, r) => {
      const t = String(r?.acType || "").toLowerCase();
      if (t === "ac") acc.ac += 1;
      else acc.nonAc += 1;
      return acc;
    },
    { ac: 0, nonAc: 0 },
  );
  const occupiedRoomsCount = (Array.isArray(filteredRoomsManage) ? filteredRoomsManage : []).filter((r) => (r?.beds || []).some((b) => b?.status === "Occupied")).length;
  const bookedRoomsCount = (Array.isArray(filteredRoomsManage) ? filteredRoomsManage : []).filter((r) => {
    const status = String(r?.status || "").toLowerCase();
    if (status === "reserved" || status === "occupied") return true;
    return (r?.beds || []).some((b) => String(b?.status || "").toLowerCase() === "occupied");
  }).length;
  const totalRoomsCount = (Array.isArray(filteredRoomsManage) ? filteredRoomsManage : []).length;
  const availableRoomsCount = Math.max(0, totalRoomsCount - occupiedRoomsCount);

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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          {[
            {
              label: "Single rooms",
              sub: "1 bed per room",
              n: roomTypeCounts.single,
              top: "linear-gradient(90deg, #38bdf8, #6366f1)",
              glow: "rgba(56, 189, 248, 0.2)",
              topicStyle: {
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "8px",
                color: "#e0f2fe",
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(99, 102, 241, 0.2))",
                border: "1px solid rgba(56, 189, 248, 0.55)",
                boxShadow: "0 0 20px rgba(56, 189, 248, 0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
              },
            },
            {
              label: "Sharing rooms",
              sub: "2 beds per room",
              n: roomTypeCounts.sharing,
              top: "linear-gradient(90deg, #a78bfa, #c084fc)",
              glow: "rgba(167, 139, 250, 0.2)",
              topicStyle: {
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "8px",
                color: "#f3e8ff",
                background: "linear-gradient(135deg, rgba(167, 139, 250, 0.32), rgba(192, 132, 252, 0.22))",
                border: "1px solid rgba(192, 132, 252, 0.55)",
                boxShadow: "0 0 20px rgba(167, 139, 250, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              },
            },
            {
              label: "AC rooms",
              sub: "air-conditioned",
              n: acTypeCounts.ac,
              top: "linear-gradient(90deg, #22d3ee, #0ea5e9)",
              glow: "rgba(34, 211, 238, 0.2)",
              topicStyle: {
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "8px",
                color: "#cffafe",
                background: "linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(14, 165, 233, 0.2))",
                border: "1px solid rgba(34, 211, 238, 0.55)",
                boxShadow: "0 0 20px rgba(34, 211, 238, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              },
            },
            {
              label: "Non-AC rooms",
              sub: "without A/C",
              n: acTypeCounts.nonAc,
              top: "linear-gradient(90deg, #94a3b8, #64748b)",
              glow: "rgba(148, 163, 184, 0.18)",
              topicStyle: {
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "8px",
                color: "#e2e8f0",
                background: "linear-gradient(135deg, rgba(148, 163, 184, 0.28), rgba(100, 116, 139, 0.2))",
                border: "1px solid rgba(148, 163, 184, 0.55)",
                boxShadow: "0 0 20px rgba(148, 163, 184, 0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
              },
            },
            {
              label: "Booked rooms",
              sub: "reserved + occupied",
              n: bookedRoomsCount,
              top: "linear-gradient(90deg, #f59e0b, #f97316)",
              glow: "rgba(245, 158, 11, 0.2)",
              topicStyle: {
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "8px",
                color: "#ffedd5",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(249, 115, 22, 0.22))",
                border: "1px solid rgba(245, 158, 11, 0.55)",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              },
            },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                ...s.card,
                padding: "14px 16px",
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `0 8px 24px ${c.glow}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: c.top,
                }}
              />
              <div style={c.topicStyle}>{c.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: T.textPrimary, marginTop: "10px", letterSpacing: "-0.03em" }}>{c.n}</div>
              <div style={{ fontSize: "12px", color: T.textSecondary, marginTop: "2px" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          <MiniBarChart
            title="Room Types"
            data={[
              { label: "Single", value: roomTypeCounts.single },
              { label: "Sharing", value: roomTypeCounts.sharing },
            ]}
            color="#60a5fa"
            bg="rgba(96,165,250,0.16)"
          />
          <MiniPieChart
            title="Room Occupancy"
            data={[
              { label: "Occupied", value: occupiedRoomsCount },
              { label: "Available", value: availableRoomsCount },
            ]}
            colors={["#f87171", "#34d399"]}
          />
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
                    { v: "sharing", label: "Sharing" },
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
                onClick={() => {
                  resetAddRoomForm();
                  setShowAddRoomForm(false);
                }}
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
