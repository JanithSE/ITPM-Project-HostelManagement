import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../shared/api/client";
import { useWardenTheme, pillBaseStatic, sanitizeDashboardSearchInput } from "../dashboard/wardenDashboardPrimitives";

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const str = String(v).trim();
    if (str) return str;
  }
  return "";
}

function formatStay(from, to) {
  if (!from && !to) return "—";
  const a = from ? new Date(from) : null;
  const b = to ? new Date(to) : null;
  const okA = a && !Number.isNaN(a.getTime());
  const okB = b && !Number.isNaN(b.getTime());
  if (okA && okB) return `${a.toLocaleDateString()} → ${b.toLocaleDateString()}`;
  if (okA) return `From ${a.toLocaleDateString()}`;
  if (okB) return `To ${b.toLocaleDateString()}`;
  return "—";
}

/**
 * Confirmed bookings for the warden’s assigned hostel, merged with user + booking snapshot fields.
 */
export default function WardenStudents() {
  const { T, s } = useWardenTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const raw = localStorage.getItem("wardenUser");
        const wardenUser = raw ? JSON.parse(raw) : null;
        const assignedHostelName = String(wardenUser?.assignedHostel ?? "").trim();
        if (!assignedHostelName) {
          if (!cancelled) setRows([]);
          return;
        }

        const hostels = await apiFetch("/hostels");
        const hostel = Array.isArray(hostels)
          ? hostels.find((h) => String(h?.name || "").trim().toLowerCase() === assignedHostelName.toLowerCase())
          : null;
        if (!hostel?._id) {
          if (!cancelled) setRows([]);
          return;
        }
        const hostelId = String(hostel._id);

        const [users, bookings] = await Promise.all([apiFetch("/users"), apiFetch("/bookings")]);
        const usersById = new Map((Array.isArray(users) ? users : []).map((u) => [String(u?._id || u?.id || ""), u]));

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

        const list = Array.from(bookingByStudent.entries()).map(([sid, b]) => {
          const fromUsers = sid ? usersById.get(sid) : null;
          const bookingStudent = b?.student && typeof b.student === "object" && !Array.isArray(b.student) ? b.student : {};
          const u = fromUsers && typeof fromUsers === "object" ? fromUsers : bookingStudent;

          const name = u?.name ?? b?.studentName ?? bookingStudent?.name ?? "—";
          const email = u?.email ?? b?.email ?? bookingStudent?.email ?? "—";
          const phone = firstNonEmpty(u?.phoneNumber, b?.contactNumber, bookingStudent?.phoneNumber);
          const gender = firstNonEmpty(u?.gender, b?.gender, bookingStudent?.gender);

          return {
            bookingId: String(b?._id || ""),
            studentId: String(u?._id || u?.id || sid),
            name,
            email,
            phoneNumber: phone || "—",
            gender: gender || "—",
            assignedHostel: firstNonEmpty(u?.assignedHostel, b?.hostel?.name, assignedHostelName),
            roomNumber: b?.roomNumber ?? "—",
            bedNumber: b?.bedNumber ?? "—",
            roomType: b?.roomType ? String(b.roomType) : "—",
            fromDate: b?.fromDate,
            toDate: b?.toDate,
            stayLabel: formatStay(b?.fromDate, b?.toDate),
            instituteName: b?.instituteName ? String(b.instituteName) : "—",
            courseProgram: b?.courseProgram ? String(b.courseProgram) : "—",
            bookingStatus: b?.status ?? "confirmed",
          };
        });

        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ? String(err.message) : "Unable to load students");
          setRows([]);
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
    if (!q) return rows;
    return rows.filter((r) => {
      const fields = [
        r.name,
        r.email,
        r.phoneNumber,
        r.assignedHostel,
        r.roomNumber,
        r.bedNumber,
        r.roomType,
        r.instituteName,
        r.courseProgram,
        r.gender,
        r.bookingId,
        r.studentId,
        r.stayLabel,
      ];
      return fields.filter(Boolean).map((x) => String(x).toLowerCase()).some((v) => v.includes(q));
    });
  }, [rows, search]);

  const warden = useMemo(() => {
    try {
      const raw = localStorage.getItem("wardenUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const hostelLabel = warden?.assignedHostel || "";

  const fieldLabel = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: T.textMuted,
    marginBottom: "6px",
  };

  const fieldValue = {
    fontSize: "14px",
    color: T.textPrimary,
    lineHeight: 1.45,
    wordBreak: "break-word",
  };

  const sectionTitle = {
    fontSize: "12px",
    fontWeight: 800,
    color: "#a5b4fc",
    letterSpacing: "0.04em",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: `1px solid ${T.divider}`,
  };

  return (
    <div
      style={{
        ...s.card,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        border: "1px solid rgba(99, 102, 241, 0.28)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.32), 0 0 0 1px rgba(99, 102, 241, 0.12) inset, 0 0 40px -8px rgba(99, 102, 241, 0.18)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "17px", color: T.textPrimary }}>Students</div>
          <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "4px" }}>
            {loading ? "Loading…" : `${filtered.length} confirmed ${filtered.length === 1 ? "booking" : "bookings"}`}
            {hostelLabel ? ` · ${hostelLabel}` : ""}
          </div>
          <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "8px", maxWidth: "52rem", lineHeight: 1.5 }}>
            Students listed here come from <strong style={{ color: T.textSecondary }}>confirmed</strong> bookings only (one row per student in this hostel).
          </div>
        </div>
        <input
          type="search"
          name="warden-students-filter"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(sanitizeDashboardSearchInput(e.target.value))}
          placeholder="Search by name, room, course…"
          style={{ ...s.input, width: "min(100%, 280px)", minWidth: "200px" }}
        />
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`sk-${idx}`}
              style={{
                ...s.card,
                padding: "18px",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ height: 18, width: "55%", background: T.skelBg, borderRadius: 8 }} />
              <div style={{ height: 12, width: "35%", background: T.skelBg, borderRadius: 6 }} />
              <div style={{ height: 44, width: "100%", background: T.skelBg, borderRadius: 10 }} />
              <div style={{ height: 64, width: "100%", background: T.skelBg, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: "16px", color: "#f87171", fontSize: "14px", borderRadius: "12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
          {error}
        </div>
      ) : !filtered.length ? (
        <div style={{ padding: "24px", textAlign: "center", color: T.textMuted, fontSize: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: `1px dashed ${T.inputBorder}` }}>
          No confirmed bookings for this hostel yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filtered.map((u) => (
            <article
              key={u.bookingId || u.studentId}
              style={{
                ...s.card,
                padding: "18px 18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "0",
                border: `1px solid ${T.accentBorder}`,
                boxShadow: "0 8px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                    {u.name}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                    <span
                      style={{
                        ...pillBaseStatic,
                        background: "rgba(52,211,153,0.12)",
                        border: "1px solid rgba(52,211,153,0.35)",
                        color: "#6ee7b7",
                        fontSize: "12px",
                      }}
                    >
                      {String(u.bookingStatus || "").toLowerCase() === "confirmed" ? "Confirmed" : u.bookingStatus}
                    </span>
                    <span
                      style={{
                        ...pillBaseStatic,
                        background: "rgba(148,163,184,0.12)",
                        border: "1px solid rgba(148,163,184,0.28)",
                        color: T.textSecondary,
                        fontSize: "12px",
                        textTransform: "capitalize",
                      }}
                    >
                      {u.gender}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    ...pillBaseStatic,
                    background: T.accentLight,
                    border: `1px solid ${T.accentBorder}`,
                    color: T.accent,
                    fontSize: "12px",
                    flexShrink: 0,
                    maxWidth: "140px",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={u.assignedHostel}
                >
                  {u.assignedHostel}
                </span>
              </div>

              <div style={sectionTitle}>Contact</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
                <div>
                  <div style={fieldLabel}>Email</div>
                  {u.email?.includes("@") ? (
                    <a href={`mailto:${u.email}`} style={{ ...fieldValue, color: "#93c5fd", textDecoration: "none" }}>
                      {u.email}
                    </a>
                  ) : (
                    <div style={fieldValue}>{u.email}</div>
                  )}
                </div>
                <div>
                  <div style={fieldLabel}>Phone</div>
                  <div style={fieldValue}>{u.phoneNumber}</div>
                </div>
              </div>

              <div style={sectionTitle}>Room & stay</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <div style={fieldLabel}>Room</div>
                  <div style={{ ...fieldValue, fontWeight: 700, fontSize: "16px" }}>{u.roomNumber}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Bed</div>
                  <div style={{ ...fieldValue, fontWeight: 700, fontSize: "16px" }}>{u.bedNumber}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Type</div>
                  <div style={{ ...fieldValue, textTransform: "capitalize" }}>{u.roomType}</div>
                </div>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(129,140,248,0.08)",
                  border: `1px solid rgba(129,140,248,0.2)`,
                  marginBottom: "18px",
                }}
              >
                <div style={{ ...fieldLabel, marginBottom: "4px" }}>Stay period</div>
                <div style={{ ...fieldValue, fontSize: "15px", fontWeight: 600 }}>{u.stayLabel}</div>
              </div>

              <div style={sectionTitle}>Studies</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={fieldLabel}>Course / program</div>
                  <div style={fieldValue}>{u.courseProgram}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Institute</div>
                  <div style={fieldValue}>{u.instituteName}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
