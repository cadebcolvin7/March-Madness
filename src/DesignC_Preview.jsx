import { useState } from "react";

export default function DesignC() {
  const [activeTab, setActiveTab] = useState("scanner");
  const [checked, setChecked] = useState({ s1: true, s2: true, s3: false, s4: true, s5: false, s6: false, s7: true });

  const tierGroups = [
    {
      label: "EFFICIENCY", color: "#2563eb", icon: "📊",
      signals: [
        { id: "s1", label: "KenPom vs Vegas divergence 2+ pts", pts: 2 },
        { id: "s2", label: "T-Rank trending UP vs KenPom (last 40 days)", pts: 2 },
        { id: "s6", label: "AdjDE top 25 vs opponent outside top 50", pts: 1 },
      ],
    },
    {
      label: "MARKET", color: "#7c3aed", icon: "📈",
      signals: [
        { id: "s3", label: "Reverse Line Movement (1+ pt vs 60%+ public)", pts: 2 },
        { id: "s4", label: "Public 60%+ tickets on opponent — fade crowd", pts: 1 },
      ],
    },
    {
      label: "SITUATIONAL", color: "#d97706", icon: "🎯",
      signals: [
        { id: "s5", label: "FADE: Opponent won prior game allowing ≤55 pts", pts: -2 },
        { id: "s7", label: "L10 record 8-2 or better", pts: 1 },
      ],
    },
    {
      label: "COACHING", color: "#dc2626", icon: "🏀",
      signals: [
        { id: "s8", label: "Lame duck / fired coach on OPPONENT", pts: 1 },
      ],
    },
  ];

  const score = Object.entries(checked).reduce((sum, [k, v]) => {
    if (!v) return sum;
    const all = tierGroups.flatMap(g => g.signals);
    const sig = all.find(s => s.id === k);
    return sig ? sum + sig.pts : sum;
  }, 0);

  const conv = score >= 10
    ? { label: "LOCK",  color: "#16a34a", bg: "#f0fdf4", border: "#86efac", pill: "#16a34a" }
    : score >= 7
    ? { label: "EDGE",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d", pill: "#d97706" }
    : score >= 5
    ? { label: "WATCH", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", pill: "#2563eb" }
    : { label: "PASS",  color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", pill: "#64748b" };

  const tabs = ["SCANNER", "LIVE (2)", "PLAY LOG", "NOTES"];

  return (
    <div style={{
      background: "#f1f5f9",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 28px 0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 3, fontWeight: 600 }}>
              ATS EDGE BOT · TOURNAMENT SCANNER
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>
              The Vault 75
            </div>
          </div>

          {/* Record chips */}
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "LOCK",    wl: "3–1", pct: "75%", c: "#16a34a", bg: "#f0fdf4", b: "#bbf7d0" },
              { label: "EDGE",    wl: "2–2", pct: "50%", c: "#d97706", bg: "#fffbeb", b: "#fde68a" },
              { label: "WATCH",   wl: "1–1", pct: "50%", c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
              { label: "OVERALL", wl: "6–4", pct: "60%", c: "#334155", bg: "#f8fafc", b: "#cbd5e1" },
            ].map(t => (
              <div key={t.label} style={{
                textAlign: "center", padding: "8px 14px",
                background: t.bg, borderRadius: 10,
                border: `1px solid ${t.b}`,
              }}>
                <div style={{ fontSize: 8, color: "#475569", letterSpacing: 2, marginBottom: 3, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: t.c, lineHeight: 1 }}>{t.wl}</div>
                <div style={{ fontSize: 10, color: t.c, fontWeight: 600, marginTop: 2 }}>{t.pct}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? "#0f172a" : "transparent",
              border: "none", cursor: "pointer",
              padding: "8px 16px", borderRadius: "8px 8px 0 0",
              fontFamily: "inherit", fontSize: 10,
              letterSpacing: 1, fontWeight: 700,
              color: activeTab === t ? "#fff" : "#475569",
              transition: "all 0.15s",
              borderBottom: activeTab === t ? "none" : "none",
              position: "relative",
            }}>
              {t}
              {t === "LIVE (2)" && (
                <span style={{
                  position: "absolute", top: 7, right: 7,
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#16a34a", boxShadow: "0 0 4px #16a34a",
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, padding: "20px 28px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Game Info Card */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 18px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
              GAME INFO
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                { label: "TEAM A (BET CANDIDATE)", placeholder: "e.g. BYU" },
                { label: "TEAM B (OPPONENT)",      placeholder: "e.g. Kansas St" },
                { label: "TOURNAMENT / CONF",       placeholder: "e.g. Big 12" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 9, color: "#334155", marginBottom: 5, fontWeight: 600, letterSpacing: 0.5 }}>{f.label}</div>
                  <div style={{
                    height: 36, background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 7, display: "flex", alignItems: "center",
                    padding: "0 10px", fontSize: 12, color: "#94a3b8",
                  }}>{f.placeholder}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "SPREAD AT TIP ← LOCKS", val: "-10.5", highlight: true },
                { label: "SPREAD ON TEAM",         val: "BYU ▾" },
                { label: "BET SIDE",               val: "BYU ▾" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 9, color: "#334155", marginBottom: 5, fontWeight: 600 }}>{f.label}</div>
                  <div style={{
                    height: 36, background: f.highlight ? "#fffbeb" : "#f8fafc",
                    border: `1px solid ${f.highlight ? "#fcd34d" : "#e2e8f0"}`,
                    borderRadius: 7, display: "flex", alignItems: "center",
                    padding: "0 10px", fontSize: 13, color: f.highlight ? "#92400e" : "#94a3b8",
                    fontWeight: f.highlight ? 700 : 400,
                  }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal Tier Cards */}
          {tierGroups.map(group => (
            <div key={group.label} style={{
              background: "#fff", borderRadius: 12, padding: "14px 16px",
              border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>{group.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: 2 }}>{group.label}</span>
                <div style={{ flex: 1, height: 1, background: `${group.color}20`, marginLeft: 4 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {group.signals.map(s => {
                  const active = checked[s.id];
                  const neg = s.pts < 0;
                  const checkColor = neg ? "#dc2626" : group.color;
                  return (
                    <div key={s.id} onClick={() => setChecked(c => ({ ...c, [s.id]: !c[s.id] }))} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                      borderRadius: 8, cursor: "pointer",
                      background: active ? (neg ? "#fef2f2" : `${group.color}08`) : "#fafafa",
                      border: `1px solid ${active ? (neg ? "#fca5a5" : group.color + "35") : "#eef2f7"}`,
                      transition: "all 0.12s",
                    }}>
                      <div style={{
                        width: 19, height: 19, borderRadius: 5, flexShrink: 0,
                        background: active ? checkColor : "#fff",
                        border: `1.5px solid ${active ? checkColor : "#cbd5e1"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.12s",
                      }}>
                        {active && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{
                        flex: 1, fontSize: 12.5, lineHeight: 1.4,
                        color: active ? "#0f172a" : "#334155",
                        fontWeight: active ? 500 : 400,
                      }}>{s.label}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: active ? (neg ? "#dc2626" : checkColor) : "#64748b",
                        background: active ? (neg ? "#fee2e2" : `${group.color}15`) : "#f1f5f9",
                        padding: "3px 8px", borderRadius: 5,
                        minWidth: 32, textAlign: "center",
                      }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes card */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: "14px 16px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>GAME NOTES</div>
            <div style={{
              height: 72, background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "#94a3b8",
            }}>
              Line movement, sharp action, injury context...
            </div>
          </div>
        </div>

        {/* Right col — Score Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Score card */}
          <div style={{
            background: conv.bg, border: `1px solid ${conv.border}`,
            borderRadius: 12, padding: "20px 18px",
            boxShadow: `0 4px 24px ${conv.color}18`,
            transition: "all 0.3s",
          }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>
              COMPOSITE SCORE
            </div>
            <div style={{ fontSize: 80, fontWeight: 900, color: conv.color, lineHeight: 1, letterSpacing: -4 }}>
              {score}
            </div>
            {/* Progress bar */}
            <div style={{ height: 7, background: "#e2e8f0", borderRadius: 4, margin: "14px 0 6px" }}>
              <div style={{
                height: "100%", borderRadius: 4, transition: "width 0.3s",
                width: `${Math.max(0, Math.min(100, (score / 22) * 100))}%`,
                background: conv.color,
              }} />
            </div>
            {/* Threshold labels */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#64748b", marginBottom: 14, fontWeight: 600 }}>
              <span>PASS &lt;5</span>
              <span style={{ color: "#2563eb" }}>WATCH</span>
              <span style={{ color: "#d97706" }}>EDGE</span>
              <span style={{ color: "#16a34a" }}>LOCK</span>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 16px", borderRadius: 20,
              background: conv.pill, color: "#fff",
              fontSize: 11, fontWeight: 800, letterSpacing: 3,
              boxShadow: `0 2px 10px ${conv.color}40`,
            }}>
              {conv.label === "LOCK" ? "⚡" : conv.label === "EDGE" ? "✓" : conv.label === "WATCH" ? "◎" : "—"}
              {" "}{conv.label}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#1e293b", lineHeight: 1.7, fontWeight: 500 }}>
              {score >= 10 ? "Full signal stack confirmed. Maximum edge — log it." :
               score >= 7  ? "Solid stack. Confirm RLM or public split before logging." :
               score >= 5  ? "Below bet threshold. Track only — do not bet." :
                             "Insufficient signals. Hard pass."}
            </div>
          </div>

          {/* Log button */}
          <button style={{
            padding: "15px", borderRadius: 10, border: "none",
            background: score >= 5 ? conv.pill : "#e2e8f0",
            color: score >= 5 ? "#fff" : "#475569",
            fontFamily: "inherit", fontSize: 12, fontWeight: 800,
            letterSpacing: 2, cursor: score >= 5 ? "pointer" : "not-allowed",
            boxShadow: score >= 5 ? `0 4px 16px ${conv.color}35` : "none",
            transition: "all 0.2s",
          }}>
            {score >= 10 ? "⚡  LOG LOCK" :
             score >= 7  ? "✓  LOG EDGE PLAY" :
             score >= 5  ? "◎  LOG WATCH" :
                           "SIGNAL SCORE TOO LOW"}
          </button>

          {/* Mini stats card */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: "14px 16px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
              ACTIVE SIGNALS
            </div>
            {tierGroups.flatMap(g => g.signals.filter(s => checked[s.id]).map(s => ({ ...s, color: g.color, tier: g.label }))).map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 0", borderBottom: "1px solid #f1f5f9",
                fontSize: 11,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "#1e293b", fontWeight: 500 }}>{s.label.slice(0, 32)}{s.label.length > 32 ? "…" : ""}</span>
                <span style={{ fontWeight: 700, color: s.pts < 0 ? "#dc2626" : s.color }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
              </div>
            ))}
            {tierGroups.flatMap(g => g.signals.filter(s => checked[s.id])).length === 0 && (
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>No signals active</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
