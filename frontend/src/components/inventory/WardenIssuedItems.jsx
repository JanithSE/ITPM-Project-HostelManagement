import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../shared/api/client";
import { useWardenTheme, pillBaseStatic, sanitizeDashboardSearchInput } from "../dashboard/wardenDashboardPrimitives";

function formatDt(v) {
  if (v == null) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDateOnly(v) {
  if (v == null) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Issued inventory log: when issued, room/bed, what was issued, expected return from booking stay end.
 */
export default function WardenIssuedItems() {
  const { T, s } = useWardenTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch("/issued-items");
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ? String(err.message) : "Unable to load issued items");
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((rec) => {
      const b = rec?.booking || {};
      const st = rec?.student || {};
      const hostelName = rec?.hostel?.name || rec?.hostelName || "";
      const lines = (rec?.items || []).map((it) => `${it?.name || ""} ${it?.category || ""}`).join(" ");
      const hay = [
        rec?.studentName,
        st?.name,
        st?.email,
        rec?.roomNumber,
        rec?.bedNumber,
        hostelName,
        b?.roomNumber,
        b?.bedNumber,
        lines,
        formatDt(rec?.issuedAt),
        formatDateOnly(b?.toDate),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

  /** Distinct from Students page: warm amber + teal (inventory / logistics) vs indigo (people). */
  const sectionTitle = {
    fontSize: "12px",
    fontWeight: 800,
    color: "#fbbf24",
    letterSpacing: "0.04em",
    marginBottom: "10px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(245, 158, 11, 0.22)",
  };
  const cardChrome = {
    border: "1px solid rgba(245, 158, 11, 0.28)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.2), 0 0 0 1px rgba(245, 158, 11, 0.1) inset, 0 0 32px -10px rgba(245, 158, 11, 0.15)",
  };
  const hostelPill = {
    ...pillBaseStatic,
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    color: "#fbbf24",
    fontSize: "11px",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        ...s.card,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        ...cardChrome,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "17px",
              color: T.textPrimary,
              display: "inline-block",
              paddingBottom: "6px",
              borderBottom: "2px solid rgba(245, 158, 11, 0.55)",
            }}
          >
            Issued inventory
          </div>
          <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "4px" }}>
            {loading ? "Loading…" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
          </div>
          <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "8px", maxWidth: "48rem", lineHeight: 1.5 }}>
            When items were issued to a confirmed booking, room, and bed. <strong style={{ color: T.textSecondary }}>Expected return</strong> uses the booking&apos;s end date (checkout); update the booking if dates change.
          </div>
        </div>
        <input
          type="search"
          name="warden-issued-filter"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(sanitizeDashboardSearchInput(e.target.value))}
          placeholder="Search student, room, item…"
          style={{ ...s.input, width: "min(100%, 260px)", minWidth: "180px" }}
        />
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={`sk-${idx}`} style={{ ...s.card, padding: "18px", minHeight: "200px" }}>
              <div style={{ height: 16, width: "60%", background: T.skelBg, borderRadius: 8, marginBottom: "12px" }} />
              <div style={{ height: 80, width: "100%", background: T.skelBg, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: "16px", color: "#f87171", fontSize: "14px", borderRadius: "12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>{error}</div>
      ) : !filtered.length ? (
        <div style={{ padding: "24px", textAlign: "center", color: T.textMuted, fontSize: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: `1px dashed ${T.inputBorder}` }}>
          No issued inventory for this hostel yet. Items appear here after a booking is confirmed and stock is issued.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filtered.map((rec) => {
            const b = rec?.booking || {};
            const toDate = b?.toDate;
            const fromDate = b?.fromDate;
            const expectedReturnLabel = formatDateOnly(toDate);
            const stayLabel =
              fromDate || toDate ? `${formatDateOnly(fromDate)} → ${formatDateOnly(toDate)}` : "—";

            return (
              <article
                key={String(rec?._id || rec?.booking)}
                style={{
                  ...s.card,
                  padding: "18px",
                  border: "1px solid rgba(245, 158, 11, 0.22)",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 0 24px -8px rgba(245, 158, 11, 0.12)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em" }}>{rec?.studentName || "—"}</div>
                    <div style={{ fontSize: "13px", color: T.textSecondary, marginTop: "4px" }}>{rec?.student?.email || "—"}</div>
                  </div>
                  <span style={hostelPill} title={String(rec?.hostel?.name || rec?.hostelName || "Hostel")}>
                    {rec?.hostel?.name || rec?.hostelName || "Hostel"}
                  </span>
                </div>

                <div style={sectionTitle}>Issue & room</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Issued at</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: T.textPrimary }}>{formatDt(rec?.issuedAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Room / bed</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: T.textPrimary }}>
                      Room {rec?.roomNumber ?? "—"} · Bed {rec?.bedNumber ?? "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(45, 212, 191, 0.08)",
                    border: "1px solid rgba(45, 212, 191, 0.28)",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Expected return (booking end)</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#2dd4bf" }}>{expectedReturnLabel}</div>
                  <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "6px" }}>Stay: {stayLabel}</div>
                </div>

                <div style={sectionTitle}>Items issued</div>
                <ul style={{ margin: 0, paddingLeft: "18px", color: T.textSecondary, fontSize: "13px", lineHeight: 1.55 }}>
                  {(rec?.items || []).length ? (
                    rec.items.map((it, i) => (
                      <li key={`${it?.category}-${i}`}>
                        <strong style={{ color: T.textPrimary }}>{it?.name || it?.category || "Item"}</strong>
                        {it?.category && it?.name !== it?.category ? ` · ${it.category}` : ""} — qty {it?.quantity ?? "—"}
                      </li>
                    ))
                  ) : (
                    <li style={{ listStyle: "none", marginLeft: "-18px", color: T.textMuted }}>No line items recorded (metadata only).</li>
                  )}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
