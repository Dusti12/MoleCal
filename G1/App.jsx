import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const [compounds, setCompounds] = useState([
    { name: 'Limiting Reactant', mw: '', weight: '', unit: 'mg', eq: '1.0', density: '' },
  ]);
  const [showTable, setShowTable] = useState(false);

  const parseNumber = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  const results = useMemo(() => {
    if (!compounds[0] || !compounds[0].mw || !compounds[0].weight) {
      return compounds.map(c => ({ ...c, moles: '', calculatedWeight: '', calculatedVolume: '' }));
    }

    const limitingReactant = compounds[0];
    const limitingMw = parseNumber(limitingReactant.mw);
    const limitingWeight = parseNumber(limitingReactant.weight);
    const limitingWeightInGrams = limitingReactant.unit === 'mg' ? limitingWeight / 1000 : limitingWeight;
    const limitingMoles = limitingMw > 0 ? limitingWeightInGrams / limitingMw : 0;

    return compounds.map((c, index) => {
      const eq = parseNumber(c.eq);
      const mw = parseNumber(c.mw);
      const density = parseNumber(c.density);
      
      const moles = limitingMoles > 0 && eq > 0 ? limitingMoles * eq : 0;
      const calculatedWeightInGrams = moles * mw;
      const calculatedWeight = c.unit === 'mg' ? calculatedWeightInGrams * 1000 : calculatedWeightInGrams;
      
      let calculatedVolume = '';
      if (density > 0) {
        calculatedVolume = calculatedWeightInGrams / density;
      }

      return {
        ...c,
        moles: moles > 0 ? moles.toFixed(6) : '',
        calculatedWeight: calculatedWeight > 0 ? calculatedWeight.toFixed(2) : '',
        calculatedVolume: calculatedVolume > 0 ? calculatedVolume.toFixed(2) : '',
      };
    });
  }, [compounds]);

  const handleInputChange = (index, field, value) => {
    const updatedCompounds = [...compounds];
    updatedCompounds[index][field] = value;
    setCompounds(updatedCompounds);
  };

  const addCompound = () => {
    if (!compounds[0].mw || !compounds[0].weight) {
      alert("Please enter the weight and molecular weight for the Limiting Reactant first.");
      return;
    }
    setCompounds([...compounds, { name: '', mw: '', eq: '', density: '', weight: '', moles: '' }]);
    setShowTable(false);
  };

  const resetAll = () => {
    setCompounds([{ name: 'Limiting Reactant', mw: '', weight: '', unit: 'mg', eq: '1.0', density: '' }]);
    setShowTable(false);
  };

  const exportToExcel = () => {
    const dataToExport = results.map((r, i) => ({
      'Sr. No.': i + 1,
      'Name': r.name,
      'Weight': r.calculatedWeight ? `${r.calculatedWeight} ${r.unit}` : r.weight ? `${r.weight} ${r.unit}` : '',
      ...(r.calculatedVolume && { 'Volume (mL)': r.calculatedVolume }),
      'Molecular Weight (g/mol)': r.mw,
      'Moles (mol)': r.moles,
      'Equivalent': r.eq,
      ...(r.density && { 'Density (g/mL)': r.density }),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MolCal');
    XLSX.writeFile(wb, 'MolCal.xlsx');
  };
  
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        setShowTable(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        addCompound();
      } else if (e.key === "Escape") {
        e.preventDefault();
        resetAll();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [compounds]);

  return (
    <div className="container">
      <h1 className="title">MolCal</h1>
      
      <div className="input-form">
        {compounds.map((c, i) => (
          <div key={i} className="compound-row">
            <h3 className="compound-title">{i === 0 ? "Limiting Reactant" : `Compound ${i + 1}`}</h3>
            
            <input
              type="text"
              placeholder="Name"
              value={c.name}
              onChange={(e) => handleInputChange(i, 'name', e.target.value)}
            />
            
            <input
              type="number"
              placeholder="MW (g/mol)"
              value={c.mw}
              onChange={(e) => handleInputChange(i, 'mw', e.target.value)}
            />

            <input
              type="number"
              placeholder="Density (g/mL)"
              value={c.density}
              onChange={(e) => handleInputChange(i, 'density', e.target.value)}
            />
            
            {i === 0 ? (
              <>
                <input
                  type="number"
                  placeholder="Weight"
                  value={c.weight}
                  onChange={(e) => handleInputChange(i, 'weight', e.target.value)}
                />
                <select value={c.unit} onChange={(e) => handleInputChange(i, 'unit', e.target.value)}>
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                </select>
              </>
            ) : (
              <input
                type="number"
                placeholder="Molar Equivalent"
                value={c.eq}
                onChange={(e) => handleInputChange(i, 'eq', e.target.value)}
              />
            )}
            
            <span className="calculation-result">
              {results[i]?.calculatedWeight && (
                <>
                  <span className="weight-display">
                    {results[i].calculatedWeight} {c.unit}
                  </span>
                  {results[i].calculatedVolume && (
                    <span className="volume-display">
                      , {results[i].calculatedVolume} mL
                    </span>
                  )}
                  , <span className="moles-display">{results[i].moles} mol</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      
      <div className="buttons">
        <button onClick={addCompound}>+ Add Compound (Enter)</button>
        <button onClick={() => setShowTable(true)}>Preview Table (Shift+Enter)</button>
        <button onClick={exportToExcel}>Export to Excel</button>
        <button onClick={resetAll} className="reset-button">Reset (Esc)</button>
      </div>

      {showTable && (
        <div className="results-table-container">
          <h2>Calculation Summary</h2>
          <table className="calculation-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Name</th>
                <th>Weight ({results[0]?.unit})</th>
                <th>Volume (mL)</th>
                <th>Molecular Weight (g/mol)</th>
                <th>Moles (mol)</th>
                <th>Equivalent (w.r.t LR)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{i === 0 ? r.weight : r.calculatedWeight}</td>
                  <td>{r.calculatedVolume}</td>
                  <td>{r.mw}</td>
                  <td>{r.moles}</td>
                  <td>{r.eq}</td>
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