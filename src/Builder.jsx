import { useState } from "react";
import Viewer from "./Viewer";

function detectColumnTypes(rows) {
  if (!rows.length) return { dimensions: [], measures: [] };
  const headers = Object.keys(rows[0]);
  const dimensions = [];
  const measures = [];
  headers.forEach((col) => {
    const samples = rows.slice(0, 10).map((r) => r[col]).filter(Boolean);
    const isNumeric = samples.every((v) => !isNaN(parseFloat(v)));
    if (isNumeric) measures.push(col);
    else dimensions.push(col);
  });
  return { dimensions, measures };
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i]?.trim() ?? ""; });
    return row;
  });
}

function newGraph(id) {
  return {
    id, title: "", dimension: "", measure: "",
    aggregation: "sum", chartType: "bar", insight: "", stats: [],
  };
}

export default function Builder({ onExit }) {
  const [mode, setMode] = useState("build"); // "build" | "preview"
  const [csvRows, setCsvRows] = useState(null);
  const [columnTypes, setColumnTypes] = useState(null);
  const [graphs, setGraphs] = useState([]);
  const [reportTitle, setReportTitle] = useState("My Report");
  const [editingGraph, setEditingGraph] = useState(null);
  const [error, setError] = useState(null);

  // Check if there's existing work before replacing
  function hasWork() {
    return csvRows !== null || graphs.length > 0;
  }

  // Load CSV
  function handleCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        const types = detectColumnTypes(rows);
        if (!types.measures.length || !types.dimensions.length) {
          setError("CSV needs at least one text column and one number column.");
          return;
        }
        setCsvRows(rows);
        setColumnTypes(types);
        setError(null);
      } catch {
        setError("Could not read CSV. Check the file format.");
      }
    };
    reader.readAsText(file);
  }

  // Load existing .insightly file
  function handleInsightly(file) {
    if (!file) return;
    if (hasWork()) {
      const confirmed = window.confirm(
        "Loading this will replace your current work. Continue?"
      );
      if (!confirmed) return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.graphs || !parsed.data) {
          setError("Invalid .insightly file.");
          return;
        }
        const types = detectColumnTypes(parsed.data);
        setCsvRows(parsed.data);
        setColumnTypes(types);
        setGraphs(parsed.graphs);
        setReportTitle(parsed.title || "My Report");
        setError(null);
        setEditingGraph(null);
      } catch {
        setError("Could not read .insightly file.");
      }
    };
    reader.readAsText(file);
  }

  function addGraph() {
    const graph = newGraph(Date.now());
    graph.dimension = columnTypes.dimensions[0];
    graph.measure = columnTypes.measures[0];
    setGraphs([...graphs, graph]);
    setEditingGraph(graph.id);
  }

  function saveGraph(updated) {
    setGraphs(graphs.map((g) => (g.id === updated.id ? updated : g)));
    setEditingGraph(null);
  }

  function deleteGraph(id) {
    setGraphs(graphs.filter((g) => g.id !== id));
    if (editingGraph === id) setEditingGraph(null);
  }

  function exportFile() {
    const report = {
      version: "1.0",
      title: reportTitle,
      createdBy: "Analyst",
      createdAt: new Date().toISOString().split("T")[0],
      graphs,
      data: csvRows,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, "_")}.insightly`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Graph editor screen — no mode toggle here, just editing
  if (editingGraph !== null) {
    const graph = graphs.find((g) => g.id === editingGraph);
    return (
      <GraphEditor
        graph={graph}
        columnTypes={columnTypes}
        onSave={saveGraph}
        onDelete={() => deleteGraph(graph.id)}
        onBack={() => setEditingGraph(null)}
      />
    );
  }

  return (
    <div style={styles.app}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerDot} />
          <h2 style={styles.title}>Report Builder</h2>
        </div>

        {/* Mode toggle — always visible */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: mode === "build" ? "#e0a020" : "transparent",
              color: mode === "build" ? "#0f0f0f" : "#555",
            }}
            onClick={() => setMode("build")}
          >
            Build
          </button>
          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: mode === "preview" ? "#2272c3" : "transparent",
              color: mode === "preview" ? "#fff" : "#555",
            }}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Preview mode — inline viewer */}
      {mode === "preview" ? (
        <PreviewViewer graphs={graphs} csvRows={csvRows} reportTitle={reportTitle} />
      ) : (

        /* Build mode */
        <>
          <div style={styles.contentArea}>

            {/* Report title */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Report Title</div>
              <input
                style={styles.input}
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Coffee Shop Sales"
              />
            </div>

            {/* File loaders */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Data Source</div>

              {!csvRows ? (
                <div style={styles.fileRow}>
                  {/* Load CSV */}
                  <input
                    type="file" accept=".csv"
                    id="csvInput" style={{ display: "none" }}
                    onChange={(e) => handleCSV(e.target.files[0])}
                  />
                  <label htmlFor="csvInput" style={styles.fileBtn}>
                    📂 Load CSV
                  </label>

                  {/* Load existing .insightly */}
                  <input
                    type="file" accept=".insightly"
                    id="insightlyInput" style={{ display: "none" }}
                    onChange={(e) => handleInsightly(e.target.files[0])}
                  />
                  <label htmlFor="insightlyInput" style={styles.fileBtn}>
                    📄 Open Report
                  </label>
                </div>
              ) : (
                <div style={styles.csvLoaded}>
                  <span style={styles.csvCheck}>✓</span>
                  <span style={styles.csvInfo}>
                    {csvRows.length} rows · {Object.keys(csvRows[0]).length} columns
                  </span>
                  <button
                    style={styles.csvReload}
                    onClick={() => {
                      setCsvRows(null);
                      setColumnTypes(null);
                      setGraphs([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              )}
              {error && <div style={styles.errorText}>{error}</div>}
            </div>

            {/* Graph list */}
            {csvRows && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>
                  Graphs ({graphs.length})
                </div>

                {graphs.length === 0 && (
                  <p style={styles.emptyText}>No graphs yet. Add one below.</p>
                )}

                {graphs.map((g, i) => (
                  <div key={g.id} style={styles.graphCard}>
                    <div style={styles.graphCardLeft}>
                      <div style={styles.graphCardNum}>{i + 1}</div>
                      <div>
                        <div style={styles.graphCardTitle}>
                          {g.title || "Untitled graph"}
                        </div>
                        <div style={styles.graphCardMeta}>
                          {g.dimension} · {g.aggregation} of {g.measure}
                        </div>
                      </div>
                    </div>
                    <button
                      style={styles.editBtn}
                      onClick={() => setEditingGraph(g.id)}
                    >
                      Edit
                    </button>
                  </div>
                ))}

                <button style={styles.addBtn} onClick={addGraph}>
                  + Add Graph
                </button>
              </div>
            )}
          </div>

          {/* Export */}
          {csvRows && graphs.length > 0 && (
            <button style={styles.exportBtn} onClick={exportFile}>
              Export .insightly
            </button>
          )}

          <button style={styles.exitBtn} onClick={onExit}>
            ← Back to home
          </button>
        </>
      )}
    </div>
  );
}

// ── Inline Preview ────────────────────────────────────────────────────────────
// Same logic as Viewer but reads from props instead of a file
// This is what the analyst sees when they tap Preview

function PreviewViewer({ graphs, csvRows, reportTitle }) {
  const [graphIndex, setGraphIndex] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const [animated, setAnimated] = useState(true);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];

  // Process chart data for the current graph on the fly
  function getChartData(graph) {
    if (!csvRows || !graph.dimension || !graph.measure) return [];
    const grouped = {};
    const counts = {};
    csvRows.forEach((row) => {
      const key = row[graph.dimension];
      const val = parseFloat(row[graph.measure]) || 0;
      if (!key) return;
      grouped[key] = (grouped[key] || 0) + val;
      counts[key] = (counts[key] || 0) + 1;
    });

    let result = Object.entries(grouped).map(([name, total]) => ({
      name,
      value: graph.aggregation === "avg"
        ? Math.round((total / counts[name]) * 100) / 100
        : Math.round(total * 100) / 100,
    }));

    // Sort months in calendar order, everything else by value
    if (graph.dimension === "Month_name" || graph.dimension === "month_name") {
      result.sort((a, b) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name));
    } else {
      result.sort((a, b) => b.value - a.value);
    }

    return result;
  }

  const currentGraph = graphs[graphIndex];
  const data = currentGraph ? getChartData(currentGraph) : [];
  const max = data.length ? data.reduce((a, b) => a.value > b.value ? a : b).value : 1;

  function goTo(index) {
    setGraphIndex(index);
    setShowInsight(false);
    setAnimated(false);
    setTimeout(() => setAnimated(true), 120);
  }

  if (!graphs.length || !csvRows) {
    return (
      <div style={previewStyles.empty}>
        <p style={previewStyles.emptyText}>
          Add at least one graph and load a CSV to preview.
        </p>
      </div>
    );
  }

  return (
    <div style={previewStyles.wrap}>

      {/* Counter dots */}
      <div style={previewStyles.counterRow}>
        {graphs.map((_, i) => (
          <div
            key={i}
            style={{
              ...previewStyles.counterDot,
              backgroundColor: i === graphIndex ? "#2272c3" : "#2a2a2a",
            }}
          />
        ))}
      </div>

      <div style={previewStyles.contentArea}>
        {!showInsight ? (
          <div>
            <div style={previewStyles.chartTitle}>{currentGraph.title}</div>
            {data.map((item) => {
              const pct = (item.value / max) * 100;
              return (
                <div key={item.name} style={previewStyles.barGroup}>
                  <div style={previewStyles.barName}>{item.name}</div>
                  <div style={previewStyles.barRow}>
                    <div style={previewStyles.barTrack}>
                      <div style={{
                        ...previewStyles.barFill,
                        width: animated ? `${pct}%` : "0%",
                      }} />
                    </div>
                    <div style={previewStyles.barValue}>
                      ${item.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={previewStyles.insightView}>
            <div style={previewStyles.insightTag}>Insight</div>
            <p style={previewStyles.insightText}>{currentGraph.insight}</p>
            {currentGraph.stats?.length > 0 && (
              <>
                <div style={previewStyles.divider} />
                <div style={previewStyles.statGrid}>
                  {currentGraph.stats.map((s) => (
                    <div key={s.label} style={previewStyles.statCard}>
                      <div style={previewStyles.statLabel}>{s.label}</div>
                      <div style={previewStyles.statValue}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        style={previewStyles.toggleBtn}
        onClick={() => setShowInsight(!showInsight)}
      >
        <div style={previewStyles.btnDot} />
        {showInsight ? "View Chart" : "View Insight"}
      </button>

      <div style={previewStyles.navRow}>
        <button
          style={{ ...previewStyles.navBtn, opacity: graphIndex === 0 ? 0.3 : 1 }}
          onClick={() => goTo(graphIndex - 1)}
          disabled={graphIndex === 0}
        >
          ← Prev
        </button>
        <span style={previewStyles.navCount}>
          {graphIndex + 1} of {graphs.length}
        </span>
        <button
          style={{
            ...previewStyles.navBtn,
            opacity: graphIndex === graphs.length - 1 ? 0.3 : 1,
          }}
          onClick={() => goTo(graphIndex + 1)}
          disabled={graphIndex === graphs.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Graph Editor ──────────────────────────────────────────────────────────────

function GraphEditor({ graph, columnTypes, onSave, onDelete, onBack }) {
  const [form, setForm] = useState({ ...graph });
  const [newStatLabel, setNewStatLabel] = useState("");
  const [newStatValue, setNewStatValue] = useState("");

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  function addStat() {
    if (!newStatLabel || !newStatValue) return;
    update("stats", [...form.stats, { label: newStatLabel, value: newStatValue }]);
    setNewStatLabel("");
    setNewStatValue("");
  }

  function removeStat(index) {
    update("stats", form.stats.filter((_, i) => i !== index));
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerDot} />
          <h2 style={styles.title}>Edit Graph</h2>
        </div>
        <p style={styles.subtitle}>Configure this graph</p>
      </div>

      <div style={styles.contentArea}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Graph Title</div>
          <input
            style={styles.input}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Revenue by Product"
          />
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Dimension (Group By)</div>
          <select
            style={styles.select}
            value={form.dimension}
            onChange={(e) => update("dimension", e.target.value)}
          >
            {columnTypes.dimensions.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Measure (Calculate)</div>
          <select
            style={styles.select}
            value={form.measure}
            onChange={(e) => update("measure", e.target.value)}
          >
            {columnTypes.measures.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Aggregation</div>
          <div style={styles.pillRow}>
            {["sum", "avg"].map((agg) => (
              <button
                key={agg}
                style={{
                  ...styles.pill,
                  backgroundColor: form.aggregation === agg ? "#2272c3" : "transparent",
                  color: form.aggregation === agg ? "#fff" : "#888",
                }}
                onClick={() => update("aggregation", agg)}
              >
                {agg === "sum" ? "Sum" : "Average"}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Insight Text</div>
          <textarea
            style={styles.textarea}
            value={form.insight}
            onChange={(e) => update("insight", e.target.value)}
            placeholder="Write a plain-English explanation of this graph..."
            rows={4}
          />
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Stat Cards</div>
          {form.stats.map((s, i) => (
            <div key={i} style={styles.statRow}>
              <div style={styles.statRowText}>
                <span style={styles.statRowLabel}>{s.label}</span>
                <span style={styles.statRowValue}>{s.value}</span>
              </div>
              <button style={styles.removeBtn} onClick={() => removeStat(i)}>✕</button>
            </div>
          ))}
          <div style={styles.statInputRow}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Label"
              value={newStatLabel}
              onChange={(e) => setNewStatLabel(e.target.value)}
            />
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Value"
              value={newStatValue}
              onChange={(e) => setNewStatValue(e.target.value)}
            />
            <button style={styles.addStatBtn} onClick={addStat}>+</button>
          </div>
        </div>
      </div>

      <button style={styles.previewBtn} onClick={() => onSave(form)}>
        Save Graph
      </button>
      <button
        style={{ ...styles.exitBtn, color: "#e05a5a" }}
        onClick={onDelete}
      >
        Delete this graph
      </button>
      <button style={styles.exitBtn} onClick={onBack}>← Back</button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  app: {
    maxWidth: 390, margin: "0 auto", minHeight: "100vh",
    display: "flex", flexDirection: "column",
    backgroundColor: "#0f0f0f",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  header: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid #1e1e1e",
    display: "flex", flexDirection: "column", gap: 10,
  },
  headerTop: { display: "flex", alignItems: "center", gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#e0a020" },
  title: { fontSize: 15, fontWeight: 600, color: "#f0f0f0", margin: 0, letterSpacing: "-0.01em" },
  subtitle: { fontSize: 11, color: "#e0a020", paddingLeft: 16 },
  modeToggle: {
    display: "flex", gap: 4,
    backgroundColor: "#161616",
    border: "1px solid #222",
    borderRadius: 10, padding: 3,
    alignSelf: "flex-start",
  },
  modeBtn: {
    padding: "5px 16px", borderRadius: 7,
    border: "none", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  contentArea: {
    flex: 1, padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: 4,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: 600, color: "#444",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
  },
  input: {
    width: "100%", padding: "10px 12px",
    backgroundColor: "#161616", border: "1px solid #222",
    borderRadius: 8, color: "#e0e0e0", fontSize: 13,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    outline: "none",
  },
  select: {
    width: "100%", padding: "10px 12px",
    backgroundColor: "#161616", border: "1px solid #222",
    borderRadius: 8, color: "#e0e0e0", fontSize: 13,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    outline: "none", cursor: "pointer",
  },
  textarea: {
    width: "100%", padding: "10px 12px",
    backgroundColor: "#161616", border: "1px solid #222",
    borderRadius: 8, color: "#e0e0e0", fontSize: 13,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    outline: "none", resize: "vertical", lineHeight: 1.6,
  },
  pillRow: { display: "flex", gap: 8 },
  pill: {
    padding: "6px 16px", borderRadius: 20,
    border: "1px solid #2a2a2a", fontSize: 12,
    fontWeight: 500, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  fileRow: { display: "flex", gap: 8 },
  fileBtn: {
    flex: 1, padding: "12px 8px",
    backgroundColor: "#161616", border: "1px dashed #2a2a2a",
    borderRadius: 10, color: "#aaa", fontSize: 12,
    fontWeight: 500, cursor: "pointer", textAlign: "center",
  },
  csvLoaded: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", backgroundColor: "#161616",
    border: "1px solid #222", borderRadius: 8,
  },
  csvCheck: { fontSize: 14, color: "#2272c3" },
  csvInfo: { fontSize: 12, color: "#aaa", flex: 1 },
  csvReload: {
    fontSize: 11, color: "#555", cursor: "pointer",
    background: "none", border: "none",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  errorText: { marginTop: 8, fontSize: 12, color: "#e05a5a" },
  emptyText: { fontSize: 13, color: "#444", marginBottom: 12 },
  graphCard: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px", marginBottom: 8,
    backgroundColor: "#161616", border: "1px solid #222", borderRadius: 10,
  },
  graphCardLeft: { display: "flex", alignItems: "center", gap: 12 },
  graphCardNum: {
    width: 24, height: 24, borderRadius: "50%",
    backgroundColor: "#2272c3", color: "#fff",
    fontSize: 11, fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  graphCardTitle: { fontSize: 13, fontWeight: 500, color: "#e0e0e0" },
  graphCardMeta: { fontSize: 11, color: "#444", marginTop: 2 },
  editBtn: {
    fontSize: 12, color: "#2272c3", cursor: "pointer",
    background: "none", border: "1px solid #2272c3",
    borderRadius: 6, padding: "4px 10px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  addBtn: {
    width: "100%", padding: "10px",
    backgroundColor: "transparent", border: "1px dashed #2a2a2a",
    borderRadius: 10, color: "#555", fontSize: 13, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  statRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px", marginBottom: 6,
    backgroundColor: "#161616", border: "1px solid #222", borderRadius: 8,
  },
  statRowText: { display: "flex", gap: 12 },
  statRowLabel: { fontSize: 12, color: "#888" },
  statRowValue: { fontSize: 12, color: "#e0e0e0", fontWeight: 500 },
  removeBtn: { fontSize: 11, color: "#555", cursor: "pointer", background: "none", border: "none" },
  statInputRow: { display: "flex", gap: 8, marginTop: 8 },
  addStatBtn: {
    padding: "10px 16px", backgroundColor: "#2272c3",
    border: "none", borderRadius: 8, color: "#fff",
    fontSize: 16, cursor: "pointer",
  },
  previewBtn: {
    margin: "8px 20px", padding: 14, borderRadius: 12,
    border: "1px solid #222", backgroundColor: "#161616",
    color: "#e0e0e0", fontSize: 13, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  exportBtn: {
    margin: "0 20px 8px", padding: 14, borderRadius: 12,
    border: "none", backgroundColor: "#2272c3", color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  btnDot: { width: 7, height: 7, borderRadius: "50%", backgroundColor: "#2272c3", flexShrink: 0 },
  exitBtn: {
    margin: "0 20px 24px", padding: 10, borderRadius: 12,
    border: "none", backgroundColor: "transparent",
    color: "#444", fontSize: 12, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
};

const previewStyles = {
  wrap: { flex: 1, display: "flex", flexDirection: "column" },
  empty: {
    flex: 1, display: "flex",
    alignItems: "center", justifyContent: "center", padding: 40,
  },
  emptyText: { fontSize: 13, color: "#444", textAlign: "center", lineHeight: 1.6 },
  counterRow: {
    display: "flex", gap: 6,
    justifyContent: "center", padding: "12px 20px 0",
  },
  counterDot: { width: 6, height: 6, borderRadius: "50%", transition: "background-color 0.2s" },
  contentArea: { padding: "16px 20px", flex: 1 },
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
    justifyContent: "space-between", padding: "0 20px", marginBottom: 4,
  },
  navBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #222",
    backgroundColor: "transparent", color: "#e0e0e0", fontSize: 12,
    fontWeight: 500, cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },
  navCount: { fontSize: 11, color: "#444" },
};