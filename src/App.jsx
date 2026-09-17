import { useEffect, useState } from 'react';
import { loadInitialState, saveState } from './store';
import PhasesPage from './PhasesPage';
import ResourcesPage from './ResourcesPage';

const NAV_ITEMS = [
  { id: 'phases', label: 'Phases' },
  { id: 'resources', label: 'Resources' },
];

export default function App() {
  const [active, setActive] = useState(NAV_ITEMS[0].id);
  const [initial] = useState(loadInitialState);
  const [resources, setResources] = useState(initial.resources);
  const [variables, setVariables] = useState(initial.variables);
  const [phases, setPhases] = useState(initial.phases);

  useEffect(() => {
    saveState({ resources, variables, phases });
  }, [resources, variables, phases]);

  return (
    <div className="sheet">
      <nav className="sidebar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item${active === item.id ? ' active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="sheet-content">
        {active === 'phases' && (
          <PhasesPage
            phases={phases}
            setPhases={setPhases}
            resources={resources}
            setResources={setResources}
            variables={variables}
            setVariables={setVariables}
          />
        )}
        {active === 'resources' && <ResourcesPage resources={resources} setResources={setResources} />}
      </main>
    </div>
  );
}
