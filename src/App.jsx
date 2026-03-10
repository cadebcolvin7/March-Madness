import { useState, useEffect } from "react";

const PLAYS_KEY = "mm:plays_v2";
const TODAY_KEY = new Date().toISOString().slice(0, 10);
const TODAY_LABEL = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const TIERS = {
  LOCK:  { color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  EDGE:  { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  WATCH: { color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  PASS:  { color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
};

const SIGNAL_GROUPS = [
  { id: "efficiency", label: "EFFICIENCY", icon: "📊", color: "#2563eb", signals: [
    { id: "e1", label: "KenPom vs Vegas divergence 2+ pts", pts: 2 },
    { id: "e2", label: "T-Rank trending UP vs KenPom (last 40 days)", pts: 2 },
    { id: "e3", label: "AdjDE top 25 vs opponent outside top 50", pts: 1 },
    { id: "e4", label: "Negative KenPom Luck rating (underrated)", pts: 1 },
  ]},
  { id: "four_factors", label: "FOUR FACTORS", icon: "🏀", color: "#0891b2", signals: [
    { id: "f1", label: "eFG% above 52% vs opponent allowing above 48%", pts: 1 },
    { id: "f2", label: "OR rate above 33% vs weak defensive rebound", pts: 1 },
    { id: "f3", label: "TO rate below 16% vs opponent forcing TOs above 18%", pts: 1 },
    { id: "f4", label: "FTR high + FT% above 75%", pts: 1 },
  ]},
  { id: "prior_game", label: "PRIOR GAME (TOURNEY ONLY)", icon: "🔁", color: "#7c3aed", signals: [
    { id: "p1", label: "Scored 88+ in prior tourney game AND now fav 6+", pts: 2 },
    { id: "p2", label: "Won prior tourney game scoring under 60 pts", pts: 2 },
    { id: "p3", label: "Won prior game as upset, held opp to ≤56 pts", pts: 2 },
    { id: "p4", label: "Won prior tourney game but lost spread by 7+", pts: 2 },
  ]},
  { id: "situational", label: "SITUATIONAL", icon: "🎯", color: "#d97706", signals: [
    { id: "si1", label: "Bye team as favorite vs team that already played", pts: 1 },
    { id: "si2", label: "Scored 90+ in prior tourney win, now a favorite", pts: 1 },
    { id: "si3", label: "L10 record 8-2 or better", pts: 1 },
    { id: "si4", label: "Neutral site win% above .600", pts: 1 },
    { id: "si5", label: "Revenge game — faced this team earlier, lost", pts: 1 },
    { id: "si6", label: "FADE: Opponent won prior game allowing ≤55 pts", pts: -2 },
  ]},
  { id: "market", label: "MARKET & SHARP MONEY", icon: "📈", color: "#7c3aed", signals: [
    { id: "m1", label: "Reverse Line Movement (1+ pt move vs 60%+ public)", pts: 2 },
    { id: "m2", label: "CLV positive — better number than expected close", pts: 2 },
    { id: "m3", label: "Public 60%+ tickets on opponent — fade the crowd", pts: 1 },
    { id: "m4", label: "FADE: Heavy public handle on THIS team (60%+)", pts: -1 },
  ]},
  { id: "coaching", label: "COACHING & ROSTER", icon: "👔", color: "#dc2626", signals: [
    { id: "c1", label: "Lame duck / fired coach on OPPONENT", pts: 1 },
    { id: "c2", label: "Senior-heavy rotation (3+ seniors)", pts: 1 },
  ]},
  { id: "tempo", label: "TEMPO", icon: "⏱", color: "#059669", signals: [
    { id: "t1", label: "Slow tempo underdog vs fast tempo favorite", pts: 1 },
    { id: "t2", label: "FADE: West coast team tipping before 2 PM ET", pts: -1 },
  ]},
];

const ALL_SIGNALS = SIGNAL_GROUPS.flatMap(g => g.signals.map(s => ({ ...s, groupColor: g.color, groupLabel: g.label })));

function getConviction(score) {
  if (score >= 10) return "LOCK";
  if (score >= 7)  return "EDGE";
  if (score >= 5)  return "WATCH";
  return "PASS";
}

function calcScore(checked) {
  return ALL_SIGNALS.reduce((sum, s) => checked[s.id] ? sum + s.pts : sum, 0);
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #e8edf5", boxShadow: "0 1px 5px rgba(0,0,0,0.04)", ...style }}>
    {children}
  </div>
);

const SLabel = ({ children, color = "#475569" }) => (
  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, color, marginBottom: 10 }}>{children}</div>
);

const TierBadge = ({ tier, size = "sm" }) => {
  const t = TIERS[tier] || TIERS.PASS;
  const icons = { LOCK: "⚡", EDGE: "✓", WATCH: "◎", PASS: "—" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "lg" ? "5px 14px" : "3px 9px",
      borderRadius: 20, background: t.color, color: "#fff",
      fontSize: size === "lg" ? 11 : 9, fontWeight: 800, letterSpacing: 1.5,
    }}>{icons[tier]} {tier}</span>
  );
};

// ── PLAY CARD ─────────────────────────────────────────────────────────────────

function PlayCard({ play, onResult, onScore }) {
  const t = TIERS[play.conviction];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={{ borderLeft: `3px solid ${t.color}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              {play.teamA || "Team A"} vs {play.teamB || "Team B"}
            </span>
            {play.result && (
              <span style={{
                padding: "2px 7px", borderRadius: 10, fontSize: 9, fontWeight: 800,
                background: play.result === "W" ? "#16a34a" : play.result === "L" ? "#dc2626" : "#94a3b8",
                color: "#fff",
              }}>{play.result === "P" ? "PUSH" : play.result}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {play.tourney && <span>{play.tourney} · </span>}
            Spread: <strong style={{ color: "#0f172a" }}>{play.spread > 0 ? `+${play.spread}` : play.spread}</strong>
            {" · "}Score: <strong style={{ color: t.color }}>{play.score}</strong>
            {play.notes && <span style={{ color: "#94a3b8" }}> · {play.notes}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 10, flexShrink: 0 }}>
          {["W", "L", "P"].map(r => (
            <button key={r} onClick={() => onResult(play.id, r)} style={{
              width: 30, height: 27, borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 10, fontWeight: 800,
              background: play.result === r ? (r === "W" ? "#16a34a" : r === "L" ? "#dc2626" : "#94a3b8") : "#f1f5f9",
              color: play.result === r ? "#fff" : "#475569",
            }}>{r}</button>
          ))}
          <button onClick={() => setExpanded(e => !e)} style={{
            width: 27, height: 27, borderRadius: 6, border: "none", cursor: "pointer",
            background: expanded ? "#0f172a" : "#f1f5f9", color: expanded ? "#fff" : "#64748b",
            fontSize: 11,
          }}>{expanded ? "▲" : "▼"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 7 }}>
        <input value={play.teamAScore} onChange={e => onScore(play.id, "teamAScore", e.target.value)}
          placeholder={`${(play.teamA || "A").slice(0, 8)} pts`}
          style={{ width: 82, height: 26, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a" }} />
        <span style={{ color: "#94a3b8", fontWeight: 700 }}>–</span>
        <input value={play.teamBScore} onChange={e => onScore(play.id, "teamBScore", e.target.value)}
          placeholder={`${(play.teamB || "B").slice(0, 8)} pts`}
          style={{ width: 82, height: 26, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a" }} />
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
          <SLabel>SIGNALS FIRED</SLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {(play.signals || []).map(s => (
              <span key={s.id} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 5,
                background: `${s.groupColor}12`, color: s.groupColor, fontWeight: 600, border: `1px solid ${s.groupColor}25`,
              }}>{s.pts > 0 ? `+${s.pts}` : s.pts} {s.label.slice(0, 32)}{s.label.length > 32 ? "…" : ""}</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── SCANNER TAB ───────────────────────────────────────────────────────────────

function ScannerTab({ onAddPlay }) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [tourney, setTourney] = useState("");
  const [spread, setSpread] = useState("");
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState({});

  const score = calcScore(checked);
  const conviction = getConviction(score);
  const tier = TIERS[conviction];
  const activeSignals = ALL_SIGNALS.filter(s => checked[s.id]);

  function toggle(id) { setChecked(c => ({ ...c, [id]: !c[id] })); }

  function handleLog() {
    if (score < 5) return;
    onAddPlay({
      id: Date.now(),
      date: TODAY_KEY,
      dateLabel: TODAY_LABEL,
      teamA, teamB, tourney,
      spread: parseFloat(spread) || 0,
      notes, score, conviction,
      signals: activeSignals,
      result: null,
      teamAScore: "", teamBScore: "",
    });
    setChecked({}); setTeamA(""); setTeamB(""); setSpread(""); setTourney(""); setNotes("");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 285px", gap: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Game Info */}
        <Card>
          <SLabel>GAME INFO</SLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { label: "TEAM A (BET CANDIDATE)", val: teamA, set: setTeamA, ph: "e.g. BYU" },
              { label: "TEAM B (OPPONENT)",      val: teamB, set: setTeamB, ph: "e.g. Kansas St" },
              { label: "TOURNAMENT / CONF",       val: tourney, set: setTourney, ph: "e.g. Big 12" },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", height: 33, padding: "0 9px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>SPREAD AT TIP</div>
              <input value={spread} onChange={e => setSpread(e.target.value)} placeholder="-10.5"
                style={{ width: "100%", height: 33, padding: "0 9px", border: "1px solid #fcd34d", borderRadius: 7, fontSize: 12, fontFamily: "inherit", color: "#92400e", fontWeight: 700, background: "#fffbeb", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>NOTES</div>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Line movement, injury context..."
                style={{ width: "100%", height: 33, padding: "0 9px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", boxSizing: "border-box" }} />
            </div>
          </div>
        </Card>

        {SIGNAL_GROUPS.map(group => (
          <Card key={group.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>{group.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: group.color, letterSpacing: 2 }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: `${group.color}25` }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {group.signals.map(s => {
                const active = !!checked[s.id];
                const neg = s.pts < 0;
                const cc = neg ? "#dc2626" : group.color;
                return (
                  <div key={s.id} onClick={() => toggle(s.id)} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, cursor: "pointer",
                    background: active ? (neg ? "#fef2f2" : `${group.color}08`) : "#fafafa",
                    border: `1px solid ${active ? (neg ? "#fca5a5" : group.color + "40") : "#eef2f7"}`,
                    transition: "all 0.1s",
                  }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: 4, flexShrink: 0,
                      background: active ? cc : "#fff", border: `1.5px solid ${active ? cc : "#cbd5e1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <span style={{ fontSize: 10, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: active ? "#0f172a" : "#334155", fontWeight: active ? 500 : 400 }}>{s.label}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, minWidth: 28, textAlign: "center",
                      color: active ? (neg ? "#dc2626" : cc) : "#94a3b8",
                      background: active ? (neg ? "#fee2e2" : `${group.color}15`) : "#f1f5f9",
                    }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 75, alignSelf: "flex-start" }}>
        <div style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 12, padding: "18px 16px", boxShadow: `0 4px 20px ${tier.color}18`, transition: "all 0.3s" }}>
          <SLabel>COMPOSITE SCORE</SLabel>
          <div style={{ fontSize: 78, fontWeight: 900, color: tier.color, lineHeight: 1, letterSpacing: -3 }}>{score}</div>
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, margin: "12px 0 5px" }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(0, Math.min(100, (score / 22) * 100))}%`, background: tier.color, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#94a3b8", fontWeight: 700, marginBottom: 12 }}>
            <span>PASS</span><span style={{ color: "#2563eb" }}>WATCH</span><span style={{ color: "#d97706" }}>EDGE</span><span style={{ color: "#16a34a" }}>LOCK</span>
          </div>
          <TierBadge tier={conviction} size="lg" />
          <div style={{ marginTop: 10, fontSize: 12, color: "#1e293b", lineHeight: 1.6, fontWeight: 500 }}>
            {conviction === "LOCK"  ? "Full stack confirmed. Max edge." :
             conviction === "EDGE"  ? "Solid stack. Confirm RLM before logging." :
             conviction === "WATCH" ? "Below bet threshold. Track only." :
                                      "Insufficient signals. Hard pass."}
          </div>
        </div>

        <button onClick={handleLog} disabled={score < 5} style={{
          padding: "13px", borderRadius: 10, border: "none",
          background: score >= 5 ? tier.color : "#e2e8f0",
          color: score >= 5 ? "#fff" : "#94a3b8",
          fontFamily: "inherit", fontSize: 11, fontWeight: 800, letterSpacing: 2,
          cursor: score >= 5 ? "pointer" : "not-allowed",
          boxShadow: score >= 5 ? `0 4px 16px ${tier.color}40` : "none",
        }}>
          {score >= 10 ? "⚡  LOG LOCK" : score >= 7 ? "✓  LOG EDGE" : score >= 5 ? "◎  LOG WATCH" : "SCORE TOO LOW"}
        </button>

        {activeSignals.length > 0 && (
          <Card>
            <SLabel>ACTIVE SIGNALS</SLabel>
            {activeSignals.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0", borderBottom: "1px solid #f8fafc", fontSize: 11 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.groupColor, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "#1e293b", fontWeight: 500 }}>{s.label.length > 33 ? s.label.slice(0, 33) + "…" : s.label}</span>
                <span style={{ fontWeight: 700, color: s.pts < 0 ? "#dc2626" : s.groupColor }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ── TODAY'S PLAYS TAB ─────────────────────────────────────────────────────────

function TodayTab({ plays, onUpdate }) {
  const todayPlays = plays.filter(p => p.date === TODAY_KEY);
  const tierOrder = ["LOCK", "EDGE", "WATCH"];
  const grouped = tierOrder.map(t => ({ tier: t, plays: todayPlays.filter(p => p.conviction === t) })).filter(g => g.plays.length > 0);

  function setResult(id, result) { onUpdate(plays.map(p => p.id === id ? { ...p, result } : p)); }
  function setScore(id, field, val) { onUpdate(plays.map(p => p.id === id ? { ...p, [field]: val } : p)); }

  if (todayPlays.length === 0) {
    return (
      <div style={{ padding: "70px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>No plays logged today</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>Use the Scanner tab to evaluate games and log plays</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 18, letterSpacing: 0.3 }}>
        {TODAY_LABEL} · {todayPlays.length} play{todayPlays.length !== 1 ? "s" : ""} logged
      </div>
      {grouped.map(({ tier, plays: tPlays }) => {
        const t = TIERS[tier];
        return (
          <div key={tier} style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <TierBadge tier={tier} />
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <span style={{ fontSize: 10, color: t.color, fontWeight: 700 }}>{tPlays.length} play{tPlays.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tPlays.map(play => <PlayCard key={play.id} play={play} onResult={setResult} onScore={setScore} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────────

function HistoryTab({ plays, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);

  const byDate = {};
  plays.forEach(p => {
    if (!byDate[p.date]) byDate[p.date] = { label: p.dateLabel || p.date, plays: [] };
    byDate[p.date].plays.push(p);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  function setResult(id, result) { onUpdate(plays.map(p => p.id === id ? { ...p, result } : p)); }
  function setScore(id, field, val) { onUpdate(plays.map(p => p.id === id ? { ...p, [field]: val } : p)); }

  function dayStats(dPlays) {
    const graded = dPlays.filter(p => p.result && p.result !== "P");
    const w = graded.filter(p => p.result === "W").length;
    return { w, l: graded.length - w, total: dPlays.length };
  }

  if (plays.length === 0) {
    return (
      <div style={{ padding: "70px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>📅</div>
        <div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>No play history yet</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>Log plays from the Scanner to build your history</div>
      </div>
    );
  }

  const dayPlays = byDate[selectedDate]?.plays || [];
  const tierOrder = ["LOCK", "EDGE", "WATCH"];
  const grouped = tierOrder.map(t => ({ tier: t, plays: dayPlays.filter(p => p.conviction === t) })).filter(g => g.plays.length > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 14, padding: "18px 20px" }}>
      {/* Date sidebar */}
      <div>
        <SLabel>DATES</SLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {dates.map(d => {
            const s = dayStats(byDate[d].plays);
            const active = selectedDate === d;
            const isToday = d === TODAY_KEY;
            return (
              <div key={d} onClick={() => setSelectedDate(d)} style={{
                padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                background: active ? "#0f172a" : "#fff",
                border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
                transition: "all 0.12s",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "#0f172a", marginBottom: 2 }}>
                  {isToday ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: 10, color: active ? "#94a3b8" : "#64748b" }}>
                  {s.total} play{s.total !== 1 ? "s" : ""} · {s.w}–{s.l}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div>
        {selectedDate && byDate[selectedDate] && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                {selectedDate === TODAY_KEY ? "Today — " + TODAY_LABEL : byDate[selectedDate].label}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {tierOrder.map(t => {
                  const tp = dayPlays.filter(p => p.conviction === t);
                  if (tp.length === 0) return null;
                  const graded = tp.filter(p => p.result && p.result !== "P");
                  const w = graded.filter(p => p.result === "W").length;
                  const pct = graded.length > 0 ? Math.round((w / graded.length) * 100) : null;
                  const tier = TIERS[t];
                  return (
                    <div key={t} style={{ padding: "7px 12px", borderRadius: 8, background: tier.bg, border: `1px solid ${tier.border}` }}>
                      <div style={{ fontSize: 8, color: tier.color, fontWeight: 800, letterSpacing: 1.5 }}>{t}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: tier.color }}>{w}–{graded.length - w}</div>
                      {pct !== null && <div style={{ fontSize: 9, color: tier.color, fontWeight: 600 }}>{pct}%</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {grouped.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "30px 0" }}>No qualifying plays this day.</div>}

            {grouped.map(({ tier, plays: tPlays }) => {
              const t = TIERS[tier];
              return (
                <div key={tier} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <TierBadge tier={tier} />
                    <div style={{ flex: 1, height: 1, background: t.border }} />
                    <span style={{ fontSize: 9, color: t.color, fontWeight: 700 }}>{tPlays.length} play{tPlays.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {tPlays.map(play => <PlayCard key={play.id} play={play} onResult={setResult} onScore={setScore} />)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────

function StatsTab({ plays }) {
  const graded = plays.filter(p => p.result && p.result !== "P");

  function tierStats(tier) {
    const tp = tier === "ALL" ? graded : graded.filter(p => p.conviction === tier);
    const w = tp.filter(p => p.result === "W").length;
    return { w, l: tp.length - w, pct: tp.length > 0 ? Math.round((w / tp.length) * 100) : null };
  }

  const sigStats = {};
  plays.forEach(play => {
    if (!play.result || play.result === "P") return;
    (play.signals || []).forEach(s => {
      if (!sigStats[s.id]) sigStats[s.id] = { label: s.label, color: s.groupColor, w: 0, l: 0 };
      if (play.result === "W") sigStats[s.id].w++; else sigStats[s.id].l++;
    });
  });
  const sigArr = Object.entries(sigStats)
    .map(([id, v]) => ({ id, ...v, total: v.w + v.l, pct: Math.round((v.w / (v.w + v.l)) * 100) }))
    .filter(s => s.total >= 2)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {["LOCK", "EDGE", "WATCH", "ALL"].map(t => {
          const s = tierStats(t);
          const tier = TIERS[t] || TIERS.PASS;
          return (
            <Card key={t} style={{ textAlign: "center", background: tier.bg, border: `1px solid ${tier.border}` }}>
              <div style={{ fontSize: 8, color: tier.color, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: tier.color, lineHeight: 1 }}>{s.w}–{s.l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: tier.color, marginTop: 2 }}>{s.pct !== null ? `${s.pct}%` : "–"}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{s.w + s.l} graded</div>
            </Card>
          );
        })}
      </div>

      {sigArr.length > 0 && (
        <Card>
          <SLabel>SIGNAL PERFORMANCE (min 2 plays)</SLabel>
          {sigArr.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, color: "#1e293b", fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: "#64748b", minWidth: 38, textAlign: "right" }}>{s.w}–{s.l}</span>
              <div style={{ minWidth: 55 }}>
                <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${s.pct}%`, background: s.pct >= 60 ? "#16a34a" : s.pct >= 50 ? "#d97706" : "#dc2626" }} />
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.pct >= 60 ? "#16a34a" : s.pct >= 50 ? "#d97706" : "#dc2626", minWidth: 32, textAlign: "right" }}>{s.pct}%</span>
            </div>
          ))}
        </Card>
      )}

      {graded.length === 0 && (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "50px 0", fontSize: 12 }}>
          Grade plays in Today or History tabs to see stats here.
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "SCANNER", label: "SCANNER" },
  { id: "TODAY",   label: "TODAY'S PLAYS" },
  { id: "HISTORY", label: "HISTORY" },
  { id: "STATS",   label: "STATS" },
];

export default function MarchMadness() {
  const [tab, setTab] = useState("SCANNER");
  const [plays, setPlays] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await window.storage?.get(PLAYS_KEY);
        if (p?.value) setPlays(JSON.parse(p.value));
      } catch {}
      setLoaded(true);
    }
    load();
  }, []);

  async function savePlays(next) {
    setPlays(next);
    try { await window.storage?.set(PLAYS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleAddPlay(play) {
    savePlays([...plays, play]);
    setTab("TODAY");
  }

  const graded = plays.filter(p => p.result && p.result !== "P");
  function hs(tier) {
    const tp = tier === "ALL" ? graded : graded.filter(p => p.conviction === tier);
    const w = tp.filter(p => p.result === "W").length;
    return { w, l: tp.length - w, pct: tp.length > 0 ? Math.round((w / tp.length) * 100) : null };
  }
  const todayCount = plays.filter(p => p.date === TODAY_KEY).length;

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 3 }}>LOADING…</div>
    </div>
  );

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 20px 0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2.5, marginBottom: 2, fontWeight: 700 }}>ATS EDGE BOT · TOURNAMENT SCANNER</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>March Madness</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "LOCK",    key: "LOCK",  c: "#16a34a", bg: "#f0fdf4", b: "#bbf7d0" },
              { label: "EDGE",    key: "EDGE",  c: "#d97706", bg: "#fffbeb", b: "#fde68a" },
              { label: "WATCH",   key: "WATCH", c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
              { label: "OVERALL", key: "ALL",   c: "#334155", bg: "#f8fafc", b: "#cbd5e1" },
            ].map(({ label, key, c, bg, b }) => {
              const s = hs(key);
              return (
                <div key={label} style={{ textAlign: "center", padding: "6px 12px", background: bg, borderRadius: 8, border: `1px solid ${b}` }}>
                  <div style={{ fontSize: 7.5, color: "#64748b", letterSpacing: 2, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: c }}>{s.w}–{s.l}</div>
                  <div style={{ fontSize: 9, color: c, fontWeight: 600 }}>{s.pct !== null ? `${s.pct}%` : "–"}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#0f172a" : "transparent",
              border: "none", cursor: "pointer",
              padding: "7px 16px", borderRadius: "7px 7px 0 0",
              fontFamily: "inherit", fontSize: 9, letterSpacing: 1.5, fontWeight: 800,
              color: tab === t.id ? "#fff" : "#64748b",
              transition: "all 0.12s", position: "relative",
            }}>
              {t.label}
              {t.id === "TODAY" && todayCount > 0 && (
                <span style={{
                  position: "absolute", top: 3, right: 5,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#2563eb", color: "#fff",
                  fontSize: 8, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{todayCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "SCANNER" && <ScannerTab onAddPlay={handleAddPlay} />}
      {tab === "TODAY"   && <TodayTab   plays={plays} onUpdate={savePlays} />}
      {tab === "HISTORY" && <HistoryTab plays={plays} onUpdate={savePlays} />}
      {tab === "STATS"   && <StatsTab   plays={plays} />}
    </div>
  );
}
