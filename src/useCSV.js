// useCSV.js
import { useState } from "react";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export default function useCSV() {
  const [dimensionData, setDimensionData] = useState(null); // all three views
  const [error, setError] = useState(null);

  function loadFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

        const nameIndex = headers.indexOf("coffee_name");
        const moneyIndex = headers.indexOf("money");
        const dateIndex = headers.indexOf("date"); // new required column

        if (nameIndex === -1 || moneyIndex === -1 || dateIndex === -1) {
          setError("CSV must have 'coffee_name', 'money', and 'date' columns.");
          return;
        }

        const rows = lines.slice(1).map(line => {
          const cols = line.split(",");
          const name = cols[nameIndex]?.trim();
          const money = parseFloat(cols[moneyIndex]) || 0;
          const dateStr = cols[dateIndex]?.trim();
          return { name, money, dateStr };
        });

        // Helper: group by a key function
        const groupBy = (keyFn) => {
          const grouped = {};
          rows.forEach(row => {
            const key = keyFn(row);
            if (!key) return;
            grouped[key] = (grouped[key] || 0) + row.money;
          });
          return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
            .sort((a, b) => b.value - a.value);
        };

        // -- Groupings --
        const product = groupBy(row => row.name);

        const month = groupBy(row => {
          if (!row.dateStr) return null;
          const d = new Date(row.dateStr);
          if (isNaN(d.getTime())) return null;
          const monthName = MONTHS[d.getMonth()];
          return `${monthName} ${d.getFullYear()}`; // "Mar 2025"
        });

        const dayType = groupBy(row => {
          if (!row.dateStr) return null;
          const d = new Date(row.dateStr);
          if (isNaN(d.getTime())) return null;
          const day = d.getDay(); // 0=Sun ... 6=Sat
          return (day === 0 || day === 6) ? "Weekend" : "Weekday";
        });

        setDimensionData({ product, month, dayType });
        setError(null);
      } catch (err) {
        setError("Could not read this file. Check the format.");
      }
    };

    reader.readAsText(file);
  }

  return { dimensionData, error, loadFile };
}