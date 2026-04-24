import { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../shared/api/client";
import WardenInventory from "../inventory/WardenInventory";
import WardenRooms from "../rooms/WardenRooms";
import WardenStudents from "../Students/wardenStudents";
import WardenIssuedItems from "../inventory/WardenIssuedItems";
import AdminMaintenance from "../maintenance/AdminMaintenance";
import {
  useWardenTheme,
  getTimeGreeting,
  wardenNavItems,
  WARDEN_INVENTORY_CHANGED,
  WardenDashboardProvider,
  useWardenDashboardOutlet,
  Counter,
  stats,
  leavesSeed,
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

function normalizeWardenRoomTypeForStats(r) {
  const raw = String(r?.roomType || "").toLowerCase();
  if (raw === "double") return "sharing";
  if (raw === "single" || raw === "sharing") return raw;
  const n = (r?.beds || []).length;
  if (n <= 1) return "single";
  return "sharing";
}

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeInventoryRecord(item) {
  const name = String(item?.name || item?.category || "Item").trim();
  const quantity = toSafeNumber(item?.availableQuantity ?? item?.quantity, 0);
  const reorderLevel = Math.max(0, toSafeNumber(item?.reorderLevel, 15));
  const issued = toSafeNumber(item?.issuedTotal, 0);
  const total = toSafeNumber(item?.totalStock, quantity + issued);
  return {
    id: String(item?._id || item?.id || name),
    name,
    quantity,
    reorderLevel,
    issued,
    total,
  };
}

function createInventoryBotReply(rawInput, inventoryItems) {
  const text = String(rawInput || "").trim();
  const query = text.toLowerCase();
  const normalizedQuery = query.replace(/\binventroy\b/g, "inventory");
  const items = (Array.isArray(inventoryItems) ? inventoryItems : []).map(normalizeInventoryRecord);

  if (!text) return "Please type a question about inventory items.";
  const isGreeting =
    normalizedQuery === "hi" ||
    normalizedQuery === "hello" ||
    normalizedQuery === "hey" ||
    normalizedQuery.includes("good morning") ||
    normalizedQuery.includes("good afternoon") ||
    normalizedQuery.includes("good evening");
  if (isGreeting) {
    return "Good to see you! I can help with inventory item list, total stock, low-stock alerts, or quantity of a specific item.";
  }
  if (!items.length) return "I cannot see inventory items right now. Please refresh and try again.";

  const lowItems = items.filter((it) => it.quantity <= it.reorderLevel);
  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

  if (normalizedQuery.includes("low stock") || normalizedQuery.includes("restock") || normalizedQuery.includes("reorder")) {
    if (!lowItems.length) return "Great news: no items are currently at or below reorder level.";
    return `Low-stock items: ${lowItems.slice(0, 6).map((it) => `${it.name} (${it.quantity})`).join(", ")}.`;
  }

  const asksForItemList =
    (normalizedQuery.includes("what") || normalizedQuery.includes("which") || normalizedQuery.includes("show") || normalizedQuery.includes("list")) &&
    normalizedQuery.includes("item") &&
    (normalizedQuery.includes("inventory") || normalizedQuery.includes("in stock") || normalizedQuery.includes("available"));
  if (asksForItemList) {
    const names = items.map((it) => it.name).filter(Boolean);
    if (!names.length) return "No inventory items found right now.";
    return `Current inventory items: ${names.slice(0, 12).join(", ")}${names.length > 12 ? `, and ${names.length - 12} more.` : "."}`;
  }

  const asksFullStockList =
    (normalizedQuery.includes("full stock") || normalizedQuery.includes("all stock") || normalizedQuery.includes("full inventory")) &&
    (normalizedQuery.includes("item") || normalizedQuery.includes("inventory") || normalizedQuery.includes("stock"));
  if (asksFullStockList) {
    const lines = items
      .slice(0, 20)
      .map((it) => `${it.name}: available ${it.quantity}, issued ${it.issued}, total ${it.total}`)
      .join("; ");
    return `Full stock snapshot: ${lines}${items.length > 20 ? `; and ${items.length - 20} more items.` : "."}`;
  }

  if (normalizedQuery.includes("total item") || normalizedQuery.includes("how many item")) {
    return `You have ${items.length} inventory item types with ${totalUnits} total units available.`;
  }

  if (normalizedQuery.includes("highest") || normalizedQuery.includes("most stock")) {
    const top = [...items].sort((a, b) => b.quantity - a.quantity)[0];
    return `${top.name} has the highest stock right now (${top.quantity} units).`;
  }

  const matched = items.find((it) => normalizedQuery.includes(it.name.toLowerCase()));
  if (matched) {
    const lowTag = matched.quantity <= matched.reorderLevel ? "This item is at or below reorder level." : "Stock level looks healthy.";
    return `${matched.name} currently has ${matched.quantity} units. Reorder level is ${matched.reorderLevel}. ${lowTag}`;
  }

  return "I can help with: low-stock items, total items, highest stock, or stock of a specific item name.";
}

function WardenDashboardHome() {
  const navigate = useNavigate();
  const outlet = useWardenDashboardOutlet();
  const active = outlet?.homeActiveTab ?? "Dashboard";
  const roomDetails = outlet?.roomDetails ?? [];
  const roomsOverview = outlet?.roomsOverview ?? defaultRoomsOverview;
  const roomsLoading = outlet?.roomsLoading ?? false;
  const roomsError = outlet?.roomsError ?? "";
  const lowInventoryAlerts = Array.isArray(outlet?.lowInventoryAlerts) ? outlet.lowInventoryAlerts : [];
  const inventoryItems = Array.isArray(outlet?.inventoryItems) ? outlet.inventoryItems : [];
  const setHomeActiveTab = outlet?.setHomeActiveTab;
  const dashboardNow = outlet?.now instanceof Date && !Number.isNaN(outlet.now.getTime()) ? outlet.now : new Date();
  const { T, s, mode } = useWardenTheme();

  const [confirmedStudentCount, setConfirmedStudentCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Great to see you! I am your Inventory Assistant. Ask me about item list, total stock, low-stock alerts, or quantity of a specific item.",
    },
  ]);
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null);

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

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatSending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canRecognize = typeof SpeechRecognition === "function";
    const canSpeak = typeof window.speechSynthesis !== "undefined";
    setVoiceSupported(canRecognize);
    setSpeechSupported(canSpeak);
    if (!canRecognize) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      setChatInput(transcript);
      submitInventoryChat(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // no-op
      }
      recognitionRef.current = null;
    };
  }, []);

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

  const statsFinalBase = stats.map((st) => {
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
  const statsFinal = [
    ...statsFinalBase,
    {
      label: "Items Needing Restock",
      value: lowInventoryAlerts.length,
      sub: lowInventoryAlerts.length ? "at or below reorder level" : "all inventory above threshold",
      icon: "⚠️",
      grad: "135deg, #f97316, #ef4444",
      glow: "rgba(248,113,113,0.45)",
      accent: "#f97316",
    },
  ];

  const roomSnapshot = useMemo(() => {
    const list = Array.isArray(roomDetails) ? roomDetails : [];
    const acc = { single: 0, sharing: 0, ac: 0, nonAc: 0, booked: 0 };
    for (const r of list) {
      const rt = normalizeWardenRoomTypeForStats(r);
      if (rt === "single") acc.single += 1;
      else acc.sharing += 1;
      if (String(r?.acType || "").toLowerCase() === "ac") acc.ac += 1;
      else acc.nonAc += 1;
      const st = String(r?.status || "").toLowerCase();
      if (st === "reserved" || st === "occupied") acc.booked += 1;
      else if ((r?.beds || []).some((b) => String(b?.status || "").toLowerCase() === "occupied")) acc.booked += 1;
    }
    return { ...acc, total: list.length };
  }, [roomDetails]);

  const occupancyPct =
    roomsOverview.totalRooms > 0 ? Math.round((roomsOverview.occupiedRooms / roomsOverview.totalRooms) * 100) : 0;

  const blockRows = useMemo(() => {
    const letters = ["A", "B", "C", "D"];
    return letters.map((L) => {
      const b = roomsOverview?.blockCounts?.[L] ?? { occupied: 0, total: 0 };
      const t = b.total || 0;
      const o = b.occupied || 0;
      const pct = t > 0 ? Math.round((o / t) * 100) : 0;
      return { L, o, t, pct };
    });
  }, [roomsOverview]);

  const restockPreview = (lowInventoryAlerts || []).slice(0, 4);

  const quickActions = [
    { label: "Inventory", sub: "Stock & restock", icon: "▦", path: "/warden/inventory" },
    { label: "Rooms", sub: "Beds & blocks", icon: "⬡", path: "/warden/rooms" },
    { label: "Students", sub: "Roster", icon: "◉", path: "/warden/students" },
    { label: "Issued items", sub: "Returns", icon: "📋", path: "/warden/issued-items" },
    { label: "Maintenance", sub: "Requests", icon: "🛠️", path: "/warden/maintenance" },
  ];

  const snapshotCards = [
    {
      key: "single",
      label: "Single rooms",
      sub: "1 bed per room",
      n: roomSnapshot.single,
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
      key: "sharing",
      label: "Sharing rooms",
      sub: "2 beds per room",
      n: roomSnapshot.sharing,
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
      key: "ac",
      label: "AC rooms",
      sub: "air-conditioned",
      n: roomSnapshot.ac,
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
      key: "nonac",
      label: "Non-AC rooms",
      sub: "without A/C",
      n: roomSnapshot.nonAc,
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
      key: "booked",
      label: "Booked rooms",
      sub: "reserved + occupied",
      n: roomSnapshot.booked,
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
  ];

  const qaBase = {
    ...s.card,
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    border: `1px solid ${T.cardBorder}`,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };

  async function submitInventoryChat(message) {
    const text = String(message || "").trim();
    if (!text || chatSending) return;
    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setChatInput("");
    setChatSending(true);
    window.setTimeout(async () => {
      let reply = "";
      try {
        const data = await apiFetch("/inventory/chat", {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });
        reply = String(data?.reply || "").trim();
      } catch {
        // Fallback to local rules if AI endpoint is unavailable.
      }
      if (!reply) {
        let itemsForReply = inventoryItems;
        if (!Array.isArray(itemsForReply) || !itemsForReply.length) {
          try {
            const data = await apiFetch("/inventory");
            itemsForReply = Array.isArray(data) ? data : [];
          } catch {
            itemsForReply = [];
          }
        }
        reply = createInventoryBotReply(text, itemsForReply);
      }
      setChatMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: "bot", text: reply }]);
      if (voiceReplyEnabled && speechSupported && typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.rate = 1;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
        } catch {
          // no-op for browsers with partial API support
        }
      }
      setChatSending(false);
    }, 360);
  }

  function toggleListening() {
    if (!voiceSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  const inventoryChatbotCard = (
    <div
      style={{
        ...s.card,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background:
          mode === "light"
            ? "linear-gradient(135deg, rgba(236,253,245,0.95), rgba(224,242,254,0.92))"
            : "linear-gradient(135deg, rgba(6,78,59,0.22), rgba(15,23,42,0.96) 42%, rgba(3,105,161,0.2))",
        border: mode === "light" ? "1px solid rgba(16,185,129,0.32)" : "1px solid rgba(45,212,191,0.36)",
        boxShadow:
          mode === "light"
            ? "0 10px 26px rgba(6,95,70,0.08)"
            : "0 12px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(45,212,191,0.1) inset",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: mode === "light" ? "#065f46" : "#99f6e4" }}>Inventory chatbot</div>
          <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>
            Ask questions about item stock, low inventory, and restock priorities.
          </div>
            <div style={{ fontSize: "11px", color: mode === "light" ? "#0f766e" : "#a7f3d0", marginTop: "6px" }}>
              Quick guide: try "show inventory items", "total stock", "low stock items", or "quantity of chairs".
            </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/warden/inventory")}
          style={{
            whiteSpace: "nowrap",
            background: T.accentLight,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: "10px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 800,
            color: T.accent,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Open Inventory
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {["Show low stock items", "How many total items are available?", "Which item has highest stock?"].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => submitInventoryChat(q)}
            style={{
              borderRadius: "999px",
              border: `1px solid ${T.inputBorder}`,
              background: T.inputBg,
              color: T.textSecondary,
              fontSize: "12px",
              fontWeight: 700,
              padding: "6px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div
        style={{
          borderRadius: "12px",
          border: `1px solid ${T.inputBorder}`,
          background: T.inputBg,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: "240px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {chatMessages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "8px 10px",
                borderRadius: "10px",
                fontSize: "13px",
                lineHeight: 1.45,
                background: m.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : T.cardBg,
                color: m.role === "user" ? "#fff" : T.textSecondary,
                border: m.role === "user" ? "none" : `1px solid ${T.cardBorder}`,
              }}
            >
              {m.text}
            </div>
          ))}
          {chatSending ? <div style={{ fontSize: "12px", color: T.textMuted }}>Assistant is typing...</div> : null}
          <div ref={chatScrollRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitInventoryChat(chatInput);
        }}
        style={{ display: "flex", gap: "8px", alignItems: "center" }}
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask: stock of pillow, low stock items, total units..."
          style={{
            flex: 1,
            borderRadius: "10px",
            border: `1px solid ${T.inputBorder}`,
            background: T.inputBg,
            color: T.textPrimary,
            padding: "10px 12px",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={toggleListening}
          disabled={!voiceSupported}
          title={voiceSupported ? (isListening ? "Stop listening" : "Start voice input") : "Voice input is not supported in this browser"}
          style={{
            borderRadius: "10px",
            border: `1px solid ${T.inputBorder}`,
            background: isListening ? "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.1))" : T.inputBg,
            color: isListening ? (mode === "light" ? "#b91c1c" : "#fecaca") : T.textSecondary,
            fontWeight: 800,
            fontSize: "13px",
            padding: "10px 12px",
            cursor: voiceSupported ? "pointer" : "not-allowed",
            opacity: voiceSupported ? 1 : 0.6,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {isListening ? "Listening..." : "Voice"}
        </button>
        <button
          type="button"
          onClick={() => setVoiceReplyEnabled((v) => !v)}
          disabled={!speechSupported}
          title={speechSupported ? "Toggle spoken replies" : "Voice output is not supported in this browser"}
          style={{
            borderRadius: "10px",
            border: `1px solid ${T.inputBorder}`,
            background: voiceReplyEnabled ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.14))" : T.inputBg,
            color: voiceReplyEnabled ? (mode === "light" ? "#4338ca" : "#ddd6fe") : T.textSecondary,
            fontWeight: 800,
            fontSize: "12px",
            padding: "10px 11px",
            cursor: speechSupported ? "pointer" : "not-allowed",
            opacity: speechSupported ? 1 : 0.6,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          {voiceReplyEnabled ? "Voice On" : "Voice Off"}
        </button>
        <button
          type="submit"
          disabled={!String(chatInput || "").trim() || chatSending}
          style={{
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "13px",
            padding: "10px 14px",
            cursor: !String(chatInput || "").trim() || chatSending ? "not-allowed" : "pointer",
            opacity: !String(chatInput || "").trim() || chatSending ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          Send
        </button>
      </form>
      {!voiceSupported || !speechSupported ? (
        <div style={{ fontSize: "11px", color: T.textMuted }}>
          {!voiceSupported ? "Voice input is unavailable in this browser. " : ""}
          {!speechSupported ? "Spoken replies are unavailable in this browser." : ""}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div
        style={{
          ...s.card,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: mode === "light" ? T.cardBg : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: "6px" }}>Today</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em" }}>
              {dashboardNow.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div style={{ fontSize: "13px", color: T.textSecondary, marginTop: "4px", maxWidth: "36rem", lineHeight: 1.5 }}>
              {getTimeGreeting(dashboardNow)} — here is a live snapshot of {assignedHostelName || "your hostel"}. Use shortcuts below to jump to common tasks.
            </div>
          </div>
          <div
            style={{
              minWidth: "120px",
              padding: "12px 16px",
              borderRadius: "14px",
              background: T.accentLight,
              border: `1px solid ${T.accentBorder}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>Hostel time</div>
            <div style={{ fontSize: "22px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: T.accent, marginTop: "4px" }}>
              {dashboardNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 800, color: T.textPrimary, marginBottom: "10px" }}>Shortcuts</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
            {quickActions.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  if (q.path) navigate(q.path);
                }}
                style={{
                  ...qaBase,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = mode === "light" ? "0 8px 24px rgba(15,23,42,0.08)" : "0 8px 28px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = T.cardShadow;
                }}
              >
                <span style={{ fontSize: "18px" }} aria-hidden>
                  {q.icon}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: T.textPrimary }}>{q.label}</span>
                <span style={{ fontSize: "11px", color: T.textMuted }}>{q.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {inventoryChatbotCard}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        <div style={{ ...s.card, padding: "18px 20px" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Occupancy pulse</div>
          <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px", lineHeight: 1.5 }}>
            {roomsLoading ? "Loading…" : `${roomsOverview.occupiedRooms} of ${roomsOverview.totalRooms} rooms with at least one occupied bed.`}
          </div>
          <div
            style={{
              marginTop: "14px",
              height: "12px",
              borderRadius: "999px",
              background: T.divider,
              overflow: "hidden",
              border: `1px solid ${T.inputBorder}`,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, occupancyPct))}%`,
                borderRadius: "999px",
                background: "linear-gradient(90deg, #34d399, #22d3ee)",
                boxShadow: "0 0 16px rgba(52,211,153,0.35)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "10px" }}>
            <span style={{ fontSize: "28px", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.03em" }}>{roomsLoading ? "—" : `${occupancyPct}%`}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: T.textSecondary }}>{roomsOverview.availableRooms} available</span>
          </div>
        </div>
        <div style={{ ...s.card, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Wing load (A–D)</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>Share of rooms occupied, by block label</div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/warden/rooms")}
              style={{
                whiteSpace: "nowrap",
                background: T.accentLight,
                border: `1px solid ${T.accentBorder}`,
                borderRadius: "10px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 800,
                color: T.accent,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Rooms
            </button>
          </div>
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {blockRows.map((row) => (
              <div key={row.L}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: T.textSecondary, marginBottom: "4px" }}>
                  <span>Block {row.L}</span>
                  <span>
                    {row.o}/{row.t} · {row.t ? `${row.pct}%` : "—"}
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    borderRadius: "6px",
                    background: T.divider,
                    overflow: "hidden",
                    border: `1px solid ${T.inputBorder}`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, row.pct)}%`,
                      borderRadius: "6px",
                      background: "linear-gradient(90deg, #6366f1, #a855f7)",
                      opacity: row.t ? 1 : 0.35,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...s.card, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Restock watch</div>
              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>Items at or under reorder level</div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/warden/inventory")}
              style={{
                whiteSpace: "nowrap",
                background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.08))",
                border: "1px solid rgba(249,115,22,0.35)",
                borderRadius: "10px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 800,
                color: mode === "light" ? "#c2410c" : "#fdba74",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Inventory
            </button>
          </div>
          {restockPreview.length === 0 ? (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.06))",
                border: "1px solid rgba(52,211,153,0.3)",
                fontSize: "13px",
                fontWeight: 600,
                color: T.textSecondary,
              }}
            >
              All clear — no items flagged for restock.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {restockPreview.map((it) => {
                const qty = Number(it?.availableQuantity ?? it?.quantity);
                const reorder = Number.isFinite(Number(it?.reorderLevel)) ? Math.max(0, Number(it.reorderLevel)) : 15;
                const name = String(it?.name || it?.category || "Item");
                return (
                  <li
                    key={String(it?._id || it?.id || name)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: T.inputBg,
                      border: `1px solid ${T.inputBorder}`,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: T.textMuted, flexShrink: 0 }}>
                      {Number.isFinite(qty) ? qty : "—"} / ≤{reorder}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div style={{ ...s.card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "15px", color: T.textPrimary }}>Room snapshot</div>
            <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px", maxWidth: "40rem", lineHeight: 1.5 }}>
              {roomsLoading
                ? "Loading room mix for your hostel…"
                : roomsError
                  ? String(roomsError)
                  : `Totals for ${assignedHostelName || "your hostel"}: ${roomSnapshot.total} room${roomSnapshot.total === 1 ? "" : "s"}. Open Rooms for the full list and bed-level detail.`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/warden/rooms")}
            style={{
              whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #34d399, #06b6d4)",
              border: "none",
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 800,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(52,211,153,0.3)",
            }}
          >
            Open Rooms
          </button>
        </div>
        {roomsLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...s.card, padding: "14px 16px", minHeight: "88px" }}>
                <div style={{ height: 12, width: "50%", background: T.skelBg, borderRadius: 6, marginBottom: 10 }} />
                <div style={{ height: 28, width: "40%", background: T.skelBg, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {snapshotCards.map((c) => (
              <div
                key={c.key}
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
                <div style={{ fontSize: "26px", fontWeight: 900, color: T.textPrimary, marginTop: "10px", letterSpacing: "-0.03em" }}>{c.n}</div>
                <div style={{ fontSize: "12px", color: T.textSecondary, marginTop: "2px" }}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}
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
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowInventoryAlerts, setLowInventoryAlerts] = useState([]);
  const lowAlertedIdsRef = useRef(new Set());

  const { T, s, mode } = useWardenTheme();

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
        if (!cancelled) setInventoryItems(all);
        const low = all.filter((it) => {
          const qty = Number(it?.availableQuantity ?? it?.quantity);
          const reorder = Number.isFinite(Number(it?.reorderLevel)) ? Math.max(0, Number(it.reorderLevel)) : 15;
          return Number.isFinite(qty) && qty <= reorder;
        });
        if (!cancelled) setLowInventoryAlerts(low);
      } catch {
        if (!cancelled) {
          setInventoryItems([]);
          setLowInventoryAlerts([]);
        }
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
      const qty = Number(it?.availableQuantity ?? it?.quantity);
      const reorder = Number.isFinite(Number(it?.reorderLevel)) ? Math.max(0, Number(it.reorderLevel)) : 15;
      toast.error(`${itemName} is low in stock (available: ${Number.isFinite(qty) ? qty : "N/A"}, reorder level: ${reorder}). Reorder soon.`);
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
  const onMaintenancePage = path.endsWith("/maintenance");
  const onHome = !onInventoryPage && !onRoomsPage && !onStudentsPage && !onIssuedItemsPage && !onMaintenancePage;

  function isNavActive(label) {
    if (label === "Inventory") return onInventoryPage;
    if (label === "Rooms") return onRoomsPage;
    if (label === "Students") return onStudentsPage;
    if (label === "Issued items") return onIssuedItemsPage;
    if (label === "Maintenance") return onMaintenancePage;
    return onHome && homeActiveTab === label;
  }

  function onNavClick(label) {
    if (label === "Inventory") navigate("/warden/inventory");
    else if (label === "Rooms") navigate("/warden/rooms");
    else if (label === "Students") navigate("/warden/students");
    else if (label === "Issued items") navigate("/warden/issued-items");
    else if (label === "Maintenance") navigate("/warden/maintenance");
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
      inventoryItems,
      lowInventoryAlerts,
      now,
    }),
    [homeActiveTab, roomDetails, roomsOverview, roomsLoading, roomsError, inventoryItems, lowInventoryAlerts, now],
  );

  return (
    <div style={s.page}>
      <div style={{ position: "fixed", top: "-160px", left: "-80px", width: "520px", height: "520px", background: T.decoBlob1, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-140px", right: "-100px", width: "560px", height: "560px", background: T.decoBlob2, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "35%", right: "8%", width: "320px", height: "320px", background: T.decoBlob3, pointerEvents: "none", zIndex: 0 }} />

      <aside style={s.aside}>
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "20px", color: "#fff", boxShadow: "0 6px 24px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset", flexShrink: 0 }}>UH</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.03em", color: T.textPrimary }}>UniHostel</div>
              <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.subBrandColor, marginTop: "3px" }}>Warden · Command</div>
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
            const badge = null;
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
                  color: navActive ? T.navActiveText : T.textSecondary,
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
            background: T.headerBarBg,
            borderBottom: `1px solid ${T.headerBarBorder}`,
            boxShadow: mode === "light" ? "0 8px 30px rgba(15,23,42,0.06)" : "0 12px 40px rgba(0,0,0,0.2)",
            backdropFilter: "blur(20px) saturate(150%)",
            position: "relative",
            zIndex: 1300,
            isolation: "isolate",
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
                buttonClassName={
                  mode === "light"
                    ? "!border-slate-200 !bg-white !text-emerald-700 hover:!bg-slate-50"
                    : "!border-emerald-400/30 !bg-slate-900/70 !text-emerald-100 hover:!bg-slate-800"
                }
              />
              <LatePassNotificationBell
                buttonClassName={
                  mode === "light"
                    ? "!border-slate-200 !bg-white !text-indigo-700 hover:!bg-slate-50"
                    : "!border-indigo-400/30 !bg-slate-900/70 !text-indigo-100 hover:!bg-slate-800"
                }
              />
              <ThemeToggle
                className={
                  mode === "light"
                    ? "!border-slate-200 !bg-white !text-amber-600 hover:!bg-slate-50"
                    : "!border-indigo-400/30 !bg-slate-900/70 !text-amber-200 hover:!bg-slate-800"
                }
              />
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

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "transparent",
            position: "relative",
            zIndex: 1,
          }}
        >
          <WardenDashboardProvider value={outletContext}>
            <Routes>
              <Route index element={<WardenDashboardHome />} />
              <Route path="inventory" element={<WardenInventory />} />
              <Route path="rooms" element={<WardenRooms />} />
              <Route path="students" element={<WardenStudents />} />
              <Route path="issued-items" element={<WardenIssuedItems />} />
              <Route path="maintenance" element={<AdminMaintenance />} />
            </Routes>
          </WardenDashboardProvider>
        </div>
      </div>
    </div>
  );
}
