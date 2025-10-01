import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

// Component for the saved compounds database
const CompoundDatabase = ({ onSelect }) => {
  const [dbCompounds, setDbCompounds] = useState(() => {
    try {
      const saved = localStorage.getItem('compoundDatabase');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Could not load from localStorage", e);
      return [];
    }
  });
  const [newCompound, setNewCompound] = useState({ name: '', mw: '', density: '' });

  useEffect(() => {
    try {
      localStorage.setItem('compoundDatabase', JSON.stringify(dbCompounds));
    } catch (e) {
      console.error("Could not save to localStorage", e);
    }
  }, [dbCompounds]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newCompound.name && (newCompound.mw || newCompound.density)) {
      setDbCompounds([...dbCompounds, newCompound]);
      setNewCompound({ name: '', mw: '', density: '' });
    }
  };

  return (
    <div className="compound-database">
      <h3>Saved Compounds</h3>
      <form onSubmit={handleAdd} className="db-form">
        <input 
          type="text" 
          placeholder="Name" 
          value={newCompound.name} 
          onChange={(e) => setNewCompound({ ...newCompound, name: e.target.value })} 
        />
        <input 
          type="number" 
          placeholder="MW (g/mol)" 
          value={newCompound.mw} 
          onChange={(e) => setNewCompound({ ...newCompound, mw: e.target.value })} 
        />
        <input 
          type="number" 
          placeholder="Density (g/mL)" 
          value={newCompound.density} 
          onChange={(e) => setNewCompound({ ...newCompound, density: e.target.value })} 
        />
        <button type="submit" className="add-to-db">Save</button>
      </form>
      <ul className="db-list">
        {dbCompounds.map((c, i) => (
          <li key={i}>
            <span>{c.name}</span>
            <button className="use-btn" onClick={() => onSelect(c)}>Use</button>
            <button className="remove-btn" onClick={() => setDbCompounds(dbCompounds.filter((_, idx) => idx !== i))}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

function App() {
  const [compounds, setCompounds] = useState([
    { name: 'Limiting Reactant', mw: '', weight: '', unit: 'mg', eq: '1.0', density: '' },
  ]);
  const [showTable, setShowTable] = useState(false);
  const [editingIndex, setEditingIndex] = useState(0);

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
    const limitingEq = parseNumber(limitingReactant.eq);
    const limitingWeight = parseNumber(limitingReactant.weight);
    
    // Convert LR weight to grams for the core calculation
    const limitingWeightInGrams = limitingReactant.unit === 'mg' ? limitingWeight / 1000 : limitingWeight;
    const limitingMoles = limitingMw > 0 ? limitingWeightInGrams / limitingMw : 0;

    return compounds.map((c, index) => {
      const eq = parseNumber(c.eq);
      const mw = parseNumber(c.mw);
      const density = parseNumber(c.density);
      
      const moles = limitingMoles > 0 && eq > 0 && limitingEq > 0 ? (limitingMoles * eq) / limitingEq : 0;
      
      const calculatedWeightInGrams = moles * mw;
      
      // Convert calculated weight back to the user's chosen unit
      const calculatedWeight = limitingReactant.unit === 'mg' ? calculatedWeightInGrams * 1000 : calculatedWeightInGrams;
      
      let calculatedVolume = '';
      if (density > 0) {
        calculatedVolume = calculatedWeightInGrams / density;
      }

      const displayCalculatedWeight = calculatedWeight > 0 ? calculatedWeight.toFixed(4) : '';
      const displayCalculatedVolume = calculatedVolume > 0 ? calculatedVolume.toFixed(4) : '';
      const displayMoles = moles > 0 ? moles.toFixed(6) : '';

      return {
        ...c,
        moles: displayMoles,
        calculatedWeight: displayCalculatedWeight,
        calculatedVolume: displayCalculatedVolume,
      };
    });
  }, [compounds]);

  const handleInputChange = (index, field, value) => {
    const updatedCompounds = [...compounds];
    updatedCompounds[index][field] = value;
    setCompounds(updatedCompounds);
  };

  const handleSelectFromDb = (compoundData) => {
    const updated = [...compounds];
    updated[editingIndex].name = compoundData.name;
    updated[editingIndex].mw = compoundData.mw;
    updated[editingIndex].density = compoundData.density;
    setCompounds(updated);
  };

  const addCompound = () => {
    if (!compounds[0].mw || !compounds[0].weight) {
      alert("Please enter the weight and molecular weight for the Limiting Reactant first.");
      return;
    }
    const newIndex = compounds.length;
    setCompounds([...compounds, { name: '', mw: '', eq: '', density: '', weight: '', moles: '' }]);
    setEditingIndex(newIndex);
    setShowTable(false);
  };

  const resetAll = () => {
    setCompounds([{ name: 'Limiting Reactant', mw: '', weight: '', unit: 'mg', eq: '1.0', density: '' }]);
    setEditingIndex(0);
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
      
      <div className="main-content">
        <div className="input-form">
          {compounds.map((c, i) => (
            <div 
              key={i} 
              className={`compound-row ${i === editingIndex ? 'active' : ''}`}
              onClick={() => setEditingIndex(i)}
            >
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
          <div className="buttons">
            <button onClick={addCompound}>+ Add Compound (Enter)</button>
            <button onClick={() => setShowTable(true)}>Preview Table (Shift+Enter)</button>
            <button onClick={exportToExcel}>Export to Excel</button>
            <button onClick={resetAll} className="reset-button">Reset (Esc)</button>
          </div>
        </div>
        <CompoundDatabase onSelect={handleSelectFromDb} />
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