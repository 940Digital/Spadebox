import { newDeck, newDiscard, newHand, newPlayer, newResource } from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

function ConnectSelect({ value, onChange, options, none = 'none' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{none}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

export default function ResourcesPage({
  resources,
  setResources,
  players,
  setPlayers,
  decks,
  setDecks,
  discards,
  setDiscards,
  hands,
  setHands,
}) {
  const addResource = () => setResources([...resources, newResource(`Resource ${resources.length + 1}`, 0)]);
  const updateResource = (id, patch) => setResources(resources.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeResource = (id) => setResources(resources.filter((r) => r.id !== id));

  const setPlayerCount = (count) => {
    const n = Math.max(0, Number(count) || 0);
    if (n === players.length) return;
    if (n < players.length) {
      setPlayers(players.slice(0, n));
    } else {
      const added = Array.from({ length: n - players.length }, (_, i) => newPlayer(`Player ${players.length + i + 1}`));
      setPlayers([...players, ...added]);
    }
  };
  const renamePlayer = (id, name) => setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));

  const addDeck = () => setDecks([...decks, newDeck(`Deck ${decks.length + 1}`)]);
  const updateDeck = (id, patch) => setDecks(decks.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDeck = (id) => {
    setDecks(decks.filter((d) => d.id !== id));
    setDiscards(discards.map((d) => (d.connectsToDeckId === id ? { ...d, connectsToDeckId: '' } : d)));
  };

  const addDiscard = () => setDiscards([...discards, newDiscard(`Discard ${discards.length + 1}`)]);
  const updateDiscard = (id, patch) => setDiscards(discards.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDiscard = (id) => {
    setDiscards(discards.filter((d) => d.id !== id));
    setDecks(decks.map((d) => (d.reshuffleFromDiscardId === id ? { ...d, reshuffleFromDiscardId: '' } : d)));
    setHands(hands.map((h) => (h.discardId === id ? { ...h, discardId: '' } : h)));
  };

  const addHand = () => setHands([...hands, newHand(`Hand ${hands.length + 1}`)]);
  const updateHand = (id, patch) => setHands(hands.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const removeHand = (id) => setHands(hands.filter((h) => h.id !== id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Resources</h1>
      </div>

      <Section title="Resources">
        {resources.length === 0 && <div className="empty-hint">No resources yet.</div>}
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
        <button className="add-pill" onClick={addResource}>
          + Resource
        </button>
      </Section>

      <Section title="Players">
        <div className="player-count-row">
          <span className="step-word">Number of players:</span>
          <input
            type="number"
            className="step-number"
            min="0"
            value={players.length}
            onChange={(e) => setPlayerCount(e.target.value)}
          />
        </div>
        {players.length > 0 && (
          <div className="resource-list">
            {players.map((p) => (
              <div className="resource-row" key={p.id}>
                <input className="resource-name" value={p.name} onChange={(e) => renamePlayer(p.id, e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Decks">
        {decks.length === 0 && <div className="empty-hint">No decks yet.</div>}
        <div className="resource-list">
          {decks.map((d) => (
            <div className="connect-row" key={d.id}>
              <input className="resource-name" value={d.name} onChange={(e) => updateDeck(d.id, { name: e.target.value })} />
              <span className="step-word">reshuffles from</span>
              <ConnectSelect
                value={d.reshuffleFromDiscardId}
                onChange={(v) => updateDeck(d.id, { reshuffleFromDiscardId: v })}
                options={discards}
                none="no discard"
              />
              <button className="icon-btn danger" title="Remove deck" onClick={() => removeDeck(d.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addDeck}>
          + Deck
        </button>
      </Section>

      <Section title="Discard Piles">
        {discards.length === 0 && <div className="empty-hint">No discard piles yet.</div>}
        <div className="resource-list">
          {discards.map((d) => (
            <div className="connect-row" key={d.id}>
              <input className="resource-name" value={d.name} onChange={(e) => updateDiscard(d.id, { name: e.target.value })} />
              <span className="step-word">connects to</span>
              <ConnectSelect
                value={d.connectsToDeckId}
                onChange={(v) => updateDiscard(d.id, { connectsToDeckId: v })}
                options={decks}
                none="no deck"
              />
              <button className="icon-btn danger" title="Remove discard pile" onClick={() => removeDiscard(d.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addDiscard}>
          + Discard Pile
        </button>
      </Section>

      <Section title="Hands">
        {hands.length === 0 && <div className="empty-hint">No hands yet.</div>}
        <div className="resource-list">
          {hands.map((h) => (
            <div className="connect-row" key={h.id}>
              <input className="resource-name" value={h.name} onChange={(e) => updateHand(h.id, { name: e.target.value })} />
              <span className="step-word">belongs to</span>
              <ConnectSelect value={h.playerId} onChange={(v) => updateHand(h.id, { playerId: v })} options={players} none="no player" />
              <span className="step-word">discards to</span>
              <ConnectSelect value={h.discardId} onChange={(v) => updateHand(h.id, { discardId: v })} options={discards} none="no discard" />
              <button className="icon-btn danger" title="Remove hand" onClick={() => removeHand(h.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addHand}>
          + Hand
        </button>
      </Section>
    </div>
  );
}
