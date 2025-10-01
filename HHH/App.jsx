import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

function App() {
  const [compounds, setCompounds] = useState([
    { name: "Limiting Reactant", weight: "", unit: "mg", mw: "", moles: "", eq: "1.0", density: "" },
  ]);

  const [showTable, setShowTable] = useState(false);

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const limitingMoles = useMemo(() => {
    if (!compounds[0]) return 0;
    const w = num(compounds[0].weight);
    const mw = num(compounds[0].mw);
    const grams = compounds[0].unit === "mg" ? w / 1000 : w;
    if (mw <= 0) return 0;
    return grams / mw;
  }, [compounds]);

  useEffect(() => {
    const updated = [...compounds];
    if (updated[0]) {
      updated[0].moles = limitingMoles > 0 ? limitingMoles.toFixed(4) : "";
      updated[0].eq = "1.00";
    }
    setCompounds(updated);
  }, [limitingMoles]);

  const addCompound = () => {
    const lim = compounds[0];
    if (!lim || !lim.weight || !lim.mw) {
      alert("Please complete the Limiting Reactant (weight and molecular weight) first.");
      return;
    }
    setCompounds([...compounds, { name: "", mw: "", eq: "", density: "", weight: "", moles: "" }]);
  };

  const resetAll = () => {
    setCompounds([
      { name: "Limiting Reactant", weight: "", unit: "mg", mw: "", moles: "", eq: "1.0", density: "" },
    ]);
    setShowTable(false);
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...compounds];
    updated[index][field] = value;
    setCompounds(updated);
  };

  const buildResults = () => {
    if (compounds.length === 0) return [];

    const unit = compounds[0].unit || "mg";
    const lm = limitingMoles;

    return compounds.map((c, i) => {
      if (i === 0) {
        const moles = lm > 0 ? lm.toFixed(3) : "";
        return {
          name: c.name || "Limiting Reactant",
          weight: c.weight ? `${c.weight} ${unit}` : "",
          mw: c.mw || "",
          moles,
          eq: "1.00",
          density: c.density || "",
        };
      } else {
        const eq = num(c.eq);
        const mw = num(c.mw);
        const moles = lm > 0 && eq > 0 ? lm * eq : 0;
        const gramsNeeded = moles > 0 && mw > 0 ? moles * mw : 0;
        const weightDisplay = unit === "mg" ? gramsNeeded * 1000 : gramsNeeded;

        return {
          name: c.name || "",
          weight: gramsNeeded > 0 ? `${weightDisplay.toFixed(2)} ${unit}` : "",
          mw: c.mw || "",
          moles: moles > 0 ? moles.toFixed(3) : "",
          eq: c.eq || "",
          density: c.density || "",
        };
      }
    });
  };

  const results = useMemo(buildResults, [compounds, limitingMoles]);

  const previewTable = () => setShowTable(true);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      results.map((r, i) => ({
        "Sr. No.": i + 1,
        Name: r.name,
        "Weight (mg or g)": r.weight,
        "Molecular Weight": r.mw,
        Moles: r.moles,
        Equivalent: r.eq,
        Density: r.density,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MolCal");
    XLSX.writeFile(wb, "MolCal.xlsx");
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addCompound();
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        previewTable();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [compounds]);

  return (
    <div className="App">
      <h1 className="title">MolCal</h1>

      {compounds.map((c, i) => (
        <div key={i} className="compound-row">
          <h3>{i === 0 ? "Limiting Reactant" : `Reactant ${i}`}</h3>
          <input
            type="text"
            placeholder="Name"
            value={c.name}
            onChange={(e) => handleInputChange(i, "name", e.target.value)}
          />
          {i === 0 && (
            <>
              <input
                type="number"
                placeholder="Weight"
                value={c.weight}
                onChange={(e) => handleInputChange(i, "weight", e.target.value)}
              />
              <select
                value={c.unit}
                onChange={(e) => handleInputChange(i, "unit", e.target.value)}
              >
                <option value="mg">mg</option>
                <option value="g">g</option>
              </select>
            </>
          )}
          <input
            type="number"
            placeholder="Molecular Weight"
            value={c.mw}
            onChange={(e) => handleInputChange(i, "mw", e.target.value)}
          />
          {i > 0 && (
            <input
              type="number"
              placeholder="Eq"
              value={c.eq}
              onChange={(e) => handleInputChange(i, "eq", e.target.value)}
            />
          )}
          <input
            type="number"
            placeholder="Density (optional)"
            value={c.density}
            onChange={(e) => handleInputChange(i, "density", e.target.value)}
          />
          <span className="calc-hint">
            {i === 0
              ? c.moles
                ? `${c.moles} mol (1.00 eq)`
                : ""
              : results[i]?.weight
              ? `${results[i].weight}, ${results[i].moles} mol`
              : ""}
          </span>
        </div>
      ))}

      <div className="buttons">
        <button className="green" onClick={addCompound}>+ Add Reactant (Enter)</button>
        <button className="blue" onClick={previewTable}>Preview Table (Shift+Enter)</button>
        <button className="orange" onClick={exportToExcel}>Export to Excel</button>
        <button className="red" onClick={resetAll}>Reset</button>
      </div>

      {showTable && results.length > 0 && (
        <div className="results">
          <h2>Calculation Table</h2>
          <table className="preview-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Name</th>
                <th>Weight (mg or g)</th>
                <th>Molecular Weight</th>
                <th>Moles</th>
                <th>Equivalent</th>
                <th>Density</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.weight}</td>
                  <td>{r.mw}</td>
                  <td>{r.moles}</td>
                  <td>{r.eq}</td>
                  <td>{r.density}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
