import { useState } from "react";

export default function useInsightly() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  function loadFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Basic validation
        if (!parsed.graphs || !parsed.data) {
          setError("Invalid .insightly file. Missing graphs or data.");
          return;
        }

        // Process each graph's data from the raw rows
        const processedGraphs = parsed.graphs.map((graph) => {
          const rows = parsed.data;

          // Group rows by the graph's dimension column
          const grouped = {};
          rows.forEach((row) => {
            const key = row[graph.dimension];
            if (!key) return;
            const value = parseFloat(row.money) || 0;
            grouped[key] = (grouped[key] || 0) + value;
          });

          // Apply measure — sum is already done above, avg divides by count
          let chartData;
          if (graph.measure === "avg") {
            const counts = {};
            rows.forEach((row) => {
              const key = row[graph.dimension];
              if (!key) return;
              counts[key] = (counts[key] || 0) + 1;
            });
            chartData = Object.entries(grouped).map(([name, total]) => ({
              name,
              value: Math.round((total / counts[name]) * 100) / 100,
            }));
          } else {
            // default: sum
            chartData = Object.entries(grouped).map(([name, value]) => ({
              name,
              value: Math.round(value * 100) / 100,
            }));
          }

          // Sort by month order if dimension is month
          if (graph.dimension === "month_name") {
            const MONTHS = ["Jan","Feb","Mar","Apr","May",
                            "Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            chartData.sort((a, b) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name));
          } else {
            chartData.sort((a, b) => b.value - a.value);
          }

          return { ...graph, chartData };
        });

        setReport({ ...parsed, graphs: processedGraphs });
        setError(null);
      } catch (err) {
        setError("Could not read this file. Make sure it is a valid .insightly file.");
      }
    };

    reader.readAsText(file);
  }

  return { report, error, loadFile };
}
