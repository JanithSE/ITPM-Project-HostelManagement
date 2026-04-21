import { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../shared/api/client";
import WardenInventory from "../inventory/WardenInventory";
import WardenRooms from "../rooms/WardenRooms";
import WardenStudents from "../Students/wardenStudents";
import WardenIssuedItems from "../inventory/WardenIssuedItems";
import {
  getWardenTheme,
  getTimeGreeting,
  wardenNavItems,
  WARDEN_INVENTORY_CHANGED,
  WardenDashboardProvider,
  useWardenDashboardOutlet,
  Counter,
  stats,
  leavesSeed,
  pillBaseStatic,
  bedPillStyle,
} from "./wardenDashboardPrimitives";
import LatePassNotificationBell from "../latepass/LatePassNotificationBell";
import PaymentNotificationBell from "../payments/PaymentNotificationBell";
import ThemeToggle from "../../shared/components/ThemeToggle";

const defaultRoomsOverview = {
  occupiedRooms: 0,
  totalRooms: 0,
  availableRooms: 0,
  blockCounts: {
    A: { occupied: 0, total: 0 },
    B: { occupied: 0, total: 0 },
    C: { occupied: 0, total: 0 },
    D: { occupied: 0, total: 0 },
  },
};

function WardenDashboardHome() {
  const outlet = useWardenDashboardOutlet();
  const active = outlet?.homeActiveTab ?? "Dashboard";
  const roomDetails = outlet?.roomDetails ?? [];
  const roomsOverview = outlet?.roomsOverview ?? defaultRoomsOverview;
  const roomsLoading = outlet?.roomsLoading ?? false;
  const roomsError = outlet?.roomsError ?? "";
  const { T, s } = getWardenTheme();

  const [confirmedStudentCount, setConfirmedStudentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadConfirmedCount() {
      if (active !== "Dashboard") return;
      try {
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = String(wardenUser?.assignedHostel ?? "").trim();
        if (!assignedHostelName) {
          if (!cancelled) setConfirmedStudentCount(0);
          return;
        }

        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels)
          ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === assignedHostelName.toLowerCase())
          : null;
        if (!hostel?._id) {
          if (!cancelled) setConfirmedStudentCount(0);
          return;
        }
        const hostelId = String(hostel._id);

        const bookings = await apiFetch("/bookings");
        const confirmedForHostel = (Array.isArray(bookings) ? bookings : []).filter((b) => {
          const status = String(b?.status || "").toLowerCase();
          const bookingHostelId = String(b?.hostel?._id || b?.hostel || "");
          return status === "confirmed" && bookingHostelId === hostelId;
        });

        const bookingByStudent = new Map();
        for (const b of confirmedForHostel) {
          const sid = String(b?.student?._id || b?.student || "");
          if (!sid) continue;
          if (bookingByStudent.has(sid)) continue;
          bookingByStudent.set(sid, b);
        }

        if (!cancelled) setConfirmedStudentCount(bookingByStudent.size);
      } catch {
        if (!cancelled) setConfirmedStudentCount(0);
      }
    }
    loadConfirmedCount();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const warden = useMemo(() => {
    try {
      const raw = localStorage.getItem("wardenUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const assignedHostelName = warden?.assignedHostel || "";

  const pendingLeavesCount = (Array.isArray(leavesSeed) ? leavesSeed : []).filter(
    (l) => String(l?.status || "").toLowerCase() === "pending",
  ).length;

  const statsFinal = stats.map((st) => {
    if (st.label === "Total Students") {
      return { ...st, value: confirmedStudentCount, sub: `confirmed bookings in ${assignedHostelName || "hostel"}` };
    }
    if (st.label === "Rooms Occupied") {
      return { ...st, value: roomsOverview.occupiedRooms, sub: `of ${roomsOverview.totalRooms} rooms` };
    }
    if (st.label === "Leave Requests") {
      return { ...st, value: leavesSeed.length, sub: `${pendingLeavesCount} pending review` };
    }
    return st;
  });

  function roomRowsToShow() {
    const max = 10;
    if (!roomDetails || roomDetails.length <= max) return { rows: roomDetails || [], more: 0 };
    return { rows: roomDetails.slice(0, max), more: roomDetails.length - max };
  }
  const { rows: roomRows, more: roomRowsMore } = roomRowsToShow();

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {statsFinal.map((st, i) => (
          <div key={i} style={{ ...s.card, padding: "20px 22px", position: "relative", overflow: "hidden", cursor: "default" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(${st.grad})`, opacity: 1, boxShadow: `0 0 20px ${st.glow.replace("0.45", "0.35")}` }} />
            <div style={{ position: "absolute", bottom: "-35px", right: "-25px", width: "120px", height: "120px", background: `radial-gradient(circle, ${st.glow.replace("0.45", "0.14")} 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: `linear-gradient(${st.grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px", boxShadow: `0 6px 20px ${st.glow.replace("0.45", "0.35")}`, border: "1px solid rgba(255,255,255,0.15)" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        <div style={{ ...s.card, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Bed Occupancy</div>
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>
              {roomsLoading ? "Loading…" : `${roomRows.length} of ${roomsOverview.totalRooms} rooms`}
              {roomRowsMore ? ` · +${roomRowsMore} more` : ""}
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={s.trBorder}>{["Room", "Bed 1", "Bed 2", "Student"].map((h) => <th key={h} style={s.thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {roomsLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`s-${idx}`} style={s.trBorder}>
                      {[60, 76, 76, 90].map((w, ci) => (
                        <td key={ci} style={{ padding: "9px 0" }}>
                          <div style={{ height: 8, width: w, background: T.skelBg, borderRadius: 6 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : roomsError ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "12px 0", color: "#f87171", fontSize: "13px" }}>{roomsError}</td>
                  </tr>
                ) : (
                  <>
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
                    {!roomRows?.length && (
                      <tr>
                        <td colSpan={4} style={{ padding: "12px 0", color: T.textMuted, fontSize: "13px" }}>No rooms found.</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default function WardenDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [homeActiveTab, setHomeActiveTab] = useState("Dashboard");
  const [now, setNow] = useState(new Date());
  const [warden, setWarden] = useState(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [roomsOverview, setRoomsOverview] = useState({
    occupiedRooms: 0,
    totalRooms: 0,
    availableRooms: 0,
    blockCounts: {
      A: { occupied: 0, total: 0 },
      B: { occupied: 0, total: 0 },
      C: { occupied: 0, total: 0 },
      D: { occupied: 0, total: 0 },
    },
  });
  const [roomDetails, setRoomDetails] = useState([]);
  const [lowInventoryAlerts, setLowInventoryAlerts] = useState([]);
  const lowAlertedIdsRef = useRef(new Set());

  const { T, s } = getWardenTheme();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wardenUser");
      setWarden(raw ? JSON.parse(raw) : null);
    } catch {
      setWarden(null);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        setRoomsLoading(true);
        setRoomsError("");
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = wardenUser?.assignedHostel;
        if (!assignedHostelName) {
          if (!cancelled) {
            setRoomsOverview((prev) => ({ ...prev, availableRooms: prev.totalRooms - prev.occupiedRooms }));
            setRoomDetails([]);
          }
          return;
        }
        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels)
          ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === String(assignedHostelName).trim().toLowerCase())
          : null;
        if (!hostel) {
          if (!cancelled) {
            setRoomDetails([]);
          }
          return;
        }
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
        const availableRooms = Math.max(0, totalRooms - occupiedRooms);
        if (!cancelled) {
          setRoomDetails(rooms);
          setRoomsOverview({ occupiedRooms, totalRooms, availableRooms, blockCounts });
        }
      } catch (err) {
        if (!cancelled) {
          setRoomDetails([]);
          setRoomsError(err?.message ? String(err.message) : "Unable to load rooms");
          setRoomsOverview({
            occupiedRooms: 0,
            totalRooms: 0,
            availableRooms: 0,
            blockCounts: { A: { occupied: 0, total: 0 }, B: { occupied: 0, total: 0 }, C: { occupied: 0, total: 0 }, D: { occupied: 0, total: 0 } },
          });
        }
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    }
    loadRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLowInventoryAlerts() {
      try {
        const items = await apiFetch("/inventory");
        const all = Array.isArray(items) ? items : [];
        const low = all.filter((it) => {
          const qty = Number(it?.quantity);
          return Number.isFinite(qty) && qty < 15;
        });
        if (!cancelled) setLowInventoryAlerts(low);
      } catch {
        if (!cancelled) setLowInventoryAlerts([]);
      }
    }
    loadLowInventoryAlerts();
    const onInvChange = () => loadLowInventoryAlerts();
    window.addEventListener(WARDEN_INVENTORY_CHANGED, onInvChange);
    const id = setInterval(loadLowInventoryAlerts, 45000);
    return () => {
      cancelled = true;
      window.removeEventListener(WARDEN_INVENTORY_CHANGED, onInvChange);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const currentLowIds = new Set(
      (Array.isArray(lowInventoryAlerts) ? lowInventoryAlerts : [])
        .map((it) => String(it?._id || it?.id || it?.category || it?.name || ""))
        .filter(Boolean),
    );
    for (const it of lowInventoryAlerts) {
      const id = String(it?._id || it?.id || it?.category || it?.name || "");
      if (!id || lowAlertedIdsRef.current.has(id)) continue;
      const itemName = String(it?.name || it?.category || "Inventory item");
      const qty = Number(it?.quantity);
      toast.error(`${itemName} is low in stock (qty: ${Number.isFinite(qty) ? qty : "N/A"}). Reorder soon.`);
      lowAlertedIdsRef.current.add(id);
    }
    for (const oldId of Array.from(lowAlertedIdsRef.current)) {
      if (!currentLowIds.has(oldId)) lowAlertedIdsRef.current.delete(oldId);
    }
  }, [lowInventoryAlerts]);

  const wardenName = warden?.name || "Warden";
  const assignedHostelName = warden?.assignedHostel || "";

  function getInitials(name) {
    if (!name) return "W";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "W";
    return ((parts[0]?.[0] || "W") + (parts[1]?.[0] || (parts[0]?.[1] ? parts[0][1] : ""))).toUpperCase();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("wardenUser");
    navigate("/warden/login", { replace: true });
  }

  const path = location.pathname.replace(/\/$/, "");
  const onInventoryPage = path.endsWith("/inventory");
  const onRoomsPage = path.endsWith("/rooms");
  const onStudentsPage = path.endsWith("/students");
  const onIssuedItemsPage = path.endsWith("/issued-items");
  const onHome = !onInventoryPage && !onRoomsPage && !onStudentsPage && !onIssuedItemsPage;

  function isNavActive(label) {
    if (label === "Inventory") return onInventoryPage;
    if (label === "Rooms") return onRoomsPage;
    if (label === "Students") return onStudentsPage;
    if (label === "Issued items") return onIssuedItemsPage;
    return onHome && homeActiveTab === label;
  }

  function onNavClick(label) {
    if (label === "Inventory") navigate("/warden/inventory");
    else if (label === "Rooms") navigate("/warden/rooms");
    else if (label === "Students") navigate("/warden/students");
    else if (label === "Issued items") navigate("/warden/issued-items");
    else {
      navigate("/warden");
      setHomeActiveTab(label);
    }
  }

  const outletContext = useMemo(
    () => ({
      homeActiveTab,
      setHomeActiveTab,
      roomDetails,
      roomsOverview,
      roomsLoading,
      roomsError,
    }),
    [homeActiveTab, roomDetails, roomsOverview, roomsLoading, roomsError],
  );

  return (
    <div style={s.page}>
      <div style={{ position: "fixed", top: "-160px", left: "-80px", width: "520px", height: "520px", background: "radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-140px", right: "-100px", width: "560px", height: "560px", background: "radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "35%", right: "8%", width: "320px", height: "320px", background: "radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <aside style={s.aside}>
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "20px", color: "#fff", boxShadow: "0 6px 24px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset", flexShrink: 0 }}>UH</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.03em", color: T.textPrimary }}>UniHostel</div>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#818cf8", marginTop: "3px" }}>Warden · Command</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 12px" }}>
          <div style={{ background: "linear-gradient(145deg, rgba(99,102,241,0.18) 0%, rgba(129,140,248,0.06) 100%)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: "14px", padding: "12px 14px", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#a5b4fc", marginBottom: "6px" }}>LOCAL TIME</div>
            <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "0.04em", background: "linear-gradient(90deg, #c7d2fe, #e9d5ff)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", fontVariantNumeric: "tabular-nums" }}>
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div style={{ fontSize: "12px", color: T.textSecondary, marginTop: "6px", fontWeight: 600 }}>{now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "4px 8px", display: "flex", flexDirection: "column", gap: "1px", overflowY: "auto" }}>
          {wardenNavItems.map((item) => {
            const navActive = isNavActive(item.label);
            const badge = item.label === "Leave" ? 5 : null;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavClick(item.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: navActive ? 700 : 500,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  background: navActive ? "linear-gradient(90deg, rgba(129,140,248,0.2) 0%, rgba(129,140,248,0.06) 100%)" : "transparent",
                  border: navActive ? `1px solid rgba(129,140,248,0.35)` : "1px solid transparent",
                  color: navActive ? "#c7d2fe" : T.textSecondary,
                  fontFamily: "inherit",
                  boxShadow: navActive ? "0 4px 18px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span style={{ fontSize: "15px", opacity: navActive ? 1 : 0.5 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge && (
                  <span style={{ background: navActive ? "linear-gradient(135deg,#818cf8,#c084fc)" : "rgba(255,255,255,0.07)", fontSize: "11px", padding: "2px 6px", borderRadius: "99px", color: navActive ? "#fff" : T.textMuted, fontWeight: 700 }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "12px 12px 14px", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)", border: `1px solid rgba(129,140,248,0.18)`, borderRadius: "14px", padding: "12px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "linear-gradient(135deg, #6366f1, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>{getInitials(wardenName)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wardenName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 4px rgba(52,211,153,0.8)" }} />
                <span style={{ fontSize: "12px", color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedHostelName ? `${assignedHostelName}` : "Online"}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div style={s.main}>
        <header
          style={{
            padding: "14px 24px",
            background: "linear-gradient(180deg, rgba(15,18,32,0.95) 0%, rgba(10,13,24,0.88) 100%)",
            borderBottom: `1px solid rgba(129,140,248,0.15)`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            backdropFilter: "blur(20px) saturate(150%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", color: T.textPrimary }}>
                {getTimeGreeting(now)}, {wardenName}
              </span>
              <span style={{ fontSize: "20px" }} aria-hidden>👋</span>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "999px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)", color: "#6ee7b7" }}>Live</span>
            </div>
            <div style={{ fontSize: "13px", color: T.textSecondary, marginTop: "6px", fontWeight: 500 }}>
              {assignedHostelName ? assignedHostelName : "Hostel overview"} · {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "10px", background: "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>{roomsOverview.availableRooms} rooms free</span>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "10px", background: "linear-gradient(135deg, rgba(129,140,248,0.22), rgba(99,102,241,0.08))", border: "1px solid rgba(129,140,248,0.35)", color: "#c7d2fe" }}>{roomsOverview.totalRooms} total rooms</span>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "10px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.28)", color: "#fca5a5" }}>{roomsOverview.occupiedRooms} occupied</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <PaymentNotificationBell
                buttonClassName="!border-emerald-400/30 !bg-slate-900/70 !text-emerald-100 hover:!bg-slate-800"
              />
              <LatePassNotificationBell
                buttonClassName="!border-indigo-400/30 !bg-slate-900/70 !text-indigo-100 hover:!bg-slate-800"
              />
              <ThemeToggle className="!border-indigo-400/30 !bg-slate-900/70 !text-amber-200 hover:!bg-slate-800 dark:!border-indigo-400/30 dark:!bg-slate-900/70" />
            </div>
            <button
              type="button"
              onClick={() => navigate("/warden/issued-items")}
              title="Issued inventory — when, room, expected return"
              style={{
                whiteSpace: "nowrap",
                background: "linear-gradient(135deg, rgba(129,140,248,0.18), rgba(99,102,241,0.08))",
                border: "1px solid rgba(129,140,248,0.35)",
                borderRadius: "12px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                color: "#c7d2fe",
                fontFamily: "inherit",
                boxShadow: "0 2px 12px rgba(99,102,241,0.15)",
              }}
            >
              Issued items
            </button>
            <button type="button" style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #c084fc 100%)", borderRadius: "12px", padding: "9px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 22px rgba(99,102,241,0.4)", color: "#fff", border: "none", fontFamily: "inherit" }}>+ Post Notice</button>
            <button type="button" onClick={handleLogout} style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.22), rgba(248,113,113,0.08))", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "12px", padding: "9px 16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "#fecaca", fontFamily: "inherit" }}>Logout</button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px", background: "transparent" }}>
          <WardenDashboardProvider value={outletContext}>
            <Routes>
              <Route index element={<WardenDashboardHome />} />
              <Route path="inventory" element={<WardenInventory />} />
              <Route path="rooms" element={<WardenRooms />} />
              <Route path="students" element={<WardenStudents />} />
              <Route path="issued-items" element={<WardenIssuedItems />} />
            </Routes>
          </WardenDashboardProvider>
        </div>
      </div>
    </div>
  );
}
