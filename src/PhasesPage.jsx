import { newPhase } from './store';

// Phases are just a labeled sequence now — a description of turn order to
// write code against (e.g. checking which phase is active), not a
// container for logic. All behavior lives in the Code tab.
export default function PhasesPage({ phases, setPhases }) {
  const addPhase = () => setPhases([...phases, newPhase(`Phase ${phases.length + 1}`)]);
  const renamePhase = (id, name) => setPhases(phases.map((p) => (p.id === id ? { ...p, name } : p)));
  const removePhase = (id) => setPhases(phases.filter((p) => p.id !== id));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= phases.length) return;
    const next = phases.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setPhases(next);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Phases</h1>
      </div>
      <div className="editor-section">
        <div className="editor-section-title">Turn Sequence</div>
        {phases.length === 0 && <div className="empty-hint">No phases yet.</div>}
        <div className="resource-list">
          {phases.map((p, i) => (
            <div className="connect-row" key={p.id}>
              <span className="phase-order">{i + 1}</span>
              <input className="resource-name" value={p.name} onChange={(e) => renamePhase(p.id, e.target.value)} />
              <button className="icon-btn" title="Move up" onClick={() => move(i, -1)}>
                ↑
              </button>
              <button className="icon-btn" title="Move down" onClick={() => move(i, 1)}>
                ↓
              </button>
              <button className="icon-btn danger" title="Remove phase" onClick={() => removePhase(p.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addPhase}>
          + Phase
        </button>
      </div>
    </div>
  );
}
