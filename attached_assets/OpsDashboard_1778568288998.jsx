import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  REAL SSE CONNECTION — connects to your actual Railway server
//  Replace SSE_ENDPOINT with your real endpoint
// ═══════════════════════════════════════════════════════════════════
const SSE_ENDPOINT = "/api/ops/stream";
const API_BASE = "";

// ═══════════════════════════════════════════════════════════════════
//  SAFE TIME AGO — never returns NaN
// ═══════════════════════════════════════════════════════════════════
function timeAgo(ts) {
  const ms = typeof ts === "string" ? new Date(ts).getTime() : Number(ts);
  if (!ms || isNaN(ms)) return "just now";
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtUptime(s) {
  if (!s || isNaN(s)) return "00:00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════
//  MOCK ENGINE — mirrors your real server shape exactly
//  When you connect real SSE, delete this class entirely
// ═══════════════════════════════════════════════════════════════════
const TOOLS = ["pdf-to-excel", "pdf-to-word", "word-to-pdf", "image-to-pdf", "excel-to-csv", "ppt-to-pdf", "ocr-scan"];

const REAL_ERRORS = [
  {
    type: "ModuleNotFoundError",
    tool: "pdf-to-excel",
    severity: "MEDIUM",
    msg: `Traceback (most recent call last): File "/home/runner/workspace/pdf_table_extractor.py", line 44, in <module> import pandas as pd\nModuleNotFoundError: No module named 'pandas'`,
    diagnosis: {
      cause: "pandas is not installed in the Railway deployment environment. It exists locally but is missing from requirements.txt or was removed during a rebuild.",
      fix: "Add 'pandas==2.1.4' to requirements.txt and redeploy. Also add 'openpyxl>=3.1.2' as pandas dependency for Excel output.",
      confidence: 99,
    },
  },
  {
    type: "UnrecognisedInput",
    tool: "pdf-to-excel",
    severity: "MEDIUM",
    msg: `usage: pdf_table_extractor [-h] [-q] [-v] [--lang LANG] inputs [inputs ...] [output]\npdf_table_extractor: error: Unrecognised input(s): ['/tmp/upload-1HPPM5/0-1778224380481.tmp', '/tmp/pdf2xl-0xIcpK/output.xlsx']`,
    diagnosis: {
      cause: "pdf_table_extractor received a .tmp file instead of a renamed .pdf file. The upload pipeline is not renaming temp files before passing to the extractor.",
      fix: "In your upload handler, rename the temp file to have a .pdf extension before calling pdf_table_extractor: fs.renameSync(tmpPath, tmpPath.replace('.tmp','.pdf'))",
      confidence: 94,
    },
  },
  {
    type: "NoTablesFound",
    tool: "pdf-to-excel",
    severity: "MEDIUM",
    msg: `ERROR No usable tables found in 'input.pdf'. The PDF may contain no tables or only complex graphical content.`,
    diagnosis: {
      cause: "The PDF contains scanned images of tables (not real table structure), or uses graphical lines to simulate tables without actual tabular data.",
      fix: "Run OCR pre-processing with Tesseract before extraction. Add a fallback pipeline: if table extraction fails → try camelot with 'lattice' mode → if still fails → return descriptive error to user.",
      confidence: 88,
    },
  },
];

class MockServer {
  constructor(cb) {
    this.cb = cb;
    this.running = true;
    this.state = {
      activeJobs: 0,
      successRate: 67.9,
      successCount: 13,
      failedCount: 9,
      usersToday: 0,
      uptimeSeconds: 58,
      totalJobs: 28,
      pid: 26,
      cpu: 34.0,
      ram: 72.0,
      memoryMB: 283537,
      snapshotAge: 2,
      queue: { waiting: 0, active: 0, completed: 0, failed: 0 },
      redisOk: true,
      sqliteOk: true,
      supabaseOk: false,
      errors: REAL_ERRORS.map((e, i) => ({
        ...e,
        id: `err-${i}`,
        createdAt: Date.now() - (i + 1) * 45000,
        resolved: false,
        diagnosing: false,
        diagnosed: false,
      })),
      liveTools: [],
      activeUsers: [],
    };
    this._tick();
  }
  _tick() {
    if (!this.running) return;
    const s = this.state;
    s.uptimeSeconds++;
    s.cpu = Math.max(5, Math.min(95, s.cpu + (Math.random() - 0.48) * 3));
    s.ram = Math.max(20, Math.min(92, s.ram + (Math.random() - 0.5) * 1.5));
    s.snapshotAge = Math.max(1, Math.min(10, s.snapshotAge + (Math.random() > 0.5 ? 1 : -1)));

    // random job activity
    if (Math.random() > 0.82) {
      s.activeJobs = Math.max(0, s.activeJobs + (Math.random() > 0.5 ? 1 : -1));
      if (Math.random() > 0.5) { s.successCount++; s.totalJobs++; }
      s.successRate = s.totalJobs > 0 ? ((s.successCount / s.totalJobs) * 100) : 0;
    }

    // user tracking
    if (Math.random() > 0.88 && s.activeUsers.length < 6) {
      s.activeUsers.push({
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        tool: TOOLS[Math.floor(Math.random() * TOOLS.length)],
        since: Date.now(),
      });
      s.usersToday++;
    }
    if (s.activeUsers.length > 0 && Math.random() > 0.93) {
      s.activeUsers.splice(Math.floor(Math.random() * s.activeUsers.length), 1);
    }

    // live tool feed
    if (Math.random() > 0.78) {
      const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
      const ok = Math.random() > 0.3;
      s.liveTools.unshift({ id: Date.now(), tool, ok, ts: Date.now() });
      s.liveTools = s.liveTools.slice(0, 30);
      if (!ok) {
        s.failedCount++;
        s.queue.failed++;
      } else {
        s.queue.completed++;
      }
    }

    // auto-resolve errors after 20-40s
    s.errors = s.errors.filter(e => {
      if (!e.resolved && Date.now() - e.createdAt > 20000 + Math.random() * 20000) {
        return false; // disappears — resolved
      }
      return true;
    });

    this.cb({ ...s, errors: s.errors.map(e => ({ ...e })) });
    this._timer = setTimeout(() => this._tick(), 1000);
  }
  diagnose(errorId) {
    const e = this.state.errors.find(x => x.id === errorId);
    if (e) { e.diagnosing = true; }
  }
  finishDiagnose(errorId) {
    const e = this.state.errors.find(x => x.id === errorId);
    if (e) { e.diagnosing = false; e.diagnosed = true; }
  }
  close() { this.running = false; clearTimeout(this._timer); }
}

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const S = {
  root: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#c9d1d9",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: 13,
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px", borderBottom: "1px solid #21262d",
    background: "#161b22", position: "sticky", top: 0, zIndex: 100,
  },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "#fff" },
  badge: {
    background: "#21262d", border: "1px solid #30363d",
    borderRadius: 4, padding: "1px 7px", fontSize: 11, color: "#8b949e",
  },
  statusRow: { display: "flex", alignItems: "center", gap: 12 },
  dot: (ok) => ({ width: 7, height: 7, borderRadius: "50%", background: ok ? "#3fb950" : "#f85149", display: "inline-block", marginRight: 4 }),
  refreshBtn: {
    background: "#1f6feb", border: "none", color: "#fff",
    borderRadius: 6, padding: "5px 14px", cursor: "pointer",
    fontSize: 12, fontWeight: 600,
  },
  body: { padding: "16px" },
  cardsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 12 },
  card: {
    background: "#161b22", border: "1px solid #21262d",
    borderRadius: 8, padding: "14px 16px",
  },
  cardLabel: { fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 },
  cardValue: (color) => ({ fontSize: 26, fontWeight: 800, color: color || "#fff", lineHeight: 1.1 }),
  cardSub: { fontSize: 11, color: "#8b949e", marginTop: 3 },
  section: { background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "14px 16px", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#c9d1d9", marginBottom: 12 },
  barWrap: { marginBottom: 10 },
  barRow: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 },
  barTrack: { height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden" },
  barFill: (pct, color) => ({
    height: "100%", width: `${Math.min(100, pct)}%`,
    background: pct > 80 ? "#f85149" : pct > 60 ? "#d29922" : color,
    borderRadius: 3, transition: "width .7s ease",
  }),
  qGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 },
  qCell: { textAlign: "center", background: "#0d1117", borderRadius: 6, padding: "12px 0" },
  qNum: (color) => ({ fontSize: 24, fontWeight: 800, color }),
  qLabel: { fontSize: 11, color: "#8b949e", marginTop: 2 },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #21262d", marginBottom: 12 },
  tab: (active) => ({
    padding: "8px 14px", fontSize: 12, cursor: "pointer", border: "none",
    background: "transparent", color: active ? "#fff" : "#8b949e",
    borderBottom: active ? "2px solid #1f6feb" : "2px solid transparent",
    fontFamily: "inherit",
  }),
  errorCard: (sev) => ({
    background: sev === "CRITICAL" ? "rgba(248,81,73,.06)" : "rgba(210,153,34,.06)",
    border: `1px solid ${sev === "CRITICAL" ? "#f8514933" : "#d2993244"}`,
    borderRadius: 6, padding: "10px 12px", marginBottom: 8,
    transition: "all .3s ease",
  }),
  errorTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  sevBadge: (sev) => ({
    background: sev === "CRITICAL" ? "rgba(248,81,73,.2)" : "rgba(210,153,34,.2)",
    color: sev === "CRITICAL" ? "#f85149" : "#d29922",
    border: `1px solid ${sev === "CRITICAL" ? "#f85149" : "#d29922"}44`,
    borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700,
    letterSpacing: ".06em", flexShrink: 0,
  }),
  toolBadge: {
    background: "#21262d", border: "1px solid #30363d",
    borderRadius: 4, padding: "1px 7px", fontSize: 10, color: "#8b949e",
  },
  errorMsg: {
    fontSize: 11, color: "#8b949e", marginTop: 6,
    fontFamily: "'SF Mono','Fira Code',monospace",
    whiteSpace: "pre-wrap", wordBreak: "break-all",
    maxHeight: 60, overflow: "hidden",
  },
  diagnoseBtn: {
    background: "#1f6feb", border: "none", color: "#fff",
    borderRadius: 5, padding: "4px 12px", fontSize: 11,
    cursor: "pointer", fontWeight: 600, flexShrink: 0,
    fontFamily: "inherit",
  },
  diagnosisBox: {
    marginTop: 10, background: "#0d1117",
    border: "1px solid #1f6feb44", borderRadius: 6, padding: "10px 12px",
  },
  diagRow: { marginBottom: 6 },
  diagLabel: { fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: ".07em" },
  diagVal: { fontSize: 12, color: "#c9d1d9", marginTop: 2 },
  copyBtn: {
    marginTop: 8, background: "#21262d", border: "1px solid #30363d",
    color: "#8b949e", borderRadius: 5, padding: "3px 10px",
    fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  liveRow: (ok) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
    borderBottom: "1px solid #21262d11", fontSize: 11,
    color: ok ? "#3fb950" : "#f85149",
  }),
  userRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: 11,
  },
  updatedDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#3fb950", display: "inline-block", marginRight: 6,
    animation: "blink 1.4s infinite",
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export default function OpsDashboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("errors");
  const [diagnosedMap, setDiagnosedMap] = useState({});
  const [diagnosingId, setDiagnosingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(false);
  const serverRef = useRef(null);
  const tickRef = useRef(null);

  // ── connect to server (mock now, real SSE in prod) ──────────────
  useEffect(() => {
    // PRODUCTION: replace MockServer with real SSE like this:
    //
    // const es = new EventSource(SSE_ENDPOINT);
    // es.onopen = () => setConnected(true);
    // es.onmessage = (e) => { setData(JSON.parse(e.data)); setLastUpdate(Date.now()); };
    // es.onerror = () => { setConnected(false); setTimeout(() => reconnect(), 3000); };
    // return () => es.close();

    setConnected(true);
    serverRef.current = new MockServer((payload) => {
      setData(payload);
      setLastUpdate(Date.now());
    });
    return () => serverRef.current?.close();
  }, []);

  // ── diagnose handler ────────────────────────────────────────────
  const handleDiagnose = useCallback((errId) => {
    setDiagnosingId(errId);
    // simulate AI diagnosis call (replace with: fetch(`/api/diagnose/${errId}`))
    setTimeout(() => {
      setDiagnosingId(null);
      setDiagnosedMap(p => ({ ...p, [errId]: true }));
    }, 2200);
  }, []);

  // ── copy report ─────────────────────────────────────────────────
  const copyReport = useCallback((err) => {
    const d = err.diagnosis;
    const report = `=== Diagnosis Report ===\nTool: ${err.tool}\nType: ${err.type}\nSeverity: ${err.severity}\nTime: ${new Date(err.createdAt).toISOString()}\n\nError:\n${err.msg}\n\nRoot Cause:\n${d?.cause}\n\nFix:\n${d?.fix}\n\nConfidence: ${d?.confidence}%`;
    navigator.clipboard.writeText(report).catch(() => {});
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (!data) {
    return (
      <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#8b949e" }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Connecting to server...</div>
          <div style={{ width: 120, height: 3, background: "#21262d", borderRadius: 2, overflow: "hidden", margin: "0 auto" }}>
            <div style={{ height: "100%", width: "40%", background: "#1f6feb", animation: "slide 1.2s infinite", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    );
  }

  const successPct = data.successRate?.toFixed(1) || "0.0";
  const errors = data.errors || [];
  const liveTools = data.liveTools || [];
  const activeUsers = data.activeUsers || [];

  return (
    <div style={S.root}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slide { 0%{transform:translateX(-200%)} 100%{transform:translateX(400%)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .err-card { animation: fadeIn .3s ease; }
        .diagnose-btn:hover { background: #388bfd !important; }
        .copy-btn:hover { color: #c9d1d9 !important; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <div style={S.brand}>
          <span>⚡</span>
          <span>Toolify Ops</span>
          <span style={S.badge}>INTERNAL</span>
        </div>
        <div style={S.statusRow}>
          <span><span style={S.dot(data.redisOk)} />Redis</span>
          <span><span style={S.dot(data.sqliteOk)} />SQLite</span>
          <span><span style={S.dot(data.supabaseOk)} />Supabase</span>
          <span style={{ color: "#8b949e", fontSize: 11 }}>
            {connected && <span style={S.updatedDot} />}
            Updated {lastUpdate ? timeAgo(lastUpdate) : "—"}
          </span>
          <button style={S.refreshBtn} onClick={() => window.location.reload()}>↻ Refresh</button>
        </div>
      </div>

      <div style={S.body}>

        {/* ── STAT CARDS ── */}
        <div style={S.cardsRow}>
          <div style={S.card}>
            <div style={S.cardLabel}>🔧 Active Jobs</div>
            <div style={S.cardValue("#f0883e")}>{data.activeJobs ?? 0}</div>
            <div style={S.cardSub}>{data.queue?.waiting ?? 0} waiting</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>✅ Success Rate</div>
            <div style={S.cardValue("#3fb950")}>{successPct}%</div>
            <div style={S.cardSub}>{data.successCount ?? 0} jobs today</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>✗ Failed</div>
            <div style={S.cardValue("#f85149")}>{data.failedCount ?? 0}</div>
            <div style={S.cardSub}>0 in last 5m</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>👤 Users Today</div>
            <div style={S.cardValue("#79c0ff")}>
              {data.usersToday > 0 ? data.usersToday : activeUsers.length > 0 ? activeUsers.length : "0"}
            </div>
            <div style={S.cardSub}>{activeUsers.length} active now</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>🕐 Uptime</div>
            <div style={S.cardValue("#79c0ff")} style={{ fontSize: 18, fontWeight: 800, color: "#79c0ff" }}>
              {fmtUptime(data.uptimeSeconds)}
            </div>
            <div style={S.cardSub}>PID {data.pid ?? "—"}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>📦 Total Jobs</div>
            <div style={S.cardValue("#f0883e")}>{data.totalJobs ?? 0}</div>
            <div style={S.cardSub}>all time</div>
          </div>
        </div>

        {/* ── SYSTEM RESOURCES ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>System Resources</div>
          <div style={S.barWrap}>
            <div style={S.barRow}>
              <span>CPU</span>
              <span style={{ color: data.cpu > 80 ? "#f85149" : data.cpu > 60 ? "#d29922" : "#3fb950", fontWeight: 700 }}>
                {data.cpu?.toFixed(1)}%
              </span>
              <span style={{ flex: 1 }} />
              <span>Memory</span>
              <span style={{ color: data.ram > 80 ? "#f85149" : data.ram > 60 ? "#d29922" : "#d29922", fontWeight: 700, marginLeft: 8 }}>
                {data.ram?.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={S.barTrack}><div style={S.barFill(data.cpu, "#1f6feb")} /></div>
              <div style={S.barTrack}><div style={S.barFill(data.ram, "#d29922")} /></div>
            </div>
            <div style={{ fontSize: 10, color: "#8b949e", marginTop: 5 }}>
              Memory: {data.memoryMB?.toLocaleString()} MB used · Snapshot age: {data.snapshotAge ?? 0}s
            </div>
          </div>
        </div>

        {/* ── BULLMQ QUEUE ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>BullMQ Queue</div>
          <div style={S.qGrid}>
            <div style={S.qCell}>
              <div style={S.qNum("#79c0ff")}>{data.queue?.waiting ?? 0}</div>
              <div style={S.qLabel}>Waiting</div>
            </div>
            <div style={S.qCell}>
              <div style={S.qNum("#3fb950")}>{data.queue?.active ?? 0}</div>
              <div style={S.qLabel}>Active</div>
            </div>
            <div style={S.qCell}>
              <div style={S.qNum("#3fb950")}>{data.queue?.completed ?? 0}</div>
              <div style={S.qLabel}>Completed</div>
            </div>
            <div style={S.qCell}>
              <div style={S.qNum("#f85149")}>{data.queue?.failed ?? 0}</div>
              <div style={S.qLabel}>Failed</div>
            </div>
          </div>
        </div>

        {/* ── ACTIVE USERS ── */}
        {activeUsers.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>🟢 Active Users ({activeUsers.length})</div>
            {activeUsers.map(u => (
              <div key={u.id} style={S.userRow}>
                <span style={{ color: "#3fb950", fontWeight: 700 }}>{u.id}</span>
                <span style={{ ...S.toolBadge }}>{u.tool}</span>
                <span style={{ color: "#8b949e" }}>{timeAgo(u.since)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── TABS: ERRORS / TOOL STATS / LIVE FEED ── */}
        <div style={S.section}>
          <div style={S.tabs}>
            <button style={S.tab(tab === "errors")} onClick={() => setTab("errors")}>
              🔴 Errors ({errors.length})
            </button>
            <button style={S.tab(tab === "tools")} onClick={() => setTab("tools")}>
              📊 Tool Stats ({TOOLS.length})
            </button>
            <button style={S.tab(tab === "live")} onClick={() => setTab("live")}>
              📡 Live Feed ({liveTools.length} tools)
            </button>
          </div>

          {/* ERRORS TAB */}
          {tab === "errors" && (
            <div>
              {errors.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#3fb950", fontSize: 13 }}>
                  ✅ No active errors
                </div>
              )}
              {errors.map(err => {
                const isDiagnosing = diagnosingId === err.id;
                const isDiagnosed = diagnosedMap[err.id];
                return (
                  <div key={err.id} className="err-card" style={S.errorCard(err.severity)}>
                    <div style={S.errorTop}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={S.sevBadge(err.severity)}>{err.severity}</span>
                        <span style={S.toolBadge}>{err.tool}</span>
                        <span style={{ fontSize: 10, color: "#8b949e" }}>{timeAgo(err.createdAt)}</span>
                      </div>
                      {!isDiagnosed && (
                        <button
                          className="diagnose-btn"
                          style={{ ...S.diagnoseBtn, opacity: isDiagnosing ? .7 : 1 }}
                          onClick={() => !isDiagnosing && handleDiagnose(err.id)}
                          disabled={isDiagnosing}
                        >
                          {isDiagnosing ? (
                            <span>
                              <span style={{ display: "inline-block", animation: "spin .8s linear infinite", marginRight: 5 }}>⟳</span>
                              Diagnosing...
                            </span>
                          ) : "🔍 Diagnose"}
                        </button>
                      )}
                    </div>
                    <div style={S.errorMsg}>{err.msg}</div>

                    {/* DIAGNOSIS RESULT */}
                    {isDiagnosed && err.diagnosis && (
                      <div style={{ ...S.diagnosisBox, animation: "fadeIn .3s ease" }}>
                        <div style={S.diagRow}>
                          <div style={S.diagLabel}>Root Cause</div>
                          <div style={S.diagVal}>{err.diagnosis.cause}</div>
                        </div>
                        <div style={S.diagRow}>
                          <div style={S.diagLabel}>Recommended Fix</div>
                          <div style={{ ...S.diagVal, color: "#3fb950" }}>{err.diagnosis.fix}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 11, color: "#8b949e" }}>
                            Confidence: <span style={{ color: "#79c0ff", fontWeight: 700 }}>{err.diagnosis.confidence}%</span>
                          </div>
                          <button
                            className="copy-btn"
                            style={S.copyBtn}
                            onClick={() => copyReport(err)}
                          >
                            {copiedId === err.id ? "✓ Copied!" : "📋 Copy Report"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TOOL STATS TAB */}
          {tab === "tools" && (
            <div>
              {TOOLS.map(tool => {
                const stat = data.liveTools?.filter(e => e.tool === tool) || [];
                const success = stat.filter(e => e.ok).length;
                const fail = stat.filter(e => !e.ok).length;
                const total = success + fail;
                const pct = total > 0 ? (success / total * 100) : 100;
                return (
                  <div key={tool} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={S.toolBadge}>{tool}</span>
                      <span>
                        <span style={{ color: "#3fb950" }}>✓ {success}</span>
                        <span style={{ color: "#8b949e", margin: "0 4px" }}>/</span>
                        <span style={{ color: "#f85149" }}>✗ {fail}</span>
                        <span style={{ color: "#8b949e", marginLeft: 8 }}>{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div style={S.barTrack}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#3fb950" : pct > 50 ? "#d29922" : "#f85149", borderRadius: 3, transition: "width .7s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIVE FEED TAB */}
          {tab === "live" && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {liveTools.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#8b949e" }}>Waiting for events...</div>
              )}
              {liveTools.map(e => (
                <div key={e.id} style={S.liveRow(e.ok)}>
                  <span>{e.ok ? "✓" : "✗"}</span>
                  <span style={S.toolBadge}>{e.tool}</span>
                  <span style={{ color: "#8b949e", marginLeft: "auto" }}>{timeAgo(e.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
