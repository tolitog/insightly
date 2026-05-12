import { useState } from "react";
import Viewer from "./Viewer";
import Builder from "./Builder";

export default function App() {
  const [role, setRole] = useState(null); // null | "client" | "analyst"

  if (role === "client") return <Viewer onExit={() => setRole(null)} />;
  if (role === "analyst") return <Builder onExit={() => setRole(null)} />;

  return (
    <div style={styles.app}>
      <div style={styles.top}>
        <div style={styles.dot} />
        <h1 style={styles.title}>Insightly</h1>
        <p style={styles.subtitle}>Mobile analytics, simplified</p>
      </div>

      <div style={styles.cards}>
        <button style={styles.card} onClick={() => setRole("client")}>
          <div style={styles.cardIcon}>📊</div>
          <div style={styles.cardTitle}>I'm a Client</div>
          <div style={styles.cardDesc}>
            View a report shared with you
          </div>
        </button>

        <button style={styles.card} onClick={() => setRole("analyst")}>
          <div style={styles.cardIcon}>✏️</div>
          <div style={styles.cardTitle}>I'm an Analyst</div>
          <div style={styles.cardDesc}>
            Build and preview a report
          </div>
        </button>
      </div>

      <p style={styles.footer}>Pick your role to get started</p>
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
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    padding: "40px 24px",
    gap: 48,
  },
  top: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#2272c3",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#f0f0f0",
    letterSpacing: "-0.03em",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    margin: 0,
  },
  cards: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    backgroundColor: "#161616",
    border: "1px solid #222",
    borderRadius: 16,
    padding: "20px 20px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    transition: "border-color 0.2s",
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#f0f0f0",
    letterSpacing: "-0.01em",
  },
  cardDesc: {
    fontSize: 12,
    color: "#555",
    lineHeight: 1.5,
  },
  footer: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
};
