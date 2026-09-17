import { newVariable } from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function VariablesPage({ variables, setVariables }) {
  const addVariable = () => setVariables([...variables, newVariable(`Variable ${variables.length + 1}`, 0)]);
  const updateVariable = (id, patch) => setVariables(variables.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeVariable = (id) => setVariables(variables.filter((v) => v.id !== id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Variables</h1>
      </div>

      <Section title="Variables">
        {variables.length === 0 && <div className="empty-hint">No variables yet — used in Phase conditions and transitions.</div>}
        <div className="resource-list">
          {variables.map((v) => (
            <div className="resource-row" key={v.id}>
              <input className="resource-name" value={v.name} onChange={(e) => updateVariable(v.id, { name: e.target.value })} />
              <input
                className="resource-value"
                type="number"
                value={v.value}
                onChange={(e) => updateVariable(v.id, { value: Number(e.target.value) })}
              />
              <button className="icon-btn danger" title="Remove variable" onClick={() => removeVariable(v.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addVariable}>
          + Variable
        </button>
      </Section>
    </div>
  );
}
