import { useState, useEffect } from "react";

const STORAGE_KEY = "march-madness:plays";
const NOTES_KEY = "march-madness:notes";

const TIER_GROUPS = [
  {
    label: "EFFICIENCY", color: "#2563eb", icon: "📊",
    signals: [
      { id: "s1", label: "KenPom vs Vegas divergence 2+ pts", pts: 2 },
      { id: "s2", label: "T-Rank trending UP vs KenPom (last 40 days)", pts: 2 },
      { id: "s3", label: "AdjDE top 25 vs opponent outside top 50", pts: 1 },
      { id: "s4", label: "Negative KenPom Luck rating (underrated)", pts: 1 },
    ],
  },
  {
    label: "FOUR FACTORS", color: "#0891b2", icon: "🏀",
    signals: [
      { id: "s5", label: "eFG% above 52% vs opponent allowing above 48%", pts: 1 },
      { id: "s6", label: "OR rate above 33% vs weak defensive rebound", pts: 1 },
      { id: "s7", label: "TO rate below 16% vs opponent forcing TOs above 18%", pts: 1 },
      { id: "s8", label: "FTR high + FT% above 75%", pts: 1 },
    ],
  },
  {
    label: "PRIOR GAME (IN-TOURNEY ONLY)", color: "#7c3aed", icon: "🔁",
    signals: [
      { id: "s9",  label: "Scored 88+ in prior tourney game AND now fav 6+", pts: 2 },
      { id: "s10", label: "Won prior tourney game scoring under 60 pts", pts: 2 },
      { id: "s11", label: "Won prior game as upset, held opp to ≤56 pts", pts: 2 },
      { id: "s12", label: "Won prior tourney game but lost spread by 7+", pts: 2 },
    ],
  },
  {
    label: "SITUATIONAL", color: "#d97706", icon: "🎯",
    signals: [
      { id: "s13", label: "Bye team as favorite vs team that already played", pts: 1 },
      { id: "s14", label: "Scored 90+ in prior tourney win, now a favorite", pts: 1 },
      { id: "s15", label: "L10 record 8-2 or better", pts: 1 },
      { id: "s16", label: "Neutral site win% above .600 (regular season)", pts: 1 },
      { id: "s17", label: "Revenge game — faced this team earlier, lost", pts: 1 },
      { id: "s18", label: "FADE: Opponent won prior game allowing ≤55 pts", pts: -2 },
    ],
  },
  {
    label: "MARKET & SHARP MONEY", color: "#7c3aed", icon: "📈",
    signals: [
      { id: "s19", label: "Reverse Line Movement (1+ pt move vs 60%+ public)", pts: 2 },
      { id: "s20", label: "CLV positive — better number than expected close", pts: 2 },
      { id: "s21", label: "Public 60%+ tickets on opponent — fade the crowd", pts: 1 },
      { id: "s22", label: "FADE: Heavy public handle on THIS team (60%+)", pts: -1 },
    ],
  },
  {
    label: "COACHING & ROSTER", color: "#dc2626", icon: "👔",
    signals: [
      { id: "s23", label: "Lame duck / fired coach on OPPONENT", pts: 1 },
      { id: "s24", label: "Senior-heavy rotation (3+ seniors)", pts: 1 },
    ],
  },
  {
    label: "TEMPO", color: "#059669", icon: "⏱",
    signals: [
      { id: "s25", label: "Slow tempo underdog vs fast tempo favorite", pts: 1 },
      { id: "s26", label: "FADE: West coast team tipping before 2 PM ET", pts: -1 },
    ],
  },
];

function getConviction(score) {
  if (score >= 10) return { label: "LOCK",  color: "#16a34a", bg: "#f0fdf4", border: "#86efac" };
  if (score >= 7)  return { label: "EDGE",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" };
  if (score >= 5)  return { label: "WATCH", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" };
  return           { label: "PASS",  color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" };
}

function calcScore(checked) {
  const all = TIER_GROUPS.flatMap(g => g.signals);
  return Object.entries(checked).reduce((sum, [k, v]) => {
    if (!v) return sum;
    const sig = all.find(s => s.id === k);
    return sig ? sum + sig.pts : sum;
  }, 0);
}

function getStats(plays) {
  const tiers = ["LOCK", "EDGE", "WATCH"];
  const result = {};
  tiers.forEach(t => {
    const tp = plays.filter(p => p.conviction === t && p.result);
    result[t] = {
      w: tp.filter(p => p.result === "W").length,
      l: tp.filter(p => p.result === "L").length,
    };
  });
  const all = plays.filter(p => p.result);
  result.ALL = {
    w: all.filter(p => p.result === "W").length,
    l: all.filter(p => p.result === "L").length,
  };
  return result;
}

// ── SCANNER TAB ──────────────────────────────────────────────────────────────
function ScannerTab({ onLog }) {
  const [checked, setChecked] = useState({});
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [spread, setSpread] = useState("");
  const [tourney, setTourney] = useState("");
  const [notes, setNotes] = useState("");

  const score = calcScore(checked);
  const conv = getConviction(score);

  function toggle(id) {
    setChecked(c => ({ ...c, [id]: !c[id] }));
  }

  function handleLog() {
    if (score < 5) return;
    const play = {
      id: Date.now(),
      teamA, teamB, spread: parseFloat(spread) || 0,
      lockedSpread: parseFloat(spread) || 0,
      tourney, notes,
      conviction: conv.label,
      score,
      signals: TIER_GROUPS.flatMap(g => g.signals.filter(s => checked[s.id]).map(s => ({ ...s, color: g.color }))),
      result: null,
      teamAScore: "", teamBScore: "",
      loggedAt: new Date().toISOString(),
    };
    onLog(play);
    setChecked({});
    setTeamA(""); setTeamB(""); setSpread(""); setTourney(""); setNotes("");
  }

  const activeSignals = TIER_GROUPS.flatMap(g =>
    g.signals.filter(s => checked[s.id]).map(s => ({ ...s, color: g.color }))
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, padding: "20px 24px" }}>
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Game Info */}
        <Card>
          <Label>GAME INFO</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { label: "TEAM A (BET CANDIDATE)", val: teamA, set: setTeamA, placeholder: "e.g. BYU" },
              { label: "TEAM B (OPPONENT)", val: teamB, set: setTeamB, placeholder: "e.g. Kansas St" },
              { label: "TOURNAMENT / CONF", val: tourney, set: setTourney, placeholder: "e.g. Big 12" },
            ].map(f => (
              <div key={f.label}>
                <FieldLabel>{f.label}</FieldLabel>
                <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <FieldLabel>SPREAD AT TIP ← LOCKS IN</FieldLabel>
              <Input
                value={spread} onChange={e => setSpread(e.target.value)}
                placeholder="e.g. -10.5"
                style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontWeight: 700 }}
              />
            </div>
            <div>
              <FieldLabel>GAME NOTES</FieldLabel>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Line movement, injury context..." />
            </div>
          </div>
        </Card>

        {/* Signal Tiers */}
        {TIER_GROUPS.map(group => (
          <Card key={group.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>{group.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: 2 }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: `${group.color}20` }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.signals.map(s => {
                const active = !!checked[s.id];
                const neg = s.pts < 0;
                const cc = neg ? "#dc2626" : group.color;
                return (
                  <div key={s.id} onClick={() => toggle(s.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                    borderRadius: 8, cursor: "pointer",
                    background: active ? (neg ? "#fef2f2" : `${group.color}08`) : "#fafafa",
                    border: `1px solid ${active ? (neg ? "#fca5a5" : group.color + "35") : "#eef2f7"}`,
                    transition: "all 0.12s",
                  }}>
                    <div style={{
                      width: 19, height: 19, borderRadius: 5, flexShrink: 0,
                      background: active ? cc : "#fff",
                      border: `1.5px solid ${active ? cc : "#cbd5e1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 12.5, color: active ? "#0f172a" : "#334155", fontWeight: active ? 500 : 400 }}>
                      {s.label}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 5, minWidth: 32, textAlign: "center",
                      color: active ? (neg ? "#dc2626" : cc) : "#64748b",
                      background: active ? (neg ? "#fee2e2" : `${group.color}15`) : "#f1f5f9",
                    }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Right — Score Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          background: conv.bg, border: `1px solid ${conv.border}`,
          borderRadius: 12, padding: "20px 18px",
          boxShadow: `0 4px 24px ${conv.color}18`,
          transition: "all 0.3s",
        }}>
          <div style={{ fontSize: 9, color: "#334155", letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>COMPOSITE SCORE</div>
          <div style={{ fontSize: 80, fontWeight: 900, color: conv.color, lineHeight: 1, letterSpacing: -4 }}>{score}</div>
          <div style={{ height: 7, background: "#e2e8f0", borderRadius: 4, margin: "14px 0 6px" }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.3s",
              width: `${Math.max(0, Math.min(100, (score / 22) * 100))}%`,
              background: conv.color,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#64748b", marginBottom: 14, fontWeight: 600 }}>
            <span>PASS &lt;5</span>
            <span style={{ color: "#2563eb" }}>WATCH</span>
            <span style={{ color: "#d97706" }}>EDGE</span>
            <span style={{ color: "#16a34a" }}>LOCK</span>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 16px", borderRadius: 20,
            background: conv.color, color: "#fff",
            fontSize: 11, fontWeight: 800, letterSpacing: 3,
          }}>
            {conv.label === "LOCK" ? "⚡" : conv.label === "EDGE" ? "✓" : conv.label === "WATCH" ? "◎" : "—"} {conv.label}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#1e293b", lineHeight: 1.7, fontWeight: 500 }}>
            {score >= 10 ? "Full stack confirmed. Max edge." :
             score >= 7  ? "Solid stack. Confirm RLM before logging." :
             score >= 5  ? "Below bet threshold. Track only." :
                           "Insufficient signals. Hard pass."}
          </div>
        </div>

        <button onClick={handleLog} disabled={score < 5} style={{
          padding: "15px", borderRadius: 10, border: "none",
          background: score >= 5 ? conv.color : "#e2e8f0",
          color: score >= 5 ? "#fff" : "#94a3b8",
          fontFamily: "inherit", fontSize: 12, fontWeight: 800,
          letterSpacing: 2, cursor: score >= 5 ? "pointer" : "not-allowed",
          boxShadow: score >= 5 ? `0 4px 16px ${conv.color}35` : "none",
        }}>
          {score >= 10 ? "⚡  LOG LOCK" : score >= 7 ? "✓  LOG EDGE" : score >= 5 ? "◎  LOG WATCH" : "SCORE TOO LOW"}
        </button>

        {/* Active signals */}
        <Card>
          <Label>ACTIVE SIGNALS</Label>
          {activeSignals.length === 0
            ? <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>No signals active</div>
            : activeSignals.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "#1e293b", fontWeight: 500 }}>{s.label.slice(0, 35)}{s.label.length > 35 ? "…" : ""}</span>
                <span style={{ fontWeight: 700, color: s.pts < 0 ? "#dc2626" : s.color }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ── PLAY LOG TAB ─────────────────────────────────────────────────────────────
function PlayLogTab({ plays, onUpdate }) {
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL" ? plays : plays.filter(p => p.conviction === filter);

  function setResult(id, result) {
    onUpdate(plays.map(p => p.id === id ? { ...p, result } : p));
  }

  function setScores(id, field, val) {
    onUpdate(plays.map(p => p.id === id ? { ...p, [field]: val } : p));
  }

  const stats = getStats(plays);

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Tier stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {["LOCK", "EDGE", "WATCH", "ALL"].map(t => {
          const s = stats[t];
          const total = s.w + s.l;
          const pct = total > 0 ? Math.round((s.w / total) * 100) : null;
          const colors = { LOCK: "#16a34a", EDGE: "#d97706", WATCH: "#2563eb", ALL: "#334155" };
          const bgs = { LOCK: "#f0fdf4", EDGE: "#fffbeb", WATCH: "#eff6ff", ALL: "#f8fafc" };
          return (
            <div key={t} onClick={() => setFilter(t)} style={{
              background: filter === t ? colors[t] : bgs[t],
              border: `1px solid ${colors[t]}40`,
              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 9, color: filter === t ? "#fff" : colors[t], letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: filter === t ? "#fff" : colors[t] }}>{s.w}–{s.l}</div>
              <div style={{ fontSize: 11, color: filter === t ? "rgba(255,255,255,0.8)" : "#64748b", fontWeight: 600 }}>
                {pct !== null ? `${pct}%` : "–"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Play cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 13 }}>No plays logged yet.</div>
        )}
        {filtered.slice().reverse().map(play => {
          const conv = getConviction(play.score);
          return (
            <Card key={play.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    {play.teamA || "Team A"} vs {play.teamB || "Team B"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {play.tourney} · Locked: {play.lockedSpread > 0 ? `+${play.lockedSpread}` : play.lockedSpread} · Score: {play.score}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: 2,
                    background: conv.color, color: "#fff",
                  }}>{play.conviction}</span>
                  {play.result && (
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800,
                      background: play.result === "W" ? "#16a34a" : "#dc2626", color: "#fff",
                    }}>{play.result}</span>
                  )}
                </div>
              </div>

              {/* Score entry */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <input
                  value={play.teamAScore} onChange={e => setScores(play.id, "teamAScore", e.target.value)}
                  placeholder={`${play.teamA || "A"} score`}
                  style={{ width: 90, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit" }}
                />
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>–</span>
                <input
                  value={play.teamBScore} onChange={e => setScores(play.id, "teamBScore", e.target.value)}
                  placeholder={`${play.teamB || "B"} score`}
                  style={{ width: 90, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                  {["W", "L", "P"].map(r => (
                    <button key={r} onClick={() => setResult(play.id, r)} style={{
                      padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                      background: play.result === r
                        ? (r === "W" ? "#16a34a" : r === "L" ? "#dc2626" : "#94a3b8")
                        : "#f1f5f9",
                      color: play.result === r ? "#fff" : "#334155",
                    }}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Signal chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {play.signals.map(s => (
                  <span key={s.id} style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: `${s.color}15`, color: s.color, fontWeight: 600,
                  }}>{s.pts > 0 ? `+${s.pts}` : s.pts} {s.label.slice(0, 28)}{s.label.length > 28 ? "…" : ""}</span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── NOTES TAB ────────────────────────────────────────────────────────────────
function NotesTab({ notes, setNotes }) {
  return (
    <div style={{ padding: "20px 24px" }}>
      <Card>
        <Label>RESEARCH NOTES & FRAMEWORK</Label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{
            width: "100%", minHeight: 500, padding: "14px",
            border: "1px solid #e2e8f0", borderRadius: 8,
            fontFamily: "'Courier New', monospace", fontSize: 12,
            lineHeight: 1.7, color: "#1e293b", background: "#fafafa",
            resize: "vertical", boxSizing: "border-box",
          }}
          placeholder="Calibration notes, framework rules, bet journal..."
        />
      </Card>
    </div>
  );
}

// ── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 18px",
      border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      ...style,
    }}>{children}</div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>{children}</div>;
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 9, color: "#334155", marginBottom: 5, fontWeight: 600, letterSpacing: 0.5 }}>{children}</div>;
}

function Input({ value, onChange, placeholder, style = {} }) {
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: "100%", height: 36, padding: "0 10px",
        border: "1px solid #e2e8f0", borderRadius: 7,
        fontSize: 12, fontFamily: "inherit", color: "#0f172a",
        background: "#f8fafc", boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

// ── ROOT APP ─────────────────────────────────────────────────────────────────
export default function MarchMadness() {
  const [tab, setTab] = useState("SCANNER");
  const [plays, setPlays] = useState([]);
  const [notes, setNotes] = useState("CALIBRATION NOTE:\nOver 50-100 plays, LOCK should outperform EDGE.\nLOCK target: 65%+ | EDGE target: 57%+ | WATCH: track only.\n\nTIME ZONE NOTE:\nWest coast teams tipping before 2 PM ET = tiebreaker fade only.\n\nNOTES:\n");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await window.storage.get(STORAGE_KEY);
        if (p) setPlays(JSON.parse(p.value));
      } catch {}
      try {
        const n = await window.storage.get(NOTES_KEY);
        if (n) setNotes(n.value);
      } catch {}
      setLoaded(true);
    }
    if (window.storage) load(); else setLoaded(true);
  }, []);

  async function savePlays(newPlays) {
    setPlays(newPlays);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(newPlays)); } catch {}
  }

  async function saveNotes(val) {
    setNotes(val);
    try { await window.storage.set(NOTES_KEY, val); } catch {}
  }

  function handleLog(play) {
    savePlays([...plays, play]);
    setTab("PLAY LOG");
  }

  const stats = getStats(plays);

  const TABS = ["SCANNER", "PLAY LOG", "NOTES"];

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9" }}>
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, letterSpacing: 2 }}>LOADING…</div>
    </div>
  );

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 24px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 3, fontWeight: 600 }}>ATS EDGE BOT · TOURNAMENT SCANNER</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>March Madness</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "LOCK",    c: "#16a34a", bg: "#f0fdf4", b: "#bbf7d0" },
              { label: "EDGE",    c: "#d97706", bg: "#fffbeb", b: "#fde68a" },
              { label: "WATCH",   c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
              { label: "OVERALL", c: "#334155", bg: "#f8fafc", b: "#cbd5e1" },
            ].map(t => {
              const key = t.label === "OVERALL" ? "ALL" : t.label;
              const s = stats[key];
              const total = s.w + s.l;
              const pct = total > 0 ? Math.round((s.w / total) * 100) + "%" : "–";
              return (
                <div key={t.label} style={{ textAlign: "center", padding: "8px 14px", background: t.bg, borderRadius: 10, border: `1px solid ${t.b}` }}>
                  <div style={{ fontSize: 8, color: "#475569", letterSpacing: 2, marginBottom: 3, fontWeight: 700 }}>{t.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.c, lineHeight: 1 }}>{s.w}–{s.l}</div>
                  <div style={{ fontSize: 10, color: t.c, fontWeight: 600, marginTop: 2 }}>{pct}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#0f172a" : "transparent",
              border: "none", cursor: "pointer",
              padding: "8px 18px", borderRadius: "8px 8px 0 0",
              fontFamily: "inherit", fontSize: 10,
              letterSpacing: 1, fontWeight: 700,
              color: tab === t ? "#fff" : "#475569",
              transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {tab === "SCANNER"  && <ScannerTab onLog={handleLog} />}
      {tab === "PLAY LOG" && <PlayLogTab plays={plays} onUpdate={savePlays} />}
      {tab === "NOTES"    && <NotesTab notes={notes} setNotes={saveNotes} />}
    </div>
  );
}
