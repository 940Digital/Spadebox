import { useEffect, useState } from 'react';
import { loadInitialState, saveState } from './store';
import PhasesPage from './PhasesPage';
import ResourcesPage from './ResourcesPage';
import CardsPage from './CardsPage';
import TablePage from './TablePage';
import VariablesPage from './VariablesPage';
import CodePage from './CodePage';

const NAV_ITEMS = [
  { id: 'phases', label: 'Phases' },
  { id: 'resources', label: 'Resources' },
  { id: 'cards', label: 'Cards' },
  { id: 'variables', label: 'Variables' },
  { id: 'table', label: 'Table' },
  { id: 'code', label: 'Code' },
];

export default function App() {
  const [active, setActive] = useState(NAV_ITEMS[0].id);
  const [initial] = useState(loadInitialState);
  const [resources, setResources] = useState(initial.resources);
  const [variables, setVariables] = useState(initial.variables);
  const [phases, setPhases] = useState(initial.phases);
  const [players, setPlayers] = useState(initial.players);
  const [decks, setDecks] = useState(initial.decks);
  const [discards, setDiscards] = useState(initial.discards);
  const [hands, setHands] = useState(initial.hands);
  const [cardAttributes, setCardAttributes] = useState(initial.cardAttributes);
  const [cards, setCards] = useState(initial.cards);
  const [layout, setLayout] = useState(initial.layout);
  const [code, setCode] = useState(initial.code);

  useEffect(() => {
    saveState({ resources, variables, phases, players, decks, discards, hands, cardAttributes, cards, layout, code });
  }, [resources, variables, phases, players, decks, discards, hands, cardAttributes, cards, layout, code]);

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
        {active === 'phases' && <PhasesPage phases={phases} setPhases={setPhases} />}
        {active === 'resources' && (
          <ResourcesPage
            resources={resources}
            setResources={setResources}
            players={players}
            setPlayers={setPlayers}
            decks={decks}
            setDecks={setDecks}
            discards={discards}
            setDiscards={setDiscards}
            hands={hands}
            setHands={setHands}
            cards={cards}
          />
        )}
        {active === 'cards' && (
          <CardsPage cardAttributes={cardAttributes} setCardAttributes={setCardAttributes} cards={cards} setCards={setCards} />
        )}
        {active === 'variables' && <VariablesPage variables={variables} setVariables={setVariables} />}
        {active === 'table' && (
          <TablePage resources={resources} decks={decks} discards={discards} hands={hands} layout={layout} setLayout={setLayout} />
        )}
        {active === 'code' && (
          <CodePage
            code={code}
            setCode={setCode}
            players={players}
            decks={decks}
            discards={discards}
            hands={hands}
            cards={cards}
            cardAttributes={cardAttributes}
            variables={variables}
          />
        )}
      </main>
    </div>
  );
}
