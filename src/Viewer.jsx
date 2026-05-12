import { useState, useEffect, useRef } from "react";
import useInsightly from "./useInsightly";

export default function Viewer({ onExit }) {
  const { report, error, loadFile } = useInsightly();
  const [graphIndex, setGraphIndex] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const [animated, setAnimated] = useState(false);

  // Swipe tracking
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const SWIPE_THRESHOLD = 50; // minimum px to count as a swipe

  const currentGraph = report ? report.graphs[graphIndex] : null;
  const data = currentGraph ? currentGraph.chartData : null;
  const max = data && data.length ? data.reduce((a, b) => a.value > b.value ? a : b).value : 1;

  useEffect(() => {
    if (data) {
      setAnimated(false);
      setTimeout(() => setAnimated(true), 120);
    }
  }, [graphIndex, data]);

  useEffect(() => {
    setShowInsight(false);
  }, [graphIndex]);

  function goTo(index) {
    if (!report) return;
    if (index < 0 || index >= report.graphs.length) return;
    setGraphIndex(index);
  }

  // Swipe handlers
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }

  function onTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
  }

  function onTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) {
      // swiped left → next graph
      goTo(graphIndex + 1);
    } else {
      // swiped right → prev graph
      goTo(graphIndex - 1);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerDot} />
          <h2 style={styles.title}>
            {report ? report.title : "Insightly"}
          </h2>
        </div>
        {report && (
          <p style={styles.subtitle}>{currentGraph?.title}</p>
        )}
      </div>

      {/* File loader */}
      {!report ? (
        <div style={styles.dropZone}>
          <input
            type="file"
            accept=".insightly"
            id="insightlyInput"
            style={{ display: "none" }}
            onChange={(e) => loadFile(e.target.files[0])}
          />
          <label htmlFor="insightlyInput" style={styles.dropLabel}>
            <div style={styles.dropIcon}>📄</div>
            <div style={styles.dropText}>Load your report</div>
            <div style={styles.dropSubtext}>
              Open a .insightly file shared with you
            </div>
          </label>
          {error && <div style={styles.errorText}>{error}</div>}
        </div>
      ) : (
        <>
          {/* Counter dots */}
          <div style={styles.counterRow}>
            {report.graphs.map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.counterDot,
                  backgroundColor: i === graphIndex ? "#2272c3" : "#2a2a2a",
                  width: i === graphIndex ? 18 : 6, // active dot is wider
                }}
              />
            ))}
          </div>

          {/* Swipeable content area */}
          <div
            style={styles.contentArea}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {!showInsight ? (
              <div>
                <div style={styles.chartTitle}>{currentGraph.title}</div>
                {data.map((item) => {
                  const pct = (item.value / max) * 100;
                  return (
                    <div key={item.name} style={styles.barGroup}>
                      <div style={styles.barName}>{item.name}</div>
                      <div style={styles.barRow}>
                        <div style={styles.barTrack}>
                          <div style={{
                            ...styles.barFill,
                            width: animated ? `${pct}%` : "0%",
                          }} />
                        </div>
                        <div style={styles.barValue}>
                          ${item.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Swipe hint — only shows on first graph */}
                {graphIndex === 0 && report.graphs.length > 1 && (
                  <p style={styles.swipeHint}>← swipe to navigate →</p>
                )}
              </div>
            ) : (
              <div style={styles.insightView}>
                <div style={styles.insightTag}>Insight</div>
                <p style={styles.insightText}>{currentGraph.insight}</p>
                {currentGraph.stats?.length > 0 && (
                  <>
                    <div style={styles.divider} />
                    <div style={styles.statGrid}>
                      {currentGraph.stats.map((s) => (
                        <div key={s.label} style={styles.statCard}>
                          <div style={styles.statLabel}>{s.label}</div>
                          <div style={styles.statValue}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Insight toggle */}
          <button
            style={styles.toggleBtn}
            onClick={() => setShowInsight(!showInsight)}
          >
            <div style={styles.btnDot} />
            {showInsight ? "View Chart" : "View Insight"}
          </button>

          {/* Prev / Next navigation */}
          <div style={styles.navRow}>
            <button
              style={{
                ...styles.navBtn,
                opacity: graphIndex === 0 ? 0.3 : 1,
              }}
              onClick={() => goTo(graphIndex - 1)}
              disabled={graphIndex === 0}
            >
              ← Prev
            </button>
            <span style={styles.navCount}>
              {graphIndex + 1} of {report.graphs.length}
            </span>
            <button
              style={{
                ...styles.navBtn,
                opacity: graphIndex === report.graphs.length - 1 ? 0.3 : 1,
              }}
              onClick={() => goTo(graphIndex + 1)}
              disabled={graphIndex === report.graphs.length - 1}
            >
              Next →
            </button>
          </div>

          <button style={styles.exitBtn} onClick={onExit}>
            ← Back to home
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  app: {
    maxWidth: 390,
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0f0f0f",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  header: {
    padding: "20px 20px 14px",
    borderBottom: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  headerTop: { display: "flex", alignItems: "center", gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2272c3" },
  title: { fontSize: 15, fontWeight: 600, color: "#f0f0f0", margin: 0, letterSpacing: "-0.01em" },
  subtitle: { fontSize: 11, color: "#555", paddingLeft: 16 },
  dropZone: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: "40px 20px",
  },
  dropLabel: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, width: "100%", padding: "40px 20px",
    border: "1px dashed #2a2a2a", borderRadius: 16,
    cursor: "pointer", backgroundColor: "#161616",
  },
  dropIcon: { fontSize: 32 },
  dropText: { fontSize: 14, fontWeight: 500, color: "#e0e0e0" },
  dropSubtext: { fontSize: 11, color: "#444", textAlign: "center" },
  errorText: { marginTop: 16, fontSize: 12, color: "#e05a5a", textAlign: "center" },
  counterRow: {
    display: "flex", gap: 6,
    justifyContent: "center",
    alignItems: "center",
    padding: "12px 20px 0",
  },
  counterDot: {
    height: 6, borderRadius: 3,
    transition: "all 0.25s ease",
  },
  contentArea: {
    padding: "16px 20px",
    flex: 1,
    userSelect: "none", // prevents text selection while swiping
  },
  chartTitle: {
    fontSize: 10, fontWeight: 500, color: "#444",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16,
  },
  barGroup: { marginBottom: 13 },
  barName: { fontSize: 12, color: "#aaa", marginBottom: 5 },
  barRow: { display: "flex", alignItems: "center", gap: 10 },
  barTrack: { flex: 1, height: 20, backgroundColor: "#1a1a1a", borderRadius: 5, overflow: "hidden" },
  barFill: {
    height: "100%", borderRadius: 5,
    background: "linear-gradient(90deg, #1a4f8a, #2272c3)",
    transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  barValue: { fontSize: 11, fontWeight: 600, color: "#e0e0e0", whiteSpace: "nowrap", width: 54, textAlign: "right" },
  swipeHint: {
    fontSize: 11, color: "#333",
    textAlign: "center", marginTop: 24,
  },
  insightView: { display: "flex", flexDirection: "column", gap: 16 },
  insightTag: { fontSize: 10, fontWeight: 600, color: "#2272c3", textTransform: "uppercase", letterSpacing: "0.08em" },
  insightText: { fontSize: 14, color: "#ccc", lineHeight: 1.7 },
  divider: { height: 1, backgroundColor: "#1e1e1e" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  statCard: { backgroundColor: "#161616", border: "1px solid #222", borderRadius: 10, padding: "12px 14px" },
  statLabel: { fontSize: 10, color: "#444", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontSize: 16, fontWeight: 600, color: "#e0e0e0", letterSpacing: "-0.02em" },
  toggleBtn: {
    margin: "20px 20px 8px", padding: 14, borderRadius: 12,
    border: "1px solid #222", backgroundColor: "#161616",
    color: "#e0e0e0", fontSize: 13, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  btnDot: { width: 7, height: 7, borderRadius: "50%", backgroundColor: "#2272c3", flexShrink: 0 },
  navRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px", marginBottom: 4,
  },
  navBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #222",
    backgroundColor: "transparent", color: "#e0e0e0", fontSize: 12,
    fontWeight: 500, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  navCount: { fontSize: 11, color: "#444" },
  exitBtn: {
    margin: "0 20px 24px", padding: 10, borderRadius: 12,
    border: "none", backgroundColor: "transparent",
    color: "#444", fontSize: 12, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
};