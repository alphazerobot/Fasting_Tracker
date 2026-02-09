import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, CartesianGrid } from "recharts";

// ─── PERSISTENCE ───
const STORAGE_KEY = "fasting-tracker-state";

function saveState(state) {
  try {
    const serialized = {
      ...state,
      fastStart: state.fastStart.toISOString(),
      stoppedAt: state.stoppedAt ? state.stoppedAt.toISOString() : null,
      hungerLog: state.hungerLog.map(h => ({
        ...h,
        startTime: h.startTime.toISOString(),
        endTime: h.endTime ? h.endTime.toISOString() : null,
      })),
      notes: state.notes.map(n => ({ ...n, time: n.time.toISOString() })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) { /* silent */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      fastStart: new Date(parsed.fastStart),
      stoppedAt: parsed.stoppedAt ? new Date(parsed.stoppedAt) : null,
      hungerLog: (parsed.hungerLog || []).map(h => ({
        ...h,
        startTime: new Date(h.startTime),
        endTime: h.endTime ? new Date(h.endTime) : null,
      })),
      notes: (parsed.notes || []).map(n => ({ ...n, time: new Date(n.time) })),
    };
  } catch (e) { return null; }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* silent */ }
}

// ─── DATA ───
const DEFAULT_START = new Date("2026-02-07T23:00:00");

const metabolicData = [
  { hour: 0, glucose: 95, fat: 5, autophagy: 0, phase: "Fed State", event: "Last meal digesting. Insulin elevated, glucose is primary fuel.", icon: "🍽️" },
  { hour: 3, glucose: 85, fat: 12, autophagy: 0, phase: "Post-Absorptive", event: "Stomach emptying. Insulin beginning to drop. Liver starts tapping glycogen stores.", icon: "⏳" },
  { hour: 6, glucose: 75, fat: 20, autophagy: 0, phase: "Early Fasting", event: "Glycogenolysis active — liver breaking down glycogen to maintain blood sugar. Insulin falling steadily.", icon: "📉" },
  { hour: 9, glucose: 65, fat: 28, autophagy: 2, phase: "Glycogen Depletion", event: "Liver glycogen ~50% depleted. Glucagon rising. Free fatty acids mobilizing from adipose tissue.", icon: "🔋" },
  { hour: 12, glucose: 52, fat: 38, autophagy: 5, phase: "Metabolic Shift", event: "Liver glycogen nearly exhausted. Gluconeogenesis activating — liver making glucose from amino acids & glycerol. First ketone bodies detectable.", icon: "🔄" },
  { hour: 15, glucose: 42, fat: 48, autophagy: 10, phase: "Ketogenesis Begins", event: "BHB rising in blood. Growth hormone surging (up to 5x baseline). Norepinephrine increasing → mental alertness.", icon: "⚡" },
  { hour: 18, glucose: 35, fat: 55, autophagy: 18, phase: "Fat Adaptation", event: "Significant fatty acid oxidation. Blood BHB ~0.5-1.0 mmol/L. Brain starting to use ketones for ~25% of energy.", icon: "🔥" },
  { hour: 21, glucose: 28, fat: 62, autophagy: 25, phase: "Early Ketosis", event: "Insulin at baseline. mTOR pathway suppressed. AMPK activated — the cellular energy sensor triggering repair pathways.", icon: "🧬" },
  { hour: 24, glucose: 22, fat: 68, autophagy: 35, phase: "Autophagy Activation", event: "AUTOPHAGY BEGINS — cells recycling damaged proteins, organelles, and misfolded structures. BHB ~1.0-2.0 mmol/L.", icon: "♻️" },
  { hour: 27, glucose: 18, fat: 72, autophagy: 42, phase: "Cellular Cleanup", event: "Autophagy accelerating. Damaged mitochondria being cleared (mitophagy). Anti-inflammatory cytokines increasing.", icon: "🧹" },
  { hour: 30, glucose: 15, fat: 75, autophagy: 48, phase: "Deep Ketosis Entry", event: "BHB ~2.0-3.0 mmol/L. Brain deriving ~50% energy from ketones. Mental clarity and reduced hunger (ghrelin wave passes).", icon: "🧠" },
  { hour: 33, glucose: 13, fat: 78, autophagy: 55, phase: "Metabolic Efficiency", event: "Metabolic rate stabilized. Norepinephrine keeping energy expenditure up. Fat is now dominant fuel.", icon: "📊" },
  { hour: 36, glucose: 12, fat: 80, autophagy: 60, phase: "Deep Autophagy", event: "Significant autophagy throughout tissues. Senescent cell clearance increasing. BDNF rising — neuroprotection.", icon: "🔬" },
  { hour: 39, glucose: 11, fat: 82, autophagy: 65, phase: "Immune Modulation", event: "Inflammatory markers dropping. Old white blood cells being recycled. Gut lining repair beginning.", icon: "🛡️" },
  { hour: 42, glucose: 10, fat: 83, autophagy: 68, phase: "Fat-Adapted", event: "Muscles efficiently burning fatty acids directly. Ketone utilization optimized. Second wind of energy.", icon: "💪" },
  { hour: 45, glucose: 10, fat: 84, autophagy: 72, phase: "Cellular Renewal", event: "Peak protein recycling — amino acids from damaged proteins reused for critical repairs. DNA repair upregulated.", icon: "🔧" },
  { hour: 48, glucose: 9, fat: 85, autophagy: 78, phase: "Peak Autophagy Zone", event: "AUTOPHAGY PEAKING — maximum cellular cleanup. Stem cell signaling activating. BHB ~3.0-5.0 mmol/L.", icon: "⭐" },
  { hour: 51, glucose: 9, fat: 85, autophagy: 82, phase: "Stem Cell Priming", event: "Hematopoietic stem cells shifting to self-renewal mode. PKA enzyme suppressed → regeneration signaling.", icon: "🌱" },
  { hour: 54, glucose: 8, fat: 86, autophagy: 85, phase: "Deep Repair", event: "Widespread tissue repair. Intestinal stem cells highly active. Gut microbiome shifting — beneficial species favored.", icon: "🦠" },
  { hour: 57, glucose: 8, fat: 86, autophagy: 87, phase: "Immune Reset", event: "Old lymphocytes cleared. Naive T-cell pools preparing to regenerate upon refeeding.", icon: "🔄" },
  { hour: 60, glucose: 8, fat: 87, autophagy: 88, phase: "Metabolic Plateau", event: "Ketone production steady-state. Body fully fat-adapted. Electrolyte balance critical now.", icon: "⚖️" },
  { hour: 63, glucose: 7, fat: 87, autophagy: 89, phase: "Extended Autophagy", event: "Autophagy sustained. Protein aggregates in neurons cleared. Nrf2 pathway active → antioxidant defense.", icon: "🧪" },
  { hour: 66, glucose: 7, fat: 88, autophagy: 90, phase: "Neuroplasticity", event: "BDNF elevated. Synaptic plasticity enhanced. Ketones providing clean-burning brain fuel.", icon: "🧠" },
  { hour: 69, glucose: 7, fat: 88, autophagy: 91, phase: "Sustained Renewal", event: "FGF21 elevated → tissue protection. Insulin sensitivity dramatically improved.", icon: "📈" },
  { hour: 72, glucose: 7, fat: 88, autophagy: 92, phase: "Immune Regeneration", event: "STEM CELL REGENERATION — immune rebuild initiating. WBC at nadir, primed for regeneration upon refeeding.", icon: "🌟" },
  { hour: 75, glucose: 7, fat: 89, autophagy: 93, phase: "Deep Ketosis Plateau", event: "BHB ~4-6 mmol/L. Fat oxidation maximized. Lean mass preserved via GH & ketone protein sparing.", icon: "🏔️" },
  { hour: 78, glucose: 6, fat: 89, autophagy: 93, phase: "Continued Repair", event: "Ongoing cellular maintenance. Telomere-protective pathways active.", icon: "🔧" },
  { hour: 81, glucose: 6, fat: 89, autophagy: 94, phase: "Metabolic Mastery", event: "Maximum metabolic flexibility. Mitochondrial biogenesis — new efficient mitochondria replacing cleared ones.", icon: "⚙️" },
  { hour: 84, glucose: 6, fat: 90, autophagy: 94, phase: "Sustained Benefits", event: "All fasting pathways at steady state. Adiponectin elevated. Cardiovascular markers improved.", icon: "❤️" },
  { hour: 87, glucose: 6, fat: 90, autophagy: 94, phase: "Late Extended Fast", event: "Electrolytes critical — supplement sodium, potassium, magnesium. Running almost entirely on fat.", icon: "⚠️" },
  { hour: 90, glucose: 6, fat: 90, autophagy: 95, phase: "Final Phase Entry", event: "Approaching finish line. Plan refeed: bone broth or light protein first.", icon: "🏁" },
  { hour: 93, glucose: 6, fat: 90, autophagy: 95, phase: "Pre-Refeed", event: "Digestive enzymes downregulated — start slow. Avoid high-carb first meal.", icon: "📋" },
  { hour: 96, glucose: 5, fat: 91, autophagy: 95, phase: "Final Stretch", event: "Immune progenitor cells at maximum regenerative potential.", icon: "🚀" },
  { hour: 99, glucose: 5, fat: 91, autophagy: 95, phase: "Approaching 100h", event: "Profound cellular renovation complete. Refeeding will trigger immune rebuild.", icon: "🏆" },
  { hour: 100, glucose: 5, fat: 91, autophagy: 95, phase: "100 HOURS", event: "FAST COMPLETE — deep autophagy, immune reset, metabolic flexibility, stem cell priming. Break gently.", icon: "🎯" },
];

const phaseColors = [
  { start: 0, end: 12, label: "Glycogen Depletion", color: "#F59E0B" },
  { start: 12, end: 24, label: "Ketogenesis", color: "#EF4444" },
  { start: 24, end: 48, label: "Autophagy Rising", color: "#8B5CF6" },
  { start: 48, end: 72, label: "Peak Autophagy", color: "#6366F1" },
  { start: 72, end: 100, label: "Stem Cell Regeneration", color: "#10B981" },
];

const milestones = [
  { h: 12, label: "Glycogen Depleted", icon: "🔄" },
  { h: 18, label: "Ketosis Begins", icon: "🔥" },
  { h: 24, label: "Autophagy Activates", icon: "♻️" },
  { h: 48, label: "Peak Autophagy", icon: "⭐" },
  { h: 72, label: "Stem Cell Reset", icon: "🌟" },
  { h: 100, label: "Fast Complete!", icon: "🎯" },
];

// ─── HELPERS ───
function getTimeForHour(hour, startTime) {
  const d = new Date(startTime.getTime() + hour * 3600000);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function getEndTime(startTime) { return new Date(startTime.getTime() + 100 * 3600000); }
function getHour(startTime, refTime) { return Math.max(0, Math.min(100, (refTime - startTime) / 3600000)); }

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatFullDuration(ms) {
  const totalMins = Math.round(ms / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  let parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

function toLocalISO(d) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function snapToChart(h) {
  return metabolicData.reduce((best, d) => Math.abs(d.hour - h) < Math.abs(best.hour - h) ? d : best).hour;
}

function CustomTooltip({ active, payload, hungerZones }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const inHunger = hungerZones.some(z => d.hour >= z.startHour && d.hour <= z.endHour);
  return (
    <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", maxWidth: 280, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{d.timeLabel || `Hour ${d.hour}`}</div>
      <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Hour {d.hour} — {d.phase}</div>
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <span style={{ color: "#F59E0B" }}>Glucose {d.glucose}%</span>
        <span style={{ color: "#EF4444" }}>Fat {d.fat}%</span>
        <span style={{ color: "#8B5CF6" }}>Autophagy {d.autophagy}%</span>
      </div>
      {inHunger && <div style={{ marginTop: 6, fontSize: 11, color: "#fb923c", fontWeight: 500 }}>🔶 Hunger wave active</div>}
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const saved = useRef(loadState());
  const [fastStart, setFastStart] = useState(saved.current?.fastStart || DEFAULT_START);
  const [fastState, setFastState] = useState(saved.current?.fastState || "running");
  const [stoppedAt, setStoppedAt] = useState(saved.current?.stoppedAt || null);
  const [currentHour, setCurrentHour] = useState(getHour(saved.current?.fastStart || DEFAULT_START, new Date()));
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewMode, setViewMode] = useState("timeline");
  const [isHungry, setIsHungry] = useState(saved.current?.isHungry || false);
  const [hungerLog, setHungerLog] = useState(saved.current?.hungerLog || []);
  const [notes, setNotes] = useState(saved.current?.notes || []);
  const [noteInput, setNoteInput] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showStartEditor, setShowStartEditor] = useState(false);
  const [startDateInput, setStartDateInput] = useState(toLocalISO(saved.current?.fastStart || DEFAULT_START));
  const [tick, setTick] = useState(0);
  const timelineRef = useRef(null);

  // Persist on every state change
  useEffect(() => {
    saveState({ fastStart, fastState, stoppedAt, isHungry, hungerLog, notes });
  }, [fastStart, fastState, stoppedAt, isHungry, hungerLog, notes]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (fastState === "running") setCurrentHour(getHour(fastStart, new Date()));
      setTick(t => t + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [fastStart, fastState]);

  useEffect(() => {
    if (timelineRef.current && viewMode === "timeline") {
      const idx = metabolicData.findIndex(d => d.hour > effectiveHour) - 1;
      const target = timelineRef.current.children[Math.max(0, idx)];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [viewMode]);

  useEffect(() => {
    if (currentHour >= 100 && fastState === "running") {
      setFastState("completed");
      setStoppedAt(new Date());
    }
  }, [currentHour]);

  const effectiveHour = fastState === "running" ? currentHour : (stoppedAt ? getHour(fastStart, stoppedAt) : currentHour);

  const applyStartDate = () => {
    const newStart = new Date(startDateInput);
    if (isNaN(newStart.getTime())) return;
    const clamped = newStart > new Date() ? new Date() : newStart;
    setFastStart(clamped);
    setStartDateInput(toLocalISO(clamped));
    setCurrentHour(getHour(clamped, new Date()));
    setHungerLog([]); setNotes([]); setIsHungry(false);
    if (fastState !== "running") { setFastState("running"); setStoppedAt(null); }
    setShowStartEditor(false);
  };

  const handleStop = () => {
    if (isHungry) {
      const now = new Date();
      setHungerLog(prev => {
        const u = [...prev]; const l = u[u.length - 1];
        if (l && !l.endTime) u[u.length - 1] = { ...l, endTime: now, endHour: getHour(fastStart, now) };
        return u;
      });
      setIsHungry(false);
    }
    setStoppedAt(new Date()); setFastState("stopped"); setShowStopConfirm(false);
  };

  const handleReset = () => {
    const now = new Date();
    setFastStart(now); setStartDateInput(toLocalISO(now));
    setFastState("running"); setStoppedAt(null); setCurrentHour(0);
    setHungerLog([]); setNotes([]); setIsHungry(false);
    setSelectedEntry(null); setShowResetConfirm(false);
    clearState();
  };

  const handleResume = () => {
    setFastState("running"); setStoppedAt(null);
    setCurrentHour(getHour(fastStart, new Date()));
  };

  const handleHungerToggle = () => {
    if (fastState !== "running") return;
    const now = new Date(); const hourNow = getHour(fastStart, now);
    if (!isHungry) {
      setHungerLog(prev => [...prev, { startTime: now, startHour: hourNow, endTime: null, endHour: null }]);
      setIsHungry(true);
    } else {
      setHungerLog(prev => {
        const u = [...prev]; const l = u[u.length - 1];
        if (l && !l.endTime) u[u.length - 1] = { ...l, endTime: now, endHour: hourNow };
        return u;
      });
      setIsHungry(false);
    }
  };

  const removeHungerEntry = (idx) => {
    if (idx === hungerLog.length - 1 && isHungry) setIsHungry(false);
    setHungerLog(prev => prev.filter((_, i) => i !== idx));
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    const now = new Date();
    setNotes(prev => [...prev, { time: now, hour: getHour(fastStart, now), text: noteInput.trim() }]);
    setNoteInput("");
  };

  const exportLog = () => {
    const endTime = stoppedAt || new Date();
    const totalMs = endTime - fastStart;
    const totalHours = getHour(fastStart, endTime);
    const achievedPhase = phaseColors.findLast(p => totalHours >= p.start) || phaseColors[0];
    const achievedMilestones = milestones.filter(m => totalHours >= m.h);
    let log = `═══════════════════════════════════════\n       100-HOUR FAST — COMPLETE LOG\n═══════════════════════════════════════\n\n`;
    log += `Status: ${fastState === "completed" ? "✅ COMPLETED" : fastState === "stopped" ? "⏹ STOPPED" : "⏳ IN PROGRESS"}\n`;
    log += `Started: ${fastStart.toLocaleString()}\nEnded:   ${endTime.toLocaleString()}\n`;
    log += `Duration: ${formatFullDuration(totalMs)} (${totalHours.toFixed(1)} hours)\nFinal Phase: ${achievedPhase.label}\n\n`;
    log += `───── MILESTONES ─────\n`;
    achievedMilestones.forEach(m => { log += `  ${m.icon} H${m.h}: ${m.label}\n`; });
    const missed = milestones.filter(m => totalHours < m.h);
    if (missed.length) { log += `  Missed:\n`; missed.forEach(m => { log += `  ○ H${m.h}: ${m.label}\n`; }); }
    log += `\n───── HUNGER WAVES (${hungerLog.length}) ─────\n`;
    if (!hungerLog.length) log += `  None logged.\n`;
    else {
      hungerLog.forEach((h, i) => {
        const dur = h.endTime ? h.endTime - h.startTime : endTime - h.startTime;
        log += `  #${i + 1}: H${h.startHour.toFixed(1)}${h.endHour != null ? ` → H${h.endHour.toFixed(1)}` : " → open"} | ${formatDuration(dur)}\n`;
      });
      const closed = hungerLog.filter(h => h.endTime);
      if (closed.length) {
        const avg = closed.reduce((s, h) => s + (h.endTime - h.startTime), 0) / closed.length;
        const max = Math.max(...closed.map(h => h.endTime - h.startTime));
        const total = closed.reduce((s, h) => s + (h.endTime - h.startTime), 0);
        log += `\n  Avg: ${formatDuration(avg)} | Longest: ${formatDuration(max)} | Total: ${formatDuration(total)} (${((total / totalMs) * 100).toFixed(1)}%)\n`;
      }
    }
    log += `\n───── NOTES (${notes.length}) ─────\n`;
    if (!notes.length) log += `  None.\n`;
    else notes.forEach(n => { log += `  [H${n.hour.toFixed(1)}] ${n.text}\n`; });
    const snap = metabolicData.findLast(d => d.hour <= totalHours) || metabolicData[0];
    log += `\n───── METABOLIC SNAPSHOT ─────\n  Glucose: ~${snap.glucose}% | Fat: ~${snap.fat}% | Autophagy: ~${snap.autophagy}%\n  Phase: ${snap.phase}\n`;
    log += `\n═══════════════════════════════════════\n`;
    navigator.clipboard.writeText(log).then(() => alert("Log copied to clipboard!")).catch(() => {
      const w = window.open("", "_blank");
      if (w) w.document.write(`<pre style="font-family:monospace;white-space:pre-wrap;padding:20px;background:#0f0f1a;color:#e2e8f0;">${log}</pre>`);
    });
  };

  const hungerZones = hungerLog.map(h => ({
    startHour: h.startHour,
    endHour: h.endHour != null ? h.endHour : effectiveHour,
    duration: h.endTime ? h.endTime - h.startTime : new Date() - h.startTime,
    open: h.endHour == null,
  }));

  const progressPct = Math.min(100, (effectiveHour / 100) * 100);
  const currentPhase = phaseColors.findLast(p => effectiveHour >= p.start) || phaseColors[0];
  const hoursLeft = Math.max(0, 100 - effectiveHour);
  const hoursIn = Math.min(100, effectiveHour);
  const isInHunger = (hour) => hungerZones.some(z => hour >= Math.floor(z.startHour) && hour <= Math.ceil(z.endHour));
  const isStopped = fastState !== "running";
  const endDate = getEndTime(fastStart);
  const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes breathe{0%,100%{box-shadow:0 0 8px rgba(249,115,22,.3)}50%{box-shadow:0 0 24px rgba(249,115,22,.6)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease forwards}
        input[type="datetime-local"]{color-scheme:dark}
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ background: isStopped ? "linear-gradient(135deg,#0f0f1a 0%,#1a1020 50%,#0f0f1a 100%)" : "linear-gradient(135deg,#0f0f1a 0%,#1a1a3e 50%,#0f0f1a 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${currentPhase.color}44,${currentPhase.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {fastState === "completed" ? "🎯" : fastState === "stopped" ? "⏹" : "🔥"}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
                100-Hour Fast
                {fastState === "stopped" && <span style={{ fontSize: 12, color: "#f97316", marginLeft: 8 }}>PAUSED</span>}
                {fastState === "completed" && <span style={{ fontSize: 12, color: "#10B981", marginLeft: 8 }}>DONE</span>}
              </h1>
              <button onClick={() => { setShowStartEditor(!showStartEditor); setStartDateInput(toLocalISO(fastStart)); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Started {fmtDate(fastStart)} · {fmtTime(fastStart)}</span>
                <span style={{ fontSize: 10, color: "#8B5CF6" }}>✏️</span>
              </button>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>Ends {fmtDate(endDate)} · {fmtTime(endDate)}</div>
            </div>
          </div>

          {/* START EDITOR */}
          {showStartEditor && (
            <div className="fade-in" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>⏱ Set Fast Start Time</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Pick when your last meal ended. Can be in the past — the timeline catches up.</div>
              <input type="datetime-local" value={startDateInput} onChange={e => setStartDateInput(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(0,0,0,0.3)", color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Last night 8 PM", fn: () => { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(20,0,0,0); return d; } },
                  { label: "Last night 10 PM", fn: () => { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(22,0,0,0); return d; } },
                  { label: "Today 12 AM", fn: () => { const d = new Date(); d.setHours(0,0,0,0); return d; } },
                  { label: "2 days ago 8 PM", fn: () => { const d = new Date(); d.setDate(d.getDate()-2); d.setHours(20,0,0,0); return d; } },
                  { label: "3 days ago 8 PM", fn: () => { const d = new Date(); d.setDate(d.getDate()-3); d.setHours(20,0,0,0); return d; } },
                ].map((p, i) => (
                  <button key={i} onClick={() => setStartDateInput(toLocalISO(p.fn()))} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{p.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={applyStartDate} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#8B5CF6", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Set Start Time</button>
                <button onClick={() => setShowStartEditor(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              </div>
              {(() => {
                const pv = new Date(startDateInput);
                if (isNaN(pv.getTime())) return null;
                const pvH = getHour(pv, new Date());
                const pvP = phaseColors.findLast(p => pvH >= p.start) || phaseColors[0];
                return (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>Preview: </span>
                    <span style={{ color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{Math.min(100, pvH).toFixed(1)}h</span>
                    <span style={{ color: "#64748b" }}> in · </span>
                    <span style={{ color: pvP.color, fontWeight: 600 }}>{pvP.label}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Hours In</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#f1f5f9" }}>{hoursIn.toFixed(1)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: hoursLeft < 10 ? "#10B981" : "#f1f5f9" }}>{hoursLeft.toFixed(1)}</div>
            </div>
            <div style={{ background: `linear-gradient(135deg,${currentPhase.color}15,${currentPhase.color}08)`, borderRadius: 12, padding: "12px 14px", border: `1px solid ${currentPhase.color}33` }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phase</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: currentPhase.color, lineHeight: 1.3 }}>{currentPhase.label}</div>
            </div>
          </div>

          {/* PROGRESS */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, height: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 100, background: "linear-gradient(90deg,#F59E0B,#EF4444,#8B5CF6,#6366F1,#10B981)", width: `${progressPct}%`, transition: "width 1s ease", position: "relative" }}>
              <div style={{ position: "absolute", right: 0, top: -3, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 0 12px rgba(255,255,255,0.5)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            <span>0h</span><span>25h</span><span>50h</span><span>75h</span><span>100h</span>
          </div>

          {/* CONTROLS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            {fastState === "running" ? (
              <button onClick={() => setShowStopConfirm(true)} style={{ padding: "10px 0", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>⏹ Stop</button>
            ) : (
              <button onClick={handleResume} style={{ padding: "10px 0", borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>▶ Resume</button>
            )}
            <button onClick={() => setShowResetConfirm(true)} style={{ padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↻ Reset</button>
            <button onClick={exportLog} style={{ padding: "10px 0", borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>📋 Log</button>
          </div>

          {showStopConfirm && (
            <div className="fade-in" style={{ marginTop: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 8 }}>Stop this fast?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleStop} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Yes, Stop</button>
                <button onClick={() => setShowStopConfirm(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              </div>
            </div>
          )}

          {showResetConfirm && (
            <div className="fade-in" style={{ marginTop: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fb923c", marginBottom: 8 }}>Reset everything?</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>Export your log first to save it.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleReset} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Yes, Reset</button>
                <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* HUNGER */}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleHungerToggle} disabled={isStopped}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: isHungry ? "2px solid #f97316" : "2px solid rgba(255,255,255,0.1)", background: isStopped ? "rgba(255,255,255,0.02)" : isHungry ? "linear-gradient(135deg,rgba(249,115,22,0.2),rgba(234,88,12,0.1))" : "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))", cursor: isStopped ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden", animation: isHungry ? "breathe 2s ease-in-out infinite" : "none", opacity: isStopped ? 0.4 : 1, transition: "all 0.3s ease" }}>
              {isHungry && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50%,rgba(249,115,22,0.15),transparent 70%)", animation: "pulse 2s ease-in-out infinite" }} />}
              <span style={{ fontSize: 24, position: "relative", zIndex: 1 }}>{isHungry ? "✅" : "🔶"}</span>
              <div style={{ textAlign: "left", position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: isHungry ? "#4ade80" : "#e2e8f0" }}>
                  {isStopped ? "Fast Paused" : isHungry ? "Hunger Gone — Tap When It Passes" : "I'm Hungry"}
                </div>
                <div style={{ fontSize: 11, color: isHungry ? "#86efac" : "#64748b", marginTop: 1 }}>
                  {isStopped ? "Resume to track" : isHungry ? `Active ${formatDuration(new Date() - hungerLog[hungerLog.length - 1]?.startTime)} — it will pass` : hungerLog.length > 0 ? `${hungerLog.length} wave${hungerLog.length > 1 ? "s" : ""} logged` : "Track ghrelin waves"}
                </div>
              </div>
            </button>
          </div>

          {hungerLog.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {hungerLog.map((h, i) => {
                const dur = h.endTime ? h.endTime - h.startTime : new Date() - h.startTime;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: !h.endTime ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.08)", border: !h.endTime ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: 11 }}>
                    <span style={{ color: !h.endTime ? "#f97316" : "#fb923c" }}>{!h.endTime ? "🔶" : "🔸"}</span>
                    <span style={{ color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>H{h.startHour.toFixed(1)}{h.endHour != null ? `→${h.endHour.toFixed(1)}` : "→now"}</span>
                    <span style={{ color: "#94a3b8" }}>{formatDuration(dur)}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeHungerEntry(i); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "0 2px", fontSize: 14, lineHeight: 1 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* NOTES */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="Log a note (mood, energy, symptoms...)"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <button onClick={addNote} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>+ Note</button>
          </div>
          {notes.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: "#8B5CF6", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, flexShrink: 0 }}>H{n.hour.toFixed(1)}</span>
                  <span style={{ color: "#cbd5e1", flex: 1 }}>{n.text}</span>
                  <button onClick={() => setNotes(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 20px 0" }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.06)" }}>
          {["chart", "timeline"].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", background: viewMode === mode ? "rgba(255,255,255,0.1)" : "transparent", color: viewMode === mode ? "#f1f5f9" : "#64748b" }}>
              {mode === "chart" ? "📊 Chart" : "📋 Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 20px 40px" }}>

        {viewMode === "chart" && (
          <div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: "20px 8px 8px 0", marginBottom: 16 }}>
              <div style={{ paddingLeft: 20, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Energy Source Distribution</div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />Glucose</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />Fat/Ketones</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B5CF6", display: "inline-block" }} />Autophagy</span>
                  {hungerZones.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(249,115,22,0.5)", display: "inline-block", border: "1px solid #f97316" }} />Hunger</span>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={metabolicData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} /><stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="fG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} /><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip hungerZones={hungerZones} />} />
                  {hungerZones.map((z, i) => <ReferenceArea key={`hz-${i}`} x1={snapToChart(z.startHour)} x2={snapToChart(z.endHour)} fill="#f97316" fillOpacity={0.1} stroke="#f97316" strokeOpacity={0.35} strokeDasharray="6 3" />)}
                  {hungerLog.map((h, i) => {
                    const l = [<ReferenceLine key={`hs-${i}`} x={snapToChart(h.startHour)} stroke="#f97316" strokeWidth={2} label={{ value: "▼ Hungry", position: "top", fontSize: 9, fill: "#f97316", fontWeight: 700 }} />];
                    if (h.endHour != null) l.push(<ReferenceLine key={`he-${i}`} x={snapToChart(h.endHour)} stroke="#4ade80" strokeWidth={2} label={{ value: "▲ Gone", position: "top", fontSize: 9, fill: "#4ade80", fontWeight: 700 }} />);
                    return l;
                  }).flat()}
                  {effectiveHour <= 100 && <ReferenceLine x={snapToChart(effectiveHour)} stroke="#ffffff44" strokeDasharray="4 4" label={{ value: isStopped ? "STOPPED" : "NOW", position: "insideTopRight", fontSize: 9, fill: "#94a3b8" }} />}
                  <Area type="monotone" dataKey="glucose" stroke="#F59E0B" strokeWidth={2} fill="url(#gG)" dot={false} />
                  <Area type="monotone" dataKey="fat" stroke="#EF4444" strokeWidth={2} fill="url(#fG)" dot={false} />
                  <Area type="monotone" dataKey="autophagy" stroke="#8B5CF6" strokeWidth={2} fill="url(#aG)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Metabolic Phases</div>
              {phaseColors.map((p, i) => {
                const a = effectiveHour >= p.start && effectiveHour < p.end;
                return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><div style={{ width: 70, fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textAlign: "right", flexShrink: 0 }}>{p.start}–{p.end}h</div><div style={{ flex: 1 }}><div style={{ height: 24, borderRadius: 6, background: `${p.color}${a ? "33" : "15"}`, border: a ? `1px solid ${p.color}66` : "1px solid transparent", display: "flex", alignItems: "center", paddingLeft: 10 }}><span style={{ fontSize: 11, fontWeight: a ? 600 : 400, color: a ? p.color : "#94a3b8" }}>{p.label} {a && "◀"}</span></div></div></div>);
              })}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Milestones</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {milestones.map((m, i) => { const d = effectiveHour >= m.h; return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: d ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: d ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 16 }}>{d ? "✅" : m.icon}</span><div><div style={{ fontSize: 12, fontWeight: 500, color: d ? "#10B981" : "#94a3b8" }}>{m.label}</div><div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>H{m.h}</div></div></div>); })}
              </div>
            </div>

            {hungerLog.length > 0 && (
              <div style={{ background: "rgba(249,115,22,0.04)", borderRadius: 16, border: "1px solid rgba(249,115,22,0.15)", padding: 16, marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#fb923c" }}>🔶 Hunger Waves</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {[
                    { val: hungerLog.length, label: "Waves" },
                    { val: hungerLog.filter(h => h.endTime).length > 0 ? formatDuration(hungerLog.filter(h => h.endTime).reduce((s, h) => s + (h.endTime - h.startTime), 0) / hungerLog.filter(h => h.endTime).length) : "–", label: "Avg" },
                    { val: hungerLog.filter(h => h.endTime).length > 0 ? formatDuration(Math.max(...hungerLog.filter(h => h.endTime).map(h => h.endTime - h.startTime))) : "–", label: "Longest" },
                  ].map((s, i) => (<div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: "#fb923c", fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div></div>))}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Each wave you ride gets weaker as ketosis deepens.</div>
              </div>
            )}
          </div>
        )}

        {viewMode === "timeline" && (
          <div ref={timelineRef} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {metabolicData.map((entry, i) => {
              const isPast = entry.hour <= effectiveHour;
              const isCurrent = entry.hour <= effectiveHour && (metabolicData[i + 1]?.hour > effectiveHour || entry.hour === 100);
              const isFuture = entry.hour > effectiveHour;
              const isSelected = selectedEntry === i;
              const entryHunger = isInHunger(entry.hour);
              const entryNotes = notes.filter(n => Math.floor(n.hour / 3) * 3 === entry.hour);

              return (
                <div key={i} onClick={() => setSelectedEntry(isSelected ? null : i)} style={{ cursor: "pointer", position: "relative" }}>
                  {i < metabolicData.length - 1 && <div style={{ position: "absolute", left: 27, top: 40, bottom: -2, width: 2, background: isPast ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)" }} />}
                  <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12, background: isCurrent ? "rgba(139,92,246,0.08)" : entryHunger && isPast ? "rgba(249,115,22,0.06)" : isSelected ? "rgba(255,255,255,0.04)" : "transparent", border: isCurrent ? "1px solid rgba(139,92,246,0.25)" : entryHunger && isPast ? "1px solid rgba(249,115,22,0.15)" : "1px solid transparent", opacity: isFuture ? 0.45 : 1 }}>
                    <div style={{ flexShrink: 0, width: 36, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                      <div style={{ width: isCurrent ? 18 : 12, height: isCurrent ? 18 : 12, borderRadius: "50%", background: entryHunger && isPast ? "#f97316" : isCurrent ? "#8B5CF6" : isPast ? "#6366F1" : "rgba(255,255,255,0.1)", border: isCurrent ? "3px solid rgba(139,92,246,0.4)" : entryHunger && isPast ? "2px solid rgba(249,115,22,0.4)" : "none", boxShadow: isCurrent ? "0 0 16px rgba(139,92,246,0.5)" : "none" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: isCurrent ? "#8B5CF6" : isPast ? "#e2e8f0" : "#64748b" }}>H{entry.hour}</span>
                        <span style={{ fontSize: 11, color: "#475569" }}>{getTimeForHour(entry.hour, fastStart)}</span>
                        {isCurrent && <span style={{ fontSize: 9, background: isStopped ? "rgba(249,115,22,0.15)" : "#8B5CF622", color: isStopped ? "#f97316" : "#8B5CF6", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{isStopped ? "STOPPED" : "NOW"}</span>}
                        {entryHunger && isPast && <span style={{ fontSize: 9, background: "rgba(249,115,22,0.15)", color: "#f97316", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>🔶</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isPast ? "#f1f5f9" : "#94a3b8", marginBottom: 4 }}>{entry.icon} {entry.phase}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{entry.event}</div>
                      {entryNotes.length > 0 && <div style={{ marginTop: 8 }}>{entryNotes.map((n, ni) => (<div key={ni} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(139,92,246,0.08)", borderRadius: 6, fontSize: 11, color: "#c4b5fd", marginBottom: 3 }}>📝 <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8B5CF6" }}>H{n.hour.toFixed(1)}</span> {n.text}</div>))}</div>}
                      {(isSelected || isCurrent) && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          {[{ label: "Glucose", value: entry.glucose, color: "#F59E0B" }, { label: "Fat", value: entry.fat, color: "#EF4444" }, { label: "Autophagy", value: entry.autophagy, color: "#8B5CF6" }].map((bar, j) => (
                            <div key={j} style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b", marginBottom: 3 }}><span>{bar.label}</span><span style={{ fontFamily: "'JetBrains Mono', monospace", color: bar.color }}>{bar.value}%</span></div>
                              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 2, background: bar.color, width: `${bar.value}%`, transition: "width 0.5s ease" }} /></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
