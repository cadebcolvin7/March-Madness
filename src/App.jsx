import { useState, useEffect } from "react";

const SUPABASE_URL = "https://nahbainbjczyriboloat.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5haGJhaW5iamN6eXJpYm9sb2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjEwNDMsImV4cCI6MjA4Nzc5NzA0M30.6HrxN4j6TurectEI0J1fFzT_6xK4prEGN57GBn4HvpU";
const HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
const ODDS_API_KEY = "8b09f2b164aab018d3076125307c817c";
const ODDS_BASE = "https://api.the-odds-api.com/v4";

async function dbLoadPlays() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mm_plays?order=logged_at.asc`, { headers: HEADERS });
  const rows = await res.json();
  return rows.map(r => ({
    id: r.id, date: r.date, dateLabel: r.date_label,
    teamA: r.team_a, teamB: r.team_b, tourney: r.tourney,
    spread: r.spread, notes: r.notes, score: r.score,
    conviction: r.conviction, signals: r.signals || [],
    result: r.result, teamAScore: r.team_a_score || "", teamBScore: r.team_b_score || "",
    mode: r.mode || "ncaa",
  }));
}
async function dbInsertPlay(play) {
  await fetch(`${SUPABASE_URL}/rest/v1/mm_plays`, {
    method: "POST",
    headers: { ...HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify({
      id: play.id, date: play.date, date_label: play.dateLabel,
      team_a: play.teamA, team_b: play.teamB, tourney: play.tourney,
      spread: play.spread, notes: play.notes, score: play.score,
      conviction: play.conviction, signals: play.signals,
      result: play.result, team_a_score: play.teamAScore, team_b_score: play.teamBScore,
      mode: play.mode, logged_at: new Date().toISOString(),
    }),
  });
}
async function dbUpdatePlay(play) {
  await fetch(`${SUPABASE_URL}/rest/v1/mm_plays?id=eq.${play.id}`, {
    method: "PATCH",
    headers: { ...HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify({ result: play.result, team_a_score: play.teamAScore, team_b_score: play.teamBScore }),
  });
}

async function fetchOddsGames() {
  try {
    const res = await fetch(`${ODDS_BASE}/sports/basketball_ncaab/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch (e) { console.error("Odds API error:", e); return []; }
}

function parseOddsGame(game) {
  const home = game.home_team;
  const away = game.away_team;
  let homeSpread = null;
  for (const bk of (game.bookmakers || [])) {
    const spreadMkt = bk.markets?.find(m => m.key === "spreads");
    if (spreadMkt && homeSpread === null) {
      const homeOut = spreadMkt.outcomes?.find(o => o.name === home);
      if (homeOut) homeSpread = homeOut.point;
    }
  }
  const gameTime = new Date(game.commence_time);
  const diffH = (gameTime - new Date()) / 3600000;
  return { id: game.id, teamA: home, teamB: away, spread: homeSpread, gameTime, diffH, isToday: diffH > -3 && diffH < 24 };
}

const TODAY_KEY = new Date().toISOString().slice(0, 10);
const TODAY_LABEL = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const TIERS = {
  LOCK:  { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "⚡" },
  EDGE:  { color: "#d97706", bg: "#fffbeb", border: "#fcd34d", icon: "✓" },
  WATCH: { color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", icon: "◎" },
  PASS:  { color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", icon: "—" },
};

const UNIVERSAL_SIGNALS = [
  { id: "u_rlm",     label: "Reverse Line Movement (line moves vs 60%+ public)",  pts: 3,  group: "MARKET",      color: "#7c3aed" },
  { id: "u_fade65",  label: "Opponent getting 65%+ public tickets — fade crowd",   pts: 2,  group: "MARKET",      color: "#7c3aed" },
  { id: "u_linemov", label: "Line moved 1.5+ pts off opener (sharp action)",       pts: 2,  group: "MARKET",      color: "#7c3aed" },
  { id: "u_heavy",   label: "FADE: Heavy public handle on THIS team (60%+)",      pts: -1,  group: "MARKET",      color: "#7c3aed" },
  { id: "u_90win",   label: "Prior tourney win scoring 90+ pts, now a favorite",  pts: 3,  group: "PRIOR GAME",  color: "#0891b2" },
  { id: "u_fade55",  label: "FADE: Opponent won prior game allowing ≤55 pts",     pts: -3,  group: "PRIOR GAME",  color: "#0891b2" },
  { id: "u_bye",     label: "Favorite off bye vs team that already played",        pts: 2,  group: "SITUATIONAL", color: "#d97706" },
  { id: "u_l10",     label: "L10 record 8-2 or better",                           pts: 1,  group: "SITUATIONAL", color: "#d97706" },
  { id: "u_kenpom",  label: "KenPom vs Vegas divergence 2+ pts",                  pts: 2,  group: "EFFICIENCY",  color: "#2563eb" },
  { id: "u_trank",   label: "T-Rank trending UP vs KenPom (last 40 days)",         pts: 2,  group: "EFFICIENCY",  color: "#2563eb" },
  { id: "u_adjde",   label: "AdjDE top 25 vs opponent outside top 50",            pts: 1,  group: "EFFICIENCY",  color: "#2563eb" },
  { id: "u_slow",    label: "Slow tempo underdog vs fast tempo favorite",          pts: 1,  group: "TEMPO",       color: "#059669" },
  { id: "u_west",    label: "FADE: West coast team tipping before 2PM ET",        pts: -1,  group: "TEMPO",       color: "#059669" },
  { id: "u_senior",  label: "Senior-heavy rotation (3+ seniors in key roles)",    pts: 1,  group: "ROSTER",      color: "#dc2626" },
];

const CONF_SIGNALS = [
  { id: "c_acc_semi_dog", label: "ACC semifinal underdog (78.1% ATS since 2007)",        pts: 4,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_b12_r1_dog",   label: "Big 12 opening round underdog (80.9% ATS surge)",       pts: 4,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_b12_semi_fav", label: "Big 12 semifinal favorite (72.7% ATS since 2013)",      pts: 3,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_a10_r1_dog",   label: "A-10 first round underdog (71.4% ATS since 2015)",      pts: 3,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_a10_qf_fav",   label: "A-10 QF/SF favorite (70.8% ATS since 2014)",           pts: 3,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_acc_bye_fav",  label: "ACC fav 4+ pts off bye vs team that played (60.9%)",   pts: 2,  group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_aac_r1_fade",  label: "FADE: AAC opening round single-digit fav (36.4%)",     pts: -3, group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_b12_mid_fade", label: "FADE: Big 12 mid-level fav -4 to -9.5 (43.5% ATS)",   pts: -2, group: "CONF TRENDS", color: "#7c3aed" },
  { id: "c_revenge",      label: "Revenge game — lost to this team in regular season",   pts: 1,  group: "SITUATIONAL",  color: "#d97706" },
  { id: "c_lame_duck",    label: "Opponent coach fired / lame duck situation",            pts: 1,  group: "COACHING",     color: "#dc2626" },
];

const NCAA_SIGNALS = [
  { id: "n_dd_sweet16",  label: "Double-digit seed dog in Sweet 16+ (69.6% since 2011)", pts: 3,  group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_11_14_power", label: "Power conf team seeded 11-14 (64.6% since 2008)",        pts: 3,  group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_r64_dog",     label: "Round of 64 underdog (54.2% ATS since 2015)",            pts: 2,  group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_bet_seed",    label: "Better-seeded team as dog/pick-em in Sweet 16 (75%)",    pts: 2,  group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_mid_major",   label: "Mid-major slow pace vs untested power team",             pts: 1,  group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_fade_2seed",  label: "FADE: 2-seed favorite (historically 43% ATS)",          pts: -2, group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_fade_89",     label: "FADE: 8-seed as small fav over 9-seed (22.7% ATS)",     pts: -3, group: "NCAA TRENDS", color: "#16a34a" },
  { id: "n_prior_88",    label: "Scored 88+ in prior tourney game AND now fav 6+",       pts: 2,  group: "PRIOR GAME",  color: "#0891b2" },
  { id: "n_prior_60",    label: "Won prior tourney game scoring under 60 pts",            pts: 2,  group: "PRIOR GAME",  color: "#0891b2" },
  { id: "n_prior_upset", label: "Won prior game as upset, held opponent to ≤56 pts",     pts: 2,  group: "PRIOR GAME",  color: "#0891b2" },
  { id: "n_lame_duck",   label: "Opponent coach fired / lame duck situation",             pts: 1,  group: "COACHING",    color: "#dc2626" },
];

function getSignalsForMode(mode) {
  return mode === "conf" ? [...UNIVERSAL_SIGNALS, ...CONF_SIGNALS] : [...UNIVERSAL_SIGNALS, ...NCAA_SIGNALS];
}
function getConviction(score) {
  if (score >= 10) return "LOCK";
  if (score >= 7)  return "EDGE";
  if (score >= 5)  return "WATCH";
  return "PASS";
}
function calcScore(checked, mode) {
  return getSignalsForMode(mode).reduce((sum, s) => checked[s.id] ? sum + s.pts : sum, 0);
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #e8edf5", boxShadow: "0 1px 5px rgba(0,0,0,0.04)", ...style }}>{children}</div>
);
const SLabel = ({ children, color = "#475569" }) => (
  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, color, marginBottom: 10 }}>{children}</div>
);
const TierBadge = ({ tier, size = "sm" }) => {
  const t = TIERS[tier] || TIERS.PASS;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: size === "lg" ? "5px 14px" : "3px 9px", borderRadius: 20, background: t.color, color: "#fff", fontSize: size === "lg" ? 11 : 9, fontWeight: 800, letterSpacing: 1.5 }}>{t.icon} {tier}</span>;
};
const ModePill = ({ mode, onChange }) => (
  <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
    {[{ id: "conf", label: "CONF TOURNEY" }, { id: "ncaa", label: "NCAA TOURNEY" }].map(m => (
      <button key={m.id} onClick={() => onChange(m.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, background: mode === m.id ? (m.id === "conf" ? "#7c3aed" : "#16a34a") : "transparent", color: mode === m.id ? "#fff" : "#64748b", transition: "all 0.15s" }}>{m.label}</button>
    ))}
  </div>
);

function PlayCard({ play, onResult, onScore }) {
  const t = TIERS[play.conviction];
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={{ borderLeft: `3px solid ${t.color}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{play.teamA} vs {play.teamB}</span>
            {play.mode && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, fontWeight: 800, letterSpacing: 1, background: play.mode === "conf" ? "#ede9fe" : "#dcfce7", color: play.mode === "conf" ? "#7c3aed" : "#16a34a" }}>{play.mode === "conf" ? "CONF" : "NCAA"}</span>}
            {play.result && <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 9, fontWeight: 800, background: play.result === "W" ? "#16a34a" : play.result === "L" ? "#dc2626" : "#94a3b8", color: "#fff" }}>{play.result === "P" ? "PUSH" : play.result}</span>}
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
            <button key={r} onClick={() => onResult(play.id, r)} style={{ width: 30, height: 27, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 800, background: play.result === r ? (r === "W" ? "#16a34a" : r === "L" ? "#dc2626" : "#94a3b8") : "#f1f5f9", color: play.result === r ? "#fff" : "#475569" }}>{r}</button>
          ))}
          <button onClick={() => setExpanded(e => !e)} style={{ width: 27, height: 27, borderRadius: 6, border: "none", cursor: "pointer", background: expanded ? "#0f172a" : "#f1f5f9", color: expanded ? "#fff" : "#64748b", fontSize: 11 }}>{expanded ? "▲" : "▼"}</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 7 }}>
        <input value={play.teamAScore} onChange={e => onScore(play.id, "teamAScore", e.target.value)} placeholder={`${(play.teamA || "A").slice(0, 8)} pts`} style={{ width: 82, height: 26, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a" }} />
        <span style={{ color: "#94a3b8", fontWeight: 700 }}>–</span>
        <input value={play.teamBScore} onChange={e => onScore(play.id, "teamBScore", e.target.value)} placeholder={`${(play.teamB || "B").slice(0, 8)} pts`} style={{ width: 82, height: 26, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a" }} />
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
          <SLabel>SIGNALS FIRED</SLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {(play.signals || []).map(s => (
              <span key={s.id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: `${s.color || "#2563eb"}12`, color: s.color || "#2563eb", fontWeight: 600, border: `1px solid ${s.color || "#2563eb"}25` }}>
                {s.pts > 0 ? `+${s.pts}` : s.pts} {s.label.slice(0, 35)}{s.label.length > 35 ? "…" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ScannerTab({ onAddPlay }) {
  const [mode, setMode] = useState("conf");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [checked, setChecked] = useState({});
  const [tourney, setTourney] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const signals = getSignalsForMode(mode);
  const groups = [...new Set(signals.map(s => s.group))];

  async function loadGames() {
    setLoading(true); setApiError(null);
    try {
      const raw = await fetchOddsGames();
      const parsed = raw.map(parseOddsGame).filter(g => g.isToday);
      setGames(parsed);
      if (parsed.length === 0) setApiError("No NCAAB games found for today. Tournament may not be listed yet.");
    } catch (e) { setApiError("Failed to load games: " + e.message); }
    setLoading(false);
  }

  useEffect(() => { loadGames(); }, []);

  function selectGame(g) { setSelectedGame(g); setChecked({}); setNotes(""); }
  function toggle(id) { setChecked(c => ({ ...c, [id]: !c[id] })); }

  const score = calcScore(checked, mode);
  const conviction = getConviction(score);
  const tier = TIERS[conviction];
  const activeSignals = signals.filter(s => checked[s.id]);

  async function handleLog() {
    if (!selectedGame || score < 5 || saving) return;
    setSaving(true);
    const play = { id: Date.now(), date: TODAY_KEY, dateLabel: TODAY_LABEL, teamA: selectedGame.teamA, teamB: selectedGame.teamB, tourney, spread: selectedGame.spread || 0, notes, score, conviction, signals: activeSignals, result: null, teamAScore: "", teamBScore: "", mode };
    await onAddPlay(play);
    setSelectedGame(null); setChecked({}); setNotes(""); setTourney("");
    setSaving(false);
  }

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <ModePill mode={mode} onChange={m => { setMode(m); setChecked({}); }} />
        <button onClick={loadGames} disabled={loading} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontFamily: "inherit", fontSize: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1 }}>{loading ? "⟳ Loading…" : "⟳ Refresh"}</button>
        <div style={{ fontSize: 10, color: "#64748b" }}>{mode === "conf" ? "🏆 Conference Tournament signals active" : "🏀 NCAA Tournament signals active"}</div>
      </div>

      {apiError && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 12, marginBottom: 14 }}>{apiError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 255px", gap: 14 }}>
        <div>
          <SLabel>TODAY'S GAMES ({games.length})</SLabel>
          {loading && <div style={{ color: "#94a3b8", fontSize: 12, padding: "20px 0", textAlign: "center" }}>Fetching from Odds API…</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {games.map(g => {
              const active = selectedGame?.id === g.id;
              const timeStr = g.gameTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const spreadStr = g.spread != null ? (g.spread > 0 ? `+${g.spread}` : String(g.spread)) : "N/A";
              return (
                <div key={g.id} onClick={() => selectGame(g)} style={{ padding: "10px 12px", borderRadius: 9, cursor: "pointer", background: active ? "#0f172a" : "#fff", border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`, transition: "all 0.12s" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : "#0f172a", marginBottom: 2 }}>{g.teamA.length > 18 ? g.teamA.slice(0, 18) + "…" : g.teamA}</div>
                  <div style={{ fontSize: 11, color: active ? "#94a3b8" : "#64748b", marginBottom: 5 }}>vs {g.teamB.length > 18 ? g.teamB.slice(0, 18) + "…" : g.teamB}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: active ? "#fcd34d" : "#d97706", fontWeight: 800 }}>{spreadStr}</span>
                    <span style={{ fontSize: 9, color: active ? "#64748b" : "#94a3b8" }}>{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          {!selectedGame ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, color: "#94a3b8", gap: 8 }}>
              <div style={{ fontSize: 32 }}>👈</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Select a game to evaluate</div>
              <div style={{ fontSize: 11 }}>Pick from today's loaded games on the left</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{selectedGame.teamA} vs {selectedGame.teamB}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>TOURNEY / CONF</div>
                    <input value={tourney} onChange={e => setTourney(e.target.value)} placeholder="e.g. Big 12, ACC" style={{ height: 28, padding: "0 9px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a", width: 130 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, marginBottom: 3 }}>NOTES</div>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, injuries..." style={{ height: 28, padding: "0 9px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontFamily: "inherit", color: "#0f172a", width: 200 }} />
                  </div>
                </div>
              </div>
              {groups.map(group => {
                const groupSigs = signals.filter(s => s.group === group);
                const groupColor = groupSigs[0]?.color || "#2563eb";
                return (
                  <div key={group} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: groupColor, letterSpacing: 2 }}>{group}</span>
                      <div style={{ flex: 1, height: 1, background: `${groupColor}25` }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {groupSigs.map(s => {
                        const active = !!checked[s.id];
                        const neg = s.pts < 0;
                        const cc = neg ? "#dc2626" : s.color;
                        return (
                          <div key={s.id} onClick={() => toggle(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, cursor: "pointer", background: active ? (neg ? "#fef2f2" : `${s.color}08`) : "#fafafa", border: `1px solid ${active ? (neg ? "#fca5a5" : s.color + "40") : "#eef2f7"}`, transition: "all 0.1s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: active ? cc : "#fff", border: `1.5px solid ${active ? cc : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {active && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                            </div>
                            <span style={{ flex: 1, fontSize: 11, color: active ? "#0f172a" : "#334155", fontWeight: active ? 600 : 400 }}>{s.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 28, textAlign: "center", color: active ? (neg ? "#dc2626" : cc) : "#94a3b8", background: active ? (neg ? "#fee2e2" : `${s.color}15`) : "#f1f5f9" }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 75, alignSelf: "flex-start" }}>
          <div style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 12, padding: "18px 16px", boxShadow: `0 4px 20px ${tier.color}18`, transition: "all 0.3s" }}>
            <SLabel>COMPOSITE SCORE</SLabel>
            <div style={{ fontSize: 72, fontWeight: 900, color: tier.color, lineHeight: 1, letterSpacing: -3 }}>{score}</div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, margin: "12px 0 5px" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(0, Math.min(100, (score / 20) * 100))}%`, background: tier.color, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#94a3b8", fontWeight: 700, marginBottom: 12 }}>
              <span>PASS</span><span style={{ color: "#2563eb" }}>WATCH</span><span style={{ color: "#d97706" }}>EDGE</span><span style={{ color: "#16a34a" }}>LOCK</span>
            </div>
            <TierBadge tier={conviction} size="lg" />
            <div style={{ marginTop: 10, fontSize: 11, color: "#1e293b", lineHeight: 1.6 }}>
              {conviction === "LOCK" ? "Full stack confirmed. Max edge." : conviction === "EDGE" ? "Solid stack. Confirm RLM before logging." : conviction === "WATCH" ? "Below bet threshold. Track only." : "Insufficient signals. Hard pass."}
            </div>
          </div>
          <button onClick={handleLog} disabled={!selectedGame || score < 5 || saving} style={{ padding: "13px", borderRadius: 10, border: "none", background: selectedGame && score >= 5 ? tier.color : "#e2e8f0", color: selectedGame && score >= 5 ? "#fff" : "#94a3b8", fontFamily: "inherit", fontSize: 11, fontWeight: 800, letterSpacing: 2, cursor: selectedGame && score >= 5 ? "pointer" : "not-allowed", boxShadow: selectedGame && score >= 5 ? `0 4px 16px ${tier.color}40` : "none" }}>
            {saving ? "SAVING…" : !selectedGame ? "SELECT A GAME" : score >= 10 ? "⚡  LOG LOCK" : score >= 7 ? "✓  LOG EDGE" : score >= 5 ? "◎  LOG WATCH" : "SCORE TOO LOW"}
          </button>
          {activeSignals.length > 0 && (
            <Card>
              <SLabel>ACTIVE SIGNALS</SLabel>
              {activeSignals.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0", borderBottom: "1px solid #f8fafc", fontSize: 11 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "#1e293b", fontWeight: 500 }}>{s.label.length > 28 ? s.label.slice(0, 28) + "…" : s.label}</span>
                  <span style={{ fontWeight: 700, color: s.pts < 0 ? "#dc2626" : s.color }}>{s.pts > 0 ? `+${s.pts}` : s.pts}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TodayTab({ plays, onUpdate }) {
  const todayPlays = plays.filter(p => p.date === TODAY_KEY);
  const tierOrder = ["LOCK", "EDGE", "WATCH"];
  const grouped = tierOrder.map(t => ({ tier: t, plays: todayPlays.filter(p => p.conviction === t) })).filter(g => g.plays.length > 0);
  if (todayPlays.length === 0) return (
    <div style={{ padding: "70px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>No plays logged today</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>Use the Scanner tab to evaluate games and log plays</div>
    </div>
  );
  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 18 }}>{TODAY_LABEL} · {todayPlays.length} play{todayPlays.length !== 1 ? "s" : ""} logged</div>
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
              {tPlays.map(play => <PlayCard key={play.id} play={play} onResult={(id, r) => onUpdate(id, { result: r })} onScore={(id, f, v) => onUpdate(id, { [f]: v })} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ plays, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const byDate = {};
  plays.forEach(p => {
    if (!byDate[p.date]) byDate[p.date] = { label: p.dateLabel || p.date, plays: [] };
    byDate[p.date].plays.push(p);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  function dayStats(dPlays) {
    const graded = dPlays.filter(p => p.result && p.result !== "P");
    const w = graded.filter(p => p.result === "W").length;
    return { w, l: graded.length - w, total: dPlays.length };
  }
  if (plays.length === 0) return <div style={{ padding: "70px 20px", textAlign: "center" }}><div style={{ fontSize: 34, marginBottom: 10 }}>📅</div><div style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>No history yet</div></div>;
  const dayPlays = byDate[selectedDate]?.plays || [];
  const tierOrder = ["LOCK", "EDGE", "WATCH"];
  const grouped = tierOrder.map(t => ({ tier: t, plays: dayPlays.filter(p => p.conviction === t) })).filter(g => g.plays.length > 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 14, padding: "18px 20px" }}>
      <div>
        <SLabel>DATES</SLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {dates.map(d => {
            const s = dayStats(byDate[d].plays);
            const active = selectedDate === d;
            return (
              <div key={d} onClick={() => setSelectedDate(d)} style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", background: active ? "#0f172a" : "#fff", border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "#0f172a", marginBottom: 2 }}>{d === TODAY_KEY ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: 10, color: active ? "#94a3b8" : "#64748b" }}>{s.total} play{s.total !== 1 ? "s" : ""} · {s.w}–{s.l}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        {selectedDate && byDate[selectedDate] && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{selectedDate === TODAY_KEY ? "Today — " + TODAY_LABEL : byDate[selectedDate].label}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tierOrder.map(t => {
                  const tp = dayPlays.filter(p => p.conviction === t);
                  if (tp.length === 0) return null;
                  const graded = tp.filter(p => p.result && p.result !== "P");
                  const w = graded.filter(p => p.result === "W").length;
                  const pct = graded.length > 0 ? Math.round((w / graded.length) * 100) : null;
                  const tier = TIERS[t];
                  return <div key={t} style={{ padding: "7px 12px", borderRadius: 8, background: tier.bg, border: `1px solid ${tier.border}` }}><div style={{ fontSize: 8, color: tier.color, fontWeight: 800, letterSpacing: 1.5 }}>{t}</div><div style={{ fontSize: 15, fontWeight: 900, color: tier.color }}>{w}–{graded.length - w}</div>{pct !== null && <div style={{ fontSize: 9, color: tier.color }}>{pct}%</div>}</div>;
                })}
              </div>
            </div>
            {grouped.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "30px 0" }}>No qualifying plays this day.</div>}
            {grouped.map(({ tier, plays: tPlays }) => {
              const t = TIERS[tier];
              return (
                <div key={tier} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><TierBadge tier={tier} /><div style={{ flex: 1, height: 1, background: t.border }} /></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {tPlays.map(play => <PlayCard key={play.id} play={play} onResult={(id, r) => onUpdate(id, { result: r })} onScore={(id, f, v) => onUpdate(id, { [f]: v })} />)}
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

function StatsTab({ plays }) {
  const [modeFilter, setModeFilter] = useState("all");
  const filtered = modeFilter === "all" ? plays : plays.filter(p => p.mode === modeFilter);
  const graded = filtered.filter(p => p.result && p.result !== "P");
  function tierStats(tier) {
    const tp = tier === "ALL" ? graded : graded.filter(p => p.conviction === tier);
    const w = tp.filter(p => p.result === "W").length;
    return { w, l: tp.length - w, pct: tp.length > 0 ? Math.round((w / tp.length) * 100) : null };
  }
  const sigStats = {};
  filtered.forEach(play => {
    if (!play.result || play.result === "P") return;
    (play.signals || []).forEach(s => {
      if (!sigStats[s.id]) sigStats[s.id] = { label: s.label, color: s.color || "#2563eb", w: 0, l: 0 };
      if (play.result === "W") sigStats[s.id].w++; else sigStats[s.id].l++;
    });
  });
  const sigArr = Object.entries(sigStats).map(([id, v]) => ({ id, ...v, total: v.w + v.l, pct: Math.round((v.w / (v.w + v.l)) * 100) })).filter(s => s.total >= 2).sort((a, b) => b.pct - a.pct);
  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "#475569", marginRight: 4 }}>FILTER</span>
        {[{ id: "all", label: "ALL" }, { id: "conf", label: "CONF TOURNEY" }, { id: "ncaa", label: "NCAA" }].map(f => (
          <button key={f.id} onClick={() => setModeFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 800, letterSpacing: 1.5, background: modeFilter === f.id ? "#0f172a" : "#f1f5f9", color: modeFilter === f.id ? "#fff" : "#64748b" }}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {["LOCK", "EDGE", "WATCH", "ALL"].map(t => {
          const s = tierStats(t);
          const tier = TIERS[t] || TIERS.PASS;
          return <Card key={t} style={{ textAlign: "center", background: tier.bg, border: `1px solid ${tier.border}` }}><div style={{ fontSize: 8, color: tier.color, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>{t}</div><div style={{ fontSize: 30, fontWeight: 900, color: tier.color, lineHeight: 1 }}>{s.w}–{s.l}</div><div style={{ fontSize: 18, fontWeight: 800, color: tier.color, marginTop: 2 }}>{s.pct !== null ? `${s.pct}%` : "–"}</div><div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{s.w + s.l} graded</div></Card>;
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
              <div style={{ minWidth: 55 }}><div style={{ height: 5, background: "#e2e8f0", borderRadius: 3 }}><div style={{ height: "100%", borderRadius: 3, width: `${s.pct}%`, background: s.pct >= 60 ? "#16a34a" : s.pct >= 50 ? "#d97706" : "#dc2626" }} /></div></div>
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 32, textAlign: "right", color: s.pct >= 60 ? "#16a34a" : s.pct >= 50 ? "#d97706" : "#dc2626" }}>{s.pct}%</span>
            </div>
          ))}
        </Card>
      )}
      {graded.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: "50px 0", fontSize: 12 }}>Grade plays in Today or History tabs to see stats here.</div>}
    </div>
  );
}

const TABS = [{ id: "SCANNER", label: "SCANNER" }, { id: "TODAY", label: "TODAY'S PLAYS" }, { id: "HISTORY", label: "HISTORY" }, { id: "STATS", label: "STATS" }];

export default function MarchMadness() {
  const [tab, setTab] = useState("SCANNER");
  const [plays, setPlays] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dbLoadPlays().then(setPlays).catch(e => setError("Failed to load plays: " + e.message)).finally(() => setLoaded(true));
  }, []);

  async function handleAddPlay(play) {
    try { await dbInsertPlay(play); setPlays(prev => [...prev, play]); setTab("TODAY"); }
    catch (e) { alert("Failed to save play: " + e.message); }
  }
  async function handleUpdate(id, changes) {
    setPlays(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    const play = plays.find(p => p.id === id);
    if (play) { try { await dbUpdatePlay({ ...play, ...changes }); } catch (e) { console.error("Update failed:", e); } }
  }

  const graded = plays.filter(p => p.result && p.result !== "P");
  function hs(tier) {
    const tp = tier === "ALL" ? graded : graded.filter(p => p.conviction === tier);
    const w = tp.filter(p => p.result === "W").length;
    return { w, l: tp.length - w, pct: tp.length > 0 ? Math.round((w / tp.length) * 100) : null };
  }
  const todayCount = plays.filter(p => p.date === TODAY_KEY).length;

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 3 }}>CONNECTING TO DATABASE…</div></div>;
  if (error) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fef2f2" }}><div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</div></div>;

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 20px 0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2.5, marginBottom: 2, fontWeight: 700 }}>ATS EDGE BOT · TOURNAMENT SCANNER</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>March Madness</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "LOCK", key: "LOCK", c: "#16a34a", bg: "#f0fdf4", b: "#bbf7d0" }, { label: "EDGE", key: "EDGE", c: "#d97706", bg: "#fffbeb", b: "#fde68a" }, { label: "WATCH", key: "WATCH", c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" }, { label: "OVERALL", key: "ALL", c: "#334155", bg: "#f8fafc", b: "#cbd5e1" }].map(({ label, key, c, bg, b }) => {
              const s = hs(key);
              return <div key={label} style={{ textAlign: "center", padding: "6px 12px", background: bg, borderRadius: 8, border: `1px solid ${b}` }}><div style={{ fontSize: 7.5, color: "#64748b", letterSpacing: 2, fontWeight: 700, marginBottom: 2 }}>{label}</div><div style={{ fontSize: 14, fontWeight: 900, color: c }}>{s.w}–{s.l}</div><div style={{ fontSize: 9, color: c, fontWeight: 600 }}>{s.pct !== null ? `${s.pct}%` : "–"}</div></div>;
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#0f172a" : "transparent", border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: "7px 7px 0 0", fontFamily: "inherit", fontSize: 9, letterSpacing: 1.5, fontWeight: 800, color: tab === t.id ? "#fff" : "#64748b", transition: "all 0.12s", position: "relative" }}>
              {t.label}
              {t.id === "TODAY" && todayCount > 0 && <span style={{ position: "absolute", top: 3, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#2563eb", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{todayCount}</span>}
            </button>
          ))}
        </div>
      </div>
      {tab === "SCANNER" && <ScannerTab onAddPlay={handleAddPlay} />}
      {tab === "TODAY"   && <TodayTab plays={plays} onUpdate={handleUpdate} />}
      {tab === "HISTORY" && <HistoryTab plays={plays} onUpdate={handleUpdate} />}
      {tab === "STATS"   && <StatsTab plays={plays} />}
    </div>
  );
}

