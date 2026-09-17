import { newResource } from './store';

export default function ResourcesPage({ resources, setResources }) {
  const addResource = () => setResources([...resources, newResource(`Resource ${resources.length + 1}`, 0)]);
  const updateResource = (id, patch) => setResources(resources.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeResource = (id) => setResources(resources.filter((r) => r.id !== id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Resources</h1>
        <button className="btn btn-primary" onClick={addResource}>
          + Add Resource
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="empty-hint">No resources yet. Add one, or add one directly from a phase step.</div>
      ) : (
        <div className="resource-list">
          {resources.map((r) => (
            <div className="resource-row" key={r.id}>
              <input className="resource-name" value={r.name} onChange={(e) => updateResource(r.id, { name: e.target.value })} />
              <input
                className="resource-value"
                type="number"
                value={r.value}
                onChange={(e) => updateResource(r.id, { value: Number(e.target.value) })}
              />
              <button className="icon-btn danger" title="Remove resource" onClick={() => removeResource(r.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
