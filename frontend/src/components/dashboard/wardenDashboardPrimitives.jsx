import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useTheme } from "../../shared/context/ThemeContext";

/** Search sanitizer: keeps letters, digits, spaces, . - _ ' and @ # */
export function sanitizeDashboardSearchInput(value) {
  const s = String(value ?? "");
  try {
    return s.replace(/[^\p{L}\p{N}\s.\-'_@#]/gu, "");
  } catch {
    return s.replace(/[^a-zA-Z0-9\s.\-'_@#]/g, "");
  }
}

export function getTimeGreeting(d) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const WardenOutletCtx = createContext(null);

export function WardenDashboardProvider({ value, children }) {
  return <WardenOutletCtx.Provider value={value}>{children}</WardenOutletCtx.Provider>;
}

export function useWardenDashboardOutlet() {
  return useContext(WardenOutletCtx);
}

const WARDEN_TOKENS_DARK = {
  pageBg: "#0a0d18",
  pageBgGradient: "linear-gradient(168deg, #0a0d18 0%, #121529 42%, #0c1022 55%, #080b14 100%)",
  sidebarBg: "linear-gradient(180deg, rgba(16,19,36,0.98) 0%, rgba(12,15,28,0.99) 50%, rgba(10,13,24,1) 100%)",
  sidebarBorder: "rgba(129,140,248,0.12)",
  cardBg: "linear-gradient(155deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.025) 100%)",
  cardBgHover: "rgba(255,255,255,0.07)",
  cardBorder: "rgba(129,140,248,0.14)",
  cardRadius: "18px",
  cardShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset",
  textPrimary: "#f0f4ff",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.1)",
  divider: "rgba(255,255,255,0.06)",
  skelBg: "rgba(255,255,255,0.08)",
  accent: "#818cf8",
  accentLight: "rgba(129,140,248,0.12)",
  accentBorder: "rgba(129,140,248,0.25)",
  headerBarBg: "linear-gradient(180deg, rgba(15,18,32,0.95) 0%, rgba(10,13,24,0.88) 100%)",
  headerBarBorder: "rgba(129,140,248,0.15)",
  decoBlob1: "radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 68%)",
  decoBlob2: "radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 68%)",
  decoBlob3: "radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%)",
  asideShadow: "4px 0 32px rgba(0,0,0,0.25)",
  navActiveText: "#c7d2fe",
  subBrandColor: "#818cf8",
};

const WARDEN_TOKENS_LIGHT = {
  pageBg: "#f1f5f9",
  pageBgGradient: "linear-gradient(168deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)",
  sidebarBg: "linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)",
  sidebarBorder: "rgba(99, 102, 241, 0.14)",
  cardBg: "linear-gradient(155deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)",
  cardBgHover: "rgba(15, 23, 42, 0.04)",
  cardBorder: "rgba(99, 102, 241, 0.18)",
  cardRadius: "18px",
  cardShadow: "0 8px 32px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255,255,255,0.9) inset",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  inputBg: "#ffffff",
  inputBorder: "rgba(148, 163, 184, 0.45)",
  divider: "rgba(15, 23, 42, 0.08)",
  skelBg: "rgba(15, 23, 42, 0.08)",
  accent: "#4f46e5",
  accentLight: "rgba(79, 70, 229, 0.1)",
  accentBorder: "rgba(99, 102, 241, 0.28)",
  headerBarBg: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #f1f5f9 100%)",
  headerBarBorder: "rgba(99, 102, 241, 0.12)",
  decoBlob1: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 68%)",
  decoBlob2: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 68%)",
  decoBlob3: "radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)",
  asideShadow: "4px 0 24px rgba(15, 23, 42, 0.06)",
  navActiveText: "#4338ca",
  subBrandColor: "#4f46e5",
};

function buildWardenStyles(T) {
  return {
    page: {
      height: "100dvh",
      width: "100vw",
      display: "flex",
      background: T.pageBgGradient,
      fontFamily: "'DM Sans', 'Manrope', 'Segoe UI', sans-serif",
      color: T.textPrimary,
      overflow: "hidden",
      position: "fixed",
      top: 0,
      left: 0,
    },
    aside: {
      width: "236px",
      flexShrink: 0,
      background: T.sidebarBg,
      borderRight: `1px solid ${T.sidebarBorder}`,
      boxShadow: T.asideShadow,
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
      backdropFilter: "blur(16px) saturate(140%)",
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
}

/**
 * Warden UI is mostly inline-styled. Pass `mode` from ThemeContext so light/dark matches the toggle.
 * @param {'light' | 'dark'} [mode='dark']
 */
export function getWardenTheme(mode = "dark") {
  const T = mode === "light" ? { ...WARDEN_TOKENS_LIGHT } : { ...WARDEN_TOKENS_DARK };
  const s = buildWardenStyles(T);
  return { T, s, mode: mode === "light" ? "light" : "dark" };
}

/** Use this in warden components so ThemeToggle updates colors. */
export function useWardenTheme() {
  const { mode } = useTheme();
  return useMemo(() => getWardenTheme(mode), [mode]);
}

export const wardenNavItems = [
  { label: "Dashboard", icon: "⊞" },
  { label: "Inventory", icon: "▦" },
  { label: "Issued items", icon: "📋" },
  { label: "Students", icon: "◉" },
  { label: "Rooms", icon: "⬡" },
  { label: "Leave", icon: "◫" },
  { label: "Reports", icon: "◰" },
];

export const stats = [
  { label: "Total Students", value: 248, sub: "+4 this week", icon: "🎓", grad: "135deg, #60a5fa, #818cf8", glow: "rgba(99,102,241,0.45)", accent: "#818cf8" },
  { label: "Rooms Occupied", value: "112", sub: "of 120 rooms", icon: "🏠", grad: "135deg, #34d399, #06b6d4", glow: "rgba(16,185,129,0.45)", accent: "#34d399" },
  { label: "Leave Requests", value: 14, sub: "5 pending review", icon: "📋", grad: "135deg, #c084fc, #f472b6", glow: "rgba(192,132,252,0.45)", accent: "#c084fc" },
];

/** Placeholder until leave requests are loaded from the API */
export const leavesSeed = [
  ...Array.from({ length: 9 }, (_, i) => ({ _id: `leave-approved-${i}`, status: "approved" })),
  ...Array.from({ length: 5 }, (_, i) => ({ _id: `leave-pending-${i}`, status: "pending" })),
];

export function Counter({ n }) {
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

export const pillBaseStatic = {
  fontSize: "14px",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: "99px",
  display: "inline-block",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

export function bedPillStyle(status) {
  if (status === "Occupied") return { bg: "rgba(248,113,113,0.15)", color: "#f87171", border: "rgba(248,113,113,0.3)" };
  return { bg: "rgba(52,211,153,0.15)", color: "#34d399", border: "rgba(52,211,153,0.3)" };
}

export function MiniBarChart({ title, data, color = "#818cf8", bg = "rgba(129,140,248,0.16)" }) {
  const list = (Array.isArray(data) ? data : []).filter((d) => {
    const v = Number(d?.value) || 0;
    return v > 0 && String(d?.label ?? "").trim() !== "";
  });
  const max = Math.max(1, ...list.map((d) => Number(d?.value) || 0));
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800, color: "#e2e8f0", marginBottom: "10px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {list.length ? (
          list.map((d) => {
            const v = Number(d?.value) || 0;
            const pct = Math.max(0, Math.min(100, (v / max) * 100));
            return (
              <div key={String(d?.label)}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "3px" }}>
                  <span>{d?.label}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{v}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "999px", background: bg, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${color}, #c084fc)` }} />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ fontSize: "12px", color: "#64748b" }}>No data</div>
        )}
      </div>
    </div>
  );
}

export function MiniPieChart({ title, data, colors = ["#34d399", "#818cf8", "#f59e0b", "#f87171"] }) {
  const list = (Array.isArray(data) ? data : []).map((d, i) => ({ label: d?.label, value: Number(d?.value) || 0, color: colors[i % colors.length] }));
  const total = list.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const gradientParts = list
    .filter((x) => x.value > 0)
    .map((x) => {
      const start = (acc / Math.max(1, total)) * 100;
      acc += x.value;
      const end = (acc / Math.max(1, total)) * 100;
      return `${x.color} ${start}% ${end}%`;
    });
  const pieBg = gradientParts.length ? `conic-gradient(${gradientParts.join(", ")})` : "conic-gradient(#334155 0% 100%)";
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800, color: "#e2e8f0", marginBottom: "10px" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: "12px", alignItems: "center" }}>
        <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: pieBg, border: "1px solid rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {list.length ? (
            list.map((x) => (
              <div key={String(x.label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#94a3b8" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: x.color }} />
                  {x.label}
                </span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{x.value}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "12px", color: "#64748b" }}>No data</div>
          )}
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Total: {total}</div>
        </div>
      </div>
    </div>
  );
}

export const WARDEN_INVENTORY_CHANGED = "warden-inventory-changed";
